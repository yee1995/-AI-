'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Analytics {
  videos_this_month: number
  total_videos: number
  weekly_trend: Array<{ week: string; count: number }>
  top_topics: Array<{ title: string; count: number }>
  consistency_score: number
  days_since_last_video: number | null
  needs_nudge: boolean
}

interface CalendarSuggestion {
  id: string
  suggested_date: string
  status: string
  topics: {
    title_en: string
    title_zh: string
    category: string
  }
}

interface Avatar {
  id: string
  name: string
  status: string
  preview_url?: string
}

interface UserProfile {
  name: string
  plan_tier: string
  videos_used_this_month: number
}

const VIDEO_LIMITS: Record<string, number> = { free: 5, pro: 20, team: 60 }

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([])
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createSupabaseClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    const [analyticsRes, suggestionsRes, avatarsRes, { data: { user } }] = await Promise.all([
      fetch('/api/analytics'),
      fetch('/api/topics/calendar'),
      fetch('/api/avatars'),
      supabase.auth.getUser(),
    ])

    const [analyticsData, suggestionsData, avatarsData] = await Promise.all([
      analyticsRes.json(),
      suggestionsRes.json(),
      avatarsRes.json(),
    ])

    setAnalytics(analyticsData.analytics)
    setSuggestions(suggestionsData.suggestions || [])
    setAvatars(avatarsData.avatars || [])

    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('name, plan_tier, videos_used_this_month')
        .eq('id', user.id)
        .single()
      setProfile(userProfile)
    }

    setLoading(false)
  }

  const dismissSuggestion = async (id: string) => {
    await fetch('/api/topics/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion_id: id, status: 'dismissed' }),
    })
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const videoLimit = VIDEO_LIMITS[profile?.plan_tier || 'free']
  const videosUsed = profile?.videos_used_this_month || 0
  const videoQuotaPercent = Math.min(100, (videosUsed / videoLimit) * 100)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IC</span>
            </div>
            <span className="font-bold text-xl text-gray-900">InsureClip</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile?.name}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              profile?.plan_tier === 'pro' ? 'bg-brand-100 text-brand-700' :
              profile?.plan_tier === 'team' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {profile?.plan_tier?.toUpperCase() || 'FREE'}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Nudge banner */}
        {analytics?.needs_nudge && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-800">
                It&apos;s been {analytics.days_since_last_video} days since your last video!
              </p>
              <p className="text-sm text-brand-600">
                Agents who post 3+ videos/week get 2.4x more inquiries. Ready to create?
              </p>
            </div>
            <Link href="/studio" className="btn-primary ml-4 py-2 px-4 text-sm">
              Create now
            </Link>
          </div>
        )}

        {/* Main CTA */}
        <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-brand-100 mb-6">
            What would you like to talk about today?
          </p>
          <Link href="/studio" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors">
            + Create a video
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Stats + Calendar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="text-3xl font-bold text-brand-600">{analytics?.videos_this_month || 0}</div>
                <div className="text-sm text-gray-500 mt-1">Videos this month</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-brand-600">{analytics?.total_videos || 0}</div>
                <div className="text-sm text-gray-500 mt-1">Total videos</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-green-600">{analytics?.consistency_score || 0}%</div>
                <div className="text-sm text-gray-500 mt-1">Consistency score</div>
              </div>
            </div>

            {/* Video quota */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Monthly video quota</h3>
                <span className="text-sm text-gray-500">{videosUsed} / {videoLimit} used</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${videoQuotaPercent > 80 ? 'bg-orange-500' : 'bg-brand-500'}`}
                  style={{ width: `${videoQuotaPercent}%` }}
                />
              </div>
              {videoQuotaPercent > 80 && profile?.plan_tier !== 'team' && (
                <p className="text-xs text-orange-600">
                  Running low!{' '}
                  <Link href="/pricing" className="underline font-medium">Upgrade to get more videos</Link>
                </p>
              )}
            </div>

            {/* Topic suggestions */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">This week&apos;s topic suggestions</h3>
                <span className="text-xs text-gray-400">AI-curated for you</span>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No suggestions yet. Check back soon!
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {s.topics?.title_zh || s.topics?.title_en}
                        </div>
                        <div className="text-xs text-gray-500">
                          Suggested for {new Date(s.suggested_date).toLocaleDateString('en-HK', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Link
                          href={`/studio?topic=${s.topics?.title_en}`}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 whitespace-nowrap"
                        >
                          Use this →
                        </Link>
                        <button
                          onClick={() => dismissSuggestion(s.id)}
                          className="text-gray-300 hover:text-gray-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top topics */}
            {analytics?.top_topics && analytics.top_topics.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Your most popular topics</h3>
                <div className="space-y-3">
                  {analytics.top_topics.map(({ title, count }) => (
                    <div key={title} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-brand-500 h-1.5 rounded-full"
                            style={{ width: `${(count / (analytics.top_topics[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 shrink-0">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Avatar + Quick actions */}
          <div className="space-y-6">
            {/* Avatar status */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Your avatars</h3>
              {avatars.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">No avatar yet</p>
                  <Link href="/onboarding" className="btn-primary py-2 px-4 text-sm">
                    Create avatar
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {avatars.map((avatar) => (
                    <div key={avatar.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                        <span className="text-brand-600 font-bold text-sm">
                          {avatar.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{avatar.name}</div>
                        <div className={`text-xs ${avatar.status === 'active' ? 'text-green-600' : avatar.status === 'processing' ? 'text-amber-600' : 'text-red-600'}`}>
                          {avatar.status === 'active' ? '✓ Ready' : avatar.status === 'processing' ? '⏳ Processing...' : '✕ Failed'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Quick actions</h3>
              <div className="space-y-2">
                <Link href="/studio" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-xl">🎬</span>
                  <span className="text-sm font-medium text-gray-700">Create video</span>
                </Link>
                <Link href="/onboarding" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-xl">📹</span>
                  <span className="text-sm font-medium text-gray-700">Add/update avatar</span>
                </Link>
                {profile?.plan_tier === 'free' && (
                  <Link href="/pricing" className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors bg-brand-50 border border-brand-100">
                    <span className="text-xl">⬆️</span>
                    <span className="text-sm font-medium text-brand-700">Upgrade to Pro</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Upgrade prompt for free users */}
            {profile?.plan_tier === 'free' && (
              <div className="card border-brand-200 bg-brand-50">
                <h3 className="font-bold text-brand-900 mb-2">Upgrade to Pro</h3>
                <p className="text-sm text-brand-700 mb-4">
                  Remove watermarks, unlock 20 videos/month, Mandarin & English, and more.
                </p>
                <div className="text-2xl font-bold text-brand-900 mb-3">HK$299/mo</div>
                <Link href="/pricing" className="btn-primary w-full text-center text-sm py-2">
                  See Pro features
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
