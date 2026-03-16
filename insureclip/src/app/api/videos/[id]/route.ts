import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getVideoStatus } from '@/lib/heygen/client'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: video } = await supabase
    .from('videos')
    .select('*, scripts(*), avatars(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If still processing, sync status from HeyGen
  if (video.status === 'processing' && video.heygen_video_id) {
    try {
      const heygenStatus = await getVideoStatus(video.heygen_video_id)

      if (heygenStatus.data.status === 'completed' && heygenStatus.data.video_url) {
        const supabaseAdmin = createSupabaseAdmin()
        const { data: updatedVideo } = await supabaseAdmin
          .from('videos')
          .update({
            status: 'completed',
            output_url: heygenStatus.data.video_url,
            thumbnail_url: heygenStatus.data.thumbnail_url || null,
            duration: heygenStatus.data.duration || null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .select('*, scripts(*), avatars(*)')
          .single()

        return NextResponse.json({ video: updatedVideo })
      }

      if (heygenStatus.data.status === 'failed') {
        const supabaseAdmin = createSupabaseAdmin()
        const { data: updatedVideo } = await supabaseAdmin
          .from('videos')
          .update({
            status: 'failed',
            error_message: heygenStatus.data.error || 'Video generation failed',
          })
          .eq('id', params.id)
          .select('*, scripts(*), avatars(*)')
          .single()

        return NextResponse.json({ video: updatedVideo })
      }
    } catch (error) {
      console.error('Failed to sync video status:', error)
    }
  }

  return NextResponse.json({ video })
}
