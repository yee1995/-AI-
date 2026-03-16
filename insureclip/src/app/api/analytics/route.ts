import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export async function GET(_request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get current month start
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Videos created this month
  const { data: monthlyVideos } = await supabase
    .from('videos')
    .select('id, status, format, created_at, scripts(topic_id, topic_title)')
    .eq('user_id', user.id)
    .gte('created_at', monthStart)
    .order('created_at', { ascending: false })

  // Total videos ever
  const { count: totalVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')

  // Videos last 4 weeks for trend
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)
  const { data: weeklyData } = await supabase
    .from('videos')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('created_at', fourWeeksAgo.toISOString())

  // Aggregate by week
  const weekCounts: Record<string, number> = {}
  weeklyData?.forEach((v) => {
    const date = new Date(v.created_at)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1
  })

  // Most popular topics (by creation frequency)
  const topicCounts: Record<string, { title: string; count: number }> = {}
  monthlyVideos?.forEach((v) => {
    const script = v.scripts as unknown as { topic_id: string | null; topic_title: string } | null
    if (script?.topic_title) {
      const key = script.topic_id || script.topic_title
      if (!topicCounts[key]) {
        topicCounts[key] = { title: script.topic_title, count: 0 }
      }
      topicCounts[key].count++
    }
  })

  const topTopics = Object.values(topicCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Content consistency score (based on posting regularity)
  const completedThisMonth = monthlyVideos?.filter((v) => v.status === 'completed').length || 0
  const daysSinceMonthStart = Math.max(1, Math.floor((now.getTime() - new Date(monthStart).getTime()) / (1000 * 60 * 60 * 24)))
  const expectedVideosPerDay = 3 / 7 // target: 3 per week
  const consistencyScore = Math.min(
    100,
    Math.round((completedThisMonth / (expectedVideosPerDay * daysSinceMonthStart)) * 100)
  )

  // Last video creation date
  const { data: lastVideo } = await supabase
    .from('videos')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const daysSinceLastVideo = lastVideo
    ? Math.floor(
        (now.getTime() - new Date(lastVideo.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  return NextResponse.json({
    analytics: {
      videos_this_month: completedThisMonth,
      total_videos: totalVideos || 0,
      weekly_trend: Object.entries(weekCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count })),
      top_topics: topTopics,
      consistency_score: consistencyScore,
      days_since_last_video: daysSinceLastVideo,
      needs_nudge: daysSinceLastVideo !== null && daysSinceLastVideo >= 5,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { event_type, video_id, metadata } = body

  if (!event_type) {
    return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdmin()
  await supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    video_id: video_id || null,
    event_type,
    metadata: metadata || {},
  })

  return NextResponse.json({ success: true })
}
