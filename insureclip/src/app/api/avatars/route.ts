import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import { createAvatar, createVoiceClone, uploadVideoForAvatar } from '@/lib/heygen/client'
import type { Database } from '@/lib/supabase/database.types'

const AVATAR_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  team: 10,
}

export async function GET(_request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: avatars } = await supabase
    .from('avatars')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ avatars: avatars || [] })
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user profile to check plan limits
  const { data: userProfile } = await supabase
    .from('users')
    .select('plan_tier, avatar_count, name')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  const avatarLimit = AVATAR_LIMITS[userProfile.plan_tier] || 1

  if (userProfile.avatar_count >= avatarLimit) {
    return NextResponse.json(
      {
        error: `You have reached the avatar limit for your ${userProfile.plan_tier} plan (${avatarLimit} avatar${avatarLimit > 1 ? 's' : ''})`,
        upgrade_required: userProfile.plan_tier !== 'team',
      },
      { status: 403 }
    )
  }

  // Parse multipart form data
  const formData = await request.formData()
  const videoFile = formData.get('video') as File | null
  const avatarName = (formData.get('name') as string) || `${userProfile.name}'s Avatar`

  if (!videoFile) {
    return NextResponse.json({ error: 'Video file is required' }, { status: 400 })
  }

  // Validate video file
  if (videoFile.size > 500 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Video file exceeds 500MB limit' },
      { status: 400 }
    )
  }

  // Create avatar record in DB (processing state)
  const supabaseAdmin = createSupabaseAdmin()
  const { data: avatar, error: dbError } = await supabaseAdmin
    .from('avatars')
    .insert({
      user_id: user.id,
      heygen_avatar_id: 'pending',
      status: 'processing',
      name: avatarName,
    })
    .select()
    .single()

  if (dbError || !avatar) {
    return NextResponse.json({ error: 'Failed to create avatar record' }, { status: 500 })
  }

  // Process avatar creation asynchronously
  processAvatarCreation(avatar.id, user.id, videoFile, avatarName).catch(
    (error) => {
      console.error('Avatar creation failed:', error)
      supabaseAdmin
        .from('avatars')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', avatar.id)
    }
  )

  return NextResponse.json({
    avatar: { ...avatar, status: 'processing' },
    message: 'Avatar creation started. This typically takes 2-5 minutes.',
  })
}

async function processAvatarCreation(
  avatarId: string,
  userId: string,
  videoFile: File,
  avatarName: string
) {
  const supabaseAdmin = createSupabaseAdmin()

  // Convert File to Buffer
  const arrayBuffer = await videoFile.arrayBuffer()
  const videoBuffer = Buffer.from(arrayBuffer)

  // Upload video to HeyGen
  const videoUrl = await uploadVideoForAvatar(videoBuffer, `avatar_${avatarId}.mp4`)

  // Create avatar via HeyGen API
  const avatarResponse = await createAvatar({
    name: avatarName,
    video_url: videoUrl,
  })

  if (avatarResponse.code !== 100) {
    throw new Error(`HeyGen avatar creation failed: ${avatarResponse.message}`)
  }

  const heygenAvatarId = avatarResponse.data.avatar_id

  // Create voice clone from the same video
  let voiceId: string | undefined
  try {
    const voiceResponse = await createVoiceClone({
      name: `${avatarName} Voice`,
      audio_url: videoUrl,
    })
    if (voiceResponse.code === 100) {
      voiceId = voiceResponse.data.voice_id
    }
  } catch (error) {
    console.warn('Voice cloning failed, will use default voice:', error)
  }

  // Update avatar record with HeyGen IDs
  await supabaseAdmin
    .from('avatars')
    .update({
      heygen_avatar_id: heygenAvatarId,
      voice_id: voiceId || null,
      status: 'active',
    })
    .eq('id', avatarId)

  // Increment user avatar count
  await supabaseAdmin.rpc('increment_avatar_count' as never, { user_id: userId })
}
