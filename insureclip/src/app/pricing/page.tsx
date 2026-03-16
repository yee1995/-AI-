'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 'HK$0',
    period: '',
    description: '5 videos to get started',
    features: [
      '5 video generations (total)',
      '1 avatar clone',
      'Cantonese scripts only',
      '3 topic suggestions/week',
      'Watermarked 720p videos',
      'Community support',
    ],
    cta: 'Start free',
    href: '/auth/signup',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'HK$299',
    period: '/month',
    description: 'For active agents',
    features: [
      '20 videos/month + HK$15 each additional',
      '3 avatar clones',
      'Cantonese + Mandarin + English',
      '5 topics/week + market event triggers',
      'No watermark, 1080p HD',
      'Customizable branded intro/outro',
      'All platform export formats',
      'Basic analytics dashboard',
      'Email + chat support',
    ],
    cta: 'Upgrade to Pro',
    href: '/api/billing/checkout',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 'HK$799',
    period: '/month · 3 seats',
    description: 'For agency leaders',
    features: [
      '60 videos/month + HK$12 each additional',
      '10 avatar clones (across team)',
      'All languages + Japanese (expansion)',
      'Unlimited topic suggestions',
      'No watermark, 4K quality',
      'Team dashboard & performance tracking',
      'Custom company branding',
      'Custom compliance rules',
      'Priority support + onboarding call',
    ],
    cta: 'Upgrade to Team',
    href: '/api/billing/checkout',
    highlighted: false,
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return
    setLoading(planId)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch {
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IC</span>
            </div>
            <span className="font-bold text-xl text-gray-900">InsureClip</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-600 text-lg">
            Start free. Upgrade when you see results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`card relative ${plan.highlighted ? 'ring-2 ring-brand-500' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-2 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id === 'free' ? (
                <Link href={plan.href} className={plan.highlighted ? 'btn-primary w-full text-center' : 'btn-secondary w-full text-center'}>
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {loading === plan.id ? 'Redirecting...' : plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: 'Are the scripts actually compliant with HK regulations?',
                a: 'Yes. Every script is automatically checked against HK Insurance Authority GL28 guidelines and SFC requirements. Scripts containing guaranteed return promises, misleading claims, or banned promotional language are blocked before you generate.',
              },
              {
                q: 'How realistic is the avatar?',
                a: "We use HeyGen's Avatar IV technology — the industry's most realistic AI avatar with natural lip-sync, facial expressions, and voice cloning. Quality is significantly better than basic AI video tools.",
              },
              {
                q: 'Can I use the videos on social media?',
                a: 'Yes. You own all content you create. Videos export with the correct format for Instagram Reels, YouTube Shorts, TikTok, LinkedIn, WhatsApp, and more.',
              },
              {
                q: 'What if the avatar quality is poor?',
                a: 'If the quality check detects issues (poor lighting, background noise), we will ask you to re-record with specific tips. You can always re-do your avatar recording.',
              },
              {
                q: 'Can my insurance company restrict me from using InsureClip?',
                a: "InsureClip is a content creation tool (like Canva or CapCut) and doesn't access policy data or company systems. There's no regulatory barrier to using it.",
              },
              {
                q: 'Is my face and voice data secure?',
                a: 'Avatar data is stored securely with strict 1:1 ownership — only you can use your avatar. An invisible watermark with your agent ID is embedded in every video.',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h4 className="font-semibold text-gray-900 mb-2">{q}</h4>
                <p className="text-sm text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
