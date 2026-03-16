import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

// Seasonal topic mappings by month
const SEASONAL_TOPICS_BY_MONTH: Record<number, string[]> = {
  1: ['chinese_new_year', 'year_end'],       // January
  2: ['chinese_new_year'],                    // February
  3: ['tax_season'],                          // March
  4: ['tax_season'],                          // April
  5: [],                                      // May
  6: [],                                      // June
  7: [],                                      // July
  8: ['back_to_school'],                      // August
  9: ['back_to_school', 'mid_autumn'],        // September
  10: ['mid_autumn'],                         // October
  11: ['year_end'],                           // November
  12: ['year_end', 'christmas'],              // December
}

function getNextWeekDates(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }
  return dates
}

export async function GET(_request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's plan to determine suggestion count
  const { data: userProfile } = await supabase
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single()

  const suggestionCount = userProfile?.plan_tier === 'free' ? 3 : 5

  // Get existing pending suggestions
  const { data: existingSuggestions } = await supabase
    .from('calendar_suggestions')
    .select('*, topics(*)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .gte('suggested_date', new Date().toISOString().split('T')[0])
    .order('suggested_date')

  if (existingSuggestions && existingSuggestions.length >= suggestionCount) {
    return NextResponse.json({ suggestions: existingSuggestions })
  }

  // Generate new suggestions
  const currentMonth = new Date().getMonth() + 1
  const seasonalSeasons = SEASONAL_TOPICS_BY_MONTH[currentMonth] || []

  // Build a query for relevant topics
  let topicQuery = supabase
    .from('topics')
    .select('*')
    .eq('active', true)
    .limit(20)

  // Prioritize seasonal topics if applicable
  if (seasonalSeasons.length > 0) {
    topicQuery = topicQuery.in('season', [...seasonalSeasons, 'null'])
  }

  const { data: topics } = await topicQuery

  if (!topics || topics.length === 0) {
    return NextResponse.json({ suggestions: existingSuggestions || [] })
  }

  // Get recently used topics to avoid repetition
  const { data: recentVideos } = await supabase
    .from('videos')
    .select('script_id, scripts(topic_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentTopicIds = new Set(
    recentVideos
      ?.flatMap((v) => {
        const script = v.scripts as unknown as { topic_id: string | null } | null
        return script?.topic_id ? [script.topic_id] : []
      })
      .filter(Boolean) || []
  )

  // Filter out recently used topics and shuffle
  const freshTopics = topics
    .filter((t) => !recentTopicIds.has(t.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, suggestionCount)

  const nextWeekDates = getNextWeekDates()
  const newSuggestions = freshTopics.map((topic, index) => ({
    user_id: user.id,
    topic_id: topic.id,
    suggested_date: nextWeekDates[Math.floor(index * (7 / freshTopics.length))]
      .toISOString()
      .split('T')[0],
    status: 'pending' as const,
  }))

  if (newSuggestions.length > 0) {
    const supabaseAdmin = createSupabaseAdmin()
    await supabaseAdmin
      .from('calendar_suggestions')
      .insert(newSuggestions)
  }

  // Re-fetch with topic details
  const { data: updatedSuggestions } = await supabase
    .from('calendar_suggestions')
    .select('*, topics(*)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .gte('suggested_date', new Date().toISOString().split('T')[0])
    .order('suggested_date')
    .limit(suggestionCount)

  return NextResponse.json({ suggestions: updatedSuggestions || [] })
}

export async function PATCH(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { suggestion_id, status } = body

  if (!suggestion_id || !['used', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: suggestion } = await supabase
    .from('calendar_suggestions')
    .update({ status })
    .eq('id', suggestion_id)
    .eq('user_id', user.id)
    .select()
    .single()

  return NextResponse.json({ suggestion })
}
