import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import {
  generateVideo,
  pollVideoStatus,
  FORMAT_DIMENSIONS,
  HEYGEN_LANGUAGE_MAP,
} from '@/lib/heygen/client'
import type { Database } from '@/lib/supabase/database.types'

const RequestSchema = z.object({
  script_id: z.string().uuid(),
  avatar_id: z.string().uuid(),
  format: z
    .enum(['instagram_reels', 'youtube_shorts', 'tiktok', 'linkedin', 'whatsapp', 'general'])
    .default('general'),
  include_intro_outro: z.boolean().default(true),
  include_subtitles: z.boolean().default(true),
  background_music: z.boolean().default(false),
})

// Video limits per plan
const VIDEO_LIMITS: Record<string, number> = {
  free: 5,
  pro: 20,
  team: 60,
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan_tier, videos_used_this_month')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check video quota
    const videoLimit = VIDEO_LIMITS[userProfile.plan_tier] || 5
    if (userProfile.videos_used_this_month >= videoLimit) {
      return NextResponse.json(
        {
          error: `You have used all ${videoLimit} videos for this month on the ${userProfile.plan_tier} plan`,
          quota_exceeded: true,
          upgrade_required: userProfile.plan_tier !== 'team',
        },
        { status: 403 }
      )
    }

    // Fetch script
    const { data: script } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', parsed.data.script_id)
      .eq('user_id', user.id)
      .single()

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (script.compliance_status === 'fail') {
      return NextResponse.json(
        { error: 'Cannot generate video for a script that failed compliance' },
        { status: 422 }
      )
    }

    // Fetch avatar
    const { data: avatar } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', parsed.data.avatar_id)
      .eq('user_id', user.id)
      .single()

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    if (avatar.status !== 'active') {
      return NextResponse.json(
        { error: 'Avatar is not ready yet. Please wait for processing to complete.' },
        { status: 409 }
      )
    }

    const dimension = FORMAT_DIMENSIONS[parsed.data.format]
    const language = HEYGEN_LANGUAGE_MAP[script.language as keyof typeof HEYGEN_LANGUAGE_MAP]

    // Create video record in DB
    const supabaseAdmin = createSupabaseAdmin()
    const { data: videoRecord } = await supabaseAdmin
      .from('videos')
      .insert({
        user_id: user.id,
        avatar_id: parsed.data.avatar_id,
        script_id: parsed.data.script_id,
        status: 'queued',
        format: parsed.data.format,
        aspect_ratio: `${dimension.width}:${dimension.height}`,
        include_intro_outro: parsed.data.include_intro_outro,
        include_subtitles: parsed.data.include_subtitles,
        background_music: parsed.data.background_music,
      })
      .select()
      .single()

    if (!videoRecord) {
      return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 })
    }

    // Start async video generation
    generateVideoAsync(
      videoRecord.id,
      user.id,
      avatar.heygen_avatar_id,
      avatar.voice_id || undefined,
      script.content,
      language,
      dimension,
      parsed.data
    ).catch((error) => {
      console.error('Video generation failed:', error)
      supabaseAdmin
        .from('videos')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', videoRecord.id)
    })

    return NextResponse.json({
      video: videoRecord,
      message: 'Video generation started. This typically takes 30-90 seconds.',
    })
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateVideoAsync(
  videoId: string,
  userId: string,
  heygenAvatarId: string,
  voiceId: string | undefined,
  scriptContent: string,
  language: string,
  dimension: { width: number; height: number },
  options: { include_intro_outro: boolean; include_subtitles: boolean; background_music: boolean }
) {
  const supabaseAdmin = createSupabaseAdmin()

  // Update status to processing
  await supabaseAdmin
    .from('videos')
    .update({ status: 'processing' })
    .eq('id', videoId)

  // Call HeyGen API to generate video
  const heygenResponse = await generateVideo({
    avatar_id: heygenAvatarId,
    voice_id: voiceId,
    script: scriptContent,
    language,
    dimension,
    title: `InsureClip_${videoId}`,
  })

  if (heygenResponse.code !== 100) {
    throw new Error(`HeyGen video generation failed: ${heygenResponse.message}`)
  }

  const heygenVideoId = heygenResponse.data.video_id

  // Update DB with HeyGen video ID
  await supabaseAdmin
    .from('videos')
    .update({ heygen_video_id: heygenVideoId })
    .eq('id', videoId)

  // Poll for completion
  const completedVideo = await pollVideoStatus(heygenVideoId)

  // In production: run FFmpeg post-processing here
  // - Add branded intro/outro
  // - Burn subtitles
  // - Add compliance disclaimer footer
  // - Compress for specific platform
  // For MVP: use HeyGen output directly
  const finalUrl = completedVideo.video_url

  // Determine if video should be watermarked (free plan)
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('plan_tier')
    .eq('id', userId)
    .single()

  const isWatermarked = userProfile?.plan_tier === 'free'

  // Update video record with completed status
  await supabaseAdmin
    .from('videos')
    .update({
      status: 'completed',
      output_url: isWatermarked ? null : finalUrl,
      watermarked_url: isWatermarked ? finalUrl : null,
      thumbnail_url: completedVideo.thumbnail_url || null,
      duration: completedVideo.duration || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', videoId)

  // Increment monthly video usage counter
  await supabaseAdmin
    .from('users')
    .update({
      videos_used_this_month: (userProfile?.plan_tier === 'free' ? 0 : 0) + 1,
    })
    .eq('id', userId)
}
