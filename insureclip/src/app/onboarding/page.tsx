'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

type OnboardingStep = 'profile' | 'avatar_intro' | 'record' | 'processing' | 'preview'

const CALIBRATION_SCRIPT = {
  cantonese: `你好，我係[你的名字]，一位專注於保障同財富規劃的財務顧問。

讓我同你解釋一下呢個計劃係點運作，以及佢可以為你同你嘅家人提供咩保障。

呢個計劃嘅年費由每年HK$2,400起，保障範圍高達HK$200萬元醫療費用。

我明白呢個對你嚟講可能感覺有啲複雜，所以我就係係度一步一步噉引導你。`,

  english: `Hello, I'm [your name], a financial planner specializing in protection and wealth planning.

Let me walk you through how this plan works and what it covers for you and your family.

The annual premium starts from $2,400 per year, covering up to $2 million in medical expenses.

I understand this can feel overwhelming. That's exactly why I'm here to guide you step by step.`,
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('profile')
  const [profile, setProfile] = useState({
    company: '',
    license_no: '',
    language: 'cantonese' as 'cantonese' | 'english',
  })
  const [recording, setRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createSupabaseClient()

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('users').update(profile).eq('id', user.id)
    setStep('avatar_intro')
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1920, height: 1080 },
        audio: true,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setVideoBlob(blob)
        setAvatarPreviewUrl(URL.createObjectURL(blob))
        setStep('preview')
      }

      mediaRecorder.start()
      setRecording(true)
      setTimer(0)

      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t >= 60) {
            stopRecording()
            return 60
          }
          return t + 1
        })
      }, 1000)
    } catch {
      setError('Could not access camera. Please grant camera and microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    setRecording(false)
  }

  const uploadAvatar = async () => {
    if (!videoBlob) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('video', videoBlob, 'calibration.webm')
      formData.append('name', 'My Avatar')

      const response = await fetch('/api/avatars', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create avatar')
      }

      setStep('processing')

      // Redirect to studio after short delay
      setTimeout(() => router.push('/studio'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['profile', 'avatar_intro', 'record', 'preview'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s
                    ? 'bg-brand-600 text-white'
                    : ['profile', 'avatar_intro', 'record', 'preview', 'processing'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {['profile', 'avatar_intro', 'record', 'preview', 'processing'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step: Profile */}
        {step === 'profile' && (
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your profile</h1>
            <p className="text-gray-600 mb-6">This helps personalize your scripts and videos.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company / Agency <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="AIA, Prudential, FWD, or your firm name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance license number <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profile.license_no}
                  onChange={(e) => setProfile({ ...profile, license_no: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="IA license number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred language for scripts
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'cantonese', label: '廣東話', sublabel: 'Cantonese' },
                    { value: 'english', label: 'English', sublabel: 'For international clients' },
                  ].map(({ value, label, sublabel }) => (
                    <button
                      key={value}
                      onClick={() => setProfile({ ...profile, language: value as 'cantonese' | 'english' })}
                      className={`border rounded-xl p-4 text-left transition-colors ${
                        profile.language === value
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{label}</div>
                      <div className="text-xs text-gray-500">{sublabel}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={saveProfile} className="btn-primary w-full mt-6">
              Continue
            </button>
          </div>
        )}

        {/* Step: Avatar intro */}
        {step === 'avatar_intro' && (
          <div className="card text-center">
            <div className="text-5xl mb-4">📹</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your AI avatar</h1>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Record a 60-second selfie video reading the calibration script. We&apos;ll clone your
              face and voice to create your digital twin.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
              <h3 className="font-semibold text-amber-800 mb-2">For best results:</h3>
              <ul className="space-y-1 text-sm text-amber-700">
                <li>• Good lighting on your face (face a window or use a lamp)</li>
                <li>• Quiet room with minimal background noise</li>
                <li>• Hold phone steady or use a stand</li>
                <li>• Look directly at the camera</li>
                <li>• Speak naturally at your normal pace</li>
              </ul>
            </div>

            <button
              onClick={() => setStep('record')}
              className="btn-primary w-full"
            >
              I&apos;m ready — start recording
            </button>
          </div>
        )}

        {/* Step: Record */}
        {step === 'record' && (
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Read the calibration script</h1>
            <p className="text-gray-600 mb-4">Read this script naturally into your camera.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <div className="relative bg-black rounded-xl overflow-hidden mb-4 aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {recording && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {timer}s / 60s
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {CALIBRATION_SCRIPT[profile.language]}
            </div>

            <div className="flex gap-3">
              {!recording ? (
                <button onClick={startRecording} className="btn-primary flex-1">
                  Start recording
                </button>
              ) : (
                <button onClick={stopRecording} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
                  Stop recording ({timer}s)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Review your recording</h1>
            <p className="text-gray-600 mb-4">
              Happy with it? We&apos;ll use this to create your AI avatar.
            </p>

            {avatarPreviewUrl && (
              <video
                ref={previewRef}
                src={avatarPreviewUrl}
                controls
                className="w-full rounded-xl mb-4 bg-black"
              />
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('record')}
                className="btn-secondary flex-1"
              >
                Re-record
              </button>
              <button
                onClick={uploadAvatar}
                disabled={uploading}
                className="btn-primary flex-1"
              >
                {uploading ? 'Uploading...' : 'Create my avatar'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="card text-center">
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Creating your avatar...</h1>
            <p className="text-gray-600 mb-6">
              We&apos;re learning your face and cloning your voice. This takes 2-5 minutes.
            </p>
            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Learning your face...
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              Taking you to the studio while we process your avatar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
