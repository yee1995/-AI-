'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Topic, Language, VideoTone, VideoLength, ScriptStructure, CallToAction, ExportFormat } from '@/types'

type StudioStep = 'topic' | 'script' | 'generate' | 'export'

interface GeneratedScript {
  id: string
  content: string
  compliance_status: 'pass' | 'warning' | 'fail'
  compliance_notes: string[]
  language: Language
  length: VideoLength
}

interface GeneratedVideo {
  id: string
  status: string
  output_url?: string
  watermarked_url?: string
  thumbnail_url?: string
}

const TOPIC_CATEGORIES = [
  { value: 'product_education', label: 'Product Education', emoji: '📚' },
  { value: 'life_events', label: 'Life Events', emoji: '🎯' },
  { value: 'market_commentary', label: 'Market Commentary', emoji: '📊' },
  { value: 'seasonal', label: 'Seasonal', emoji: '🗓️' },
  { value: 'client_engagement', label: 'Client Engagement', emoji: '💬' },
]

export default function StudioPage() {
  const router = useRouter()
  const [step, setStep] = useState<StudioStep>('topic')
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [script, setScript] = useState<GeneratedScript | null>(null)
  const [video, setVideo] = useState<GeneratedVideo | null>(null)
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Script params
  const [language, setLanguage] = useState<Language>('cantonese')
  const [tone, setTone] = useState<VideoTone>('warm_casual')
  const [length, setLength] = useState<VideoLength>(30)
  const [structure, setStructure] = useState<ScriptStructure>('problem_solution')
  const [cta, setCta] = useState<CallToAction>('contact_me')
  const [editedScript, setEditedScript] = useState('')

  // Video params
  const [format, setFormat] = useState<ExportFormat>('instagram_reels')

  useEffect(() => {
    loadTopics()
    loadAvatar()
  }, [categoryFilter])

  const loadTopics = async () => {
    const url = categoryFilter ? `/api/topics?category=${categoryFilter}` : '/api/topics'
    const res = await fetch(url)
    const data = await res.json()
    setTopics(data.topics || [])
  }

  const loadAvatar = async () => {
    const res = await fetch('/api/avatars')
    const data = await res.json()
    const activeAvatar = (data.avatars || []).find((a: { status: string; id: string }) => a.status === 'active')
    if (activeAvatar) setAvatarId(activeAvatar.id)
  }

  const generateScript = async () => {
    if (!selectedTopic) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: selectedTopic.id,
          topic_title: language === 'cantonese' ? selectedTopic.title_zh : selectedTopic.title_en,
          language,
          tone,
          length,
          structure,
          cta,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Script generation failed')
        if (data.compliance_notes) {
          setError(`Compliance issue: ${data.compliance_notes.join('. ')}`)
        }
        return
      }

      setScript(data.script)
      setEditedScript(data.script.content)
      setStep('script')
    } catch {
      setError('Failed to generate script. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateVideo = async () => {
    if (!script || !avatarId) return
    setLoading(true)
    setError(null)

    // Save edited script if changed
    if (editedScript !== script.content) {
      const res = await fetch(`/api/scripts/${script.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedScript }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Script update failed')
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_id: script.id,
          avatar_id: avatarId,
          format,
          include_intro_outro: true,
          include_subtitles: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Video generation failed')
        if (data.quota_exceeded) {
          setError('You have used all your videos this month. Upgrade to continue.')
        }
        return
      }

      setVideo(data.video)
      setStep('generate')
      pollVideoStatus(data.video.id)
    } catch {
      setError('Failed to start video generation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pollVideoStatus = async (videoId: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/videos/${videoId}`)
      const data = await res.json()

      if (data.video?.status === 'completed') {
        setVideo(data.video)
        setStep('export')
        clearInterval(interval)
      } else if (data.video?.status === 'failed') {
        setError('Video generation failed. Please try again.')
        clearInterval(interval)
      }
    }, 5000)
  }

  const filteredTopics = categoryFilter
    ? topics.filter((t) => t.category === categoryFilter)
    : topics

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
              ← Dashboard
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-bold text-gray-900">Video Studio</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {(['topic', 'script', 'generate', 'export'] as StudioStep[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    step === s ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}
                >
                  {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
                {i < 3 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* No avatar warning */}
        {!avatarId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800 text-sm">
              <strong>Avatar not ready yet.</strong> Your AI avatar is still being processed (2-5 minutes).
              You can still write scripts while you wait.{' '}
              <button onClick={loadAvatar} className="underline">Refresh status</button>
            </p>
          </div>
        )}

        {/* Step 1: Topic */}
        {step === 'topic' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a topic</h2>
            <p className="text-gray-600 mb-6">Select what you want to talk about in your video.</p>

            {/* Category filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  !categoryFilter ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                All topics
              </button>
              {TOPIC_CATEGORIES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    categoryFilter === value ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>

            {/* Script params */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl border border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="cantonese">廣東話</option>
                  <option value="mandarin">普通話</option>
                  <option value="english">English</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as VideoTone)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="warm_casual">Warm & casual</option>
                  <option value="professional">Professional</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value) as VideoLength)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Call to action</label>
                <select
                  value={cta}
                  onChange={(e) => setCta(e.target.value as CallToAction)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="contact_me">Contact me</option>
                  <option value="book_review">Book a review</option>
                  <option value="learn_more">Learn more</option>
                  <option value="none">No CTA</option>
                </select>
              </div>
            </div>

            {/* Topic grid */}
            <div className="grid md:grid-cols-2 gap-3">
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    selectedTopic?.id === topic.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {language === 'cantonese' ? topic.title_zh : topic.title_en}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {topic.category.replace('_', ' ')}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={generateScript}
                disabled={!selectedTopic || loading}
                className="btn-primary"
              >
                {loading ? 'Generating script...' : 'Generate script →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Script review */}
        {step === 'script' && script && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review your script</h2>
            <p className="text-gray-600 mb-4">Edit as needed, then generate your video.</p>

            <div className="flex items-center gap-3 mb-4">
              <span className={`badge-${script.compliance_status}`}>
                {script.compliance_status === 'pass' ? '✓ Compliance passed' : script.compliance_status === 'warning' ? '⚠ Compliance warning' : '✕ Compliance failed'}
              </span>
              <span className="text-sm text-gray-500">{script.length}s · {language === 'cantonese' ? '廣東話' : language === 'mandarin' ? '普通話' : 'English'}</span>
            </div>

            {script.compliance_notes.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">Compliance notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {script.compliance_notes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={editedScript}
              onChange={(e) => setEditedScript(e.target.value)}
              rows={12}
              className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
            />

            <div className="flex gap-3 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Export format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="instagram_reels">Instagram Reels (9:16)</option>
                  <option value="youtube_shorts">YouTube Shorts (9:16)</option>
                  <option value="tiktok">TikTok (9:16)</option>
                  <option value="linkedin">LinkedIn (1:1)</option>
                  <option value="whatsapp">WhatsApp Status (9:16)</option>
                  <option value="general">General (16:9)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep('topic')} className="btn-secondary">
                ← Back to topics
              </button>
              <button
                onClick={generateVideo}
                disabled={loading || !avatarId}
                className="btn-primary"
              >
                {loading ? 'Starting...' : !avatarId ? 'Avatar not ready yet' : 'Generate video →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 'generate' && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating your video...</h2>
            <p className="text-gray-600 mb-6">
              Your avatar is delivering the script. This typically takes 30-90 seconds.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              Processing video...
            </div>
          </div>
        )}

        {/* Step 4: Export */}
        {step === 'export' && video && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your video is ready!</h2>
            <p className="text-gray-600 mb-6">Preview and export to your chosen platform.</p>

            {(video.output_url || video.watermarked_url) && (
              <video
                src={video.output_url || video.watermarked_url}
                controls
                className="w-full max-w-md mx-auto rounded-xl mb-6 bg-black block"
              />
            )}

            {video.watermarked_url && !video.output_url && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
                <p className="text-amber-800 text-sm">
                  <strong>Free plan:</strong> Video includes a watermark.{' '}
                  <Link href="/pricing" className="underline font-medium">Upgrade to Pro</Link> to remove it.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Download', icon: '⬇️', action: () => {
                  const url = video.output_url || video.watermarked_url
                  if (url) window.open(url, '_blank')
                }},
                { label: 'Share to Instagram', icon: '📱', action: () => alert('Copy the download link and upload via Instagram app') },
                { label: 'Share to LinkedIn', icon: '💼', action: () => alert('Copy the download link and upload via LinkedIn') },
              ].map(({ label, icon, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="btn-secondary flex-col py-4 h-auto"
                >
                  <span className="text-2xl mb-1">{icon}</span>
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Link href="/dashboard" className="btn-secondary">
                Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setStep('topic')
                  setSelectedTopic(null)
                  setScript(null)
                  setVideo(null)
                  setError(null)
                }}
                className="btn-primary"
              >
                Create another video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
