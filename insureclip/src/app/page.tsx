import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">IC</span>
          </div>
          <span className="font-bold text-xl text-gray-900">InsureClip</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium">
            Sign in
          </Link>
          <Link href="/auth/signup" className="btn-primary py-2 px-4 text-sm">
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-brand-100">
          <span>Now available in Hong Kong</span>
          <span className="text-brand-400">•</span>
          <span>Cantonese, Mandarin & English</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          AI Video Studio for
          <br />
          <span className="text-brand-600">Insurance Agents</span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Pick a topic, get a compliant script, generate a video of yourself speaking it,
          and publish to any platform in under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
            Start free — 5 videos included
          </Link>
          <Link href="#how-it-works" className="btn-secondary text-lg px-8 py-4">
            See how it works
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto">
          {[
            { stat: '2 min', label: 'From idea to published video' },
            { stat: '3', label: 'Languages: Cantonese, Mandarin, English' },
            { stat: '100%', label: 'HK IA + SFC compliant scripts' },
          ].map(({ stat, label }) => (
            <div key={stat}>
              <div className="text-3xl font-bold text-brand-600">{stat}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            How InsureClip works
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">
            One setup, unlimited videos. Record your avatar once, then create professional
            content in minutes — not hours.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Clone your avatar',
                description: 'Record a 60-second selfie. We clone your face and voice.',
                icon: '📹',
              },
              {
                step: '02',
                title: 'Pick a topic',
                description: 'Choose from 30+ insurance topics or get AI suggestions.',
                icon: '💡',
              },
              {
                step: '03',
                title: 'Generate a compliant script',
                description: 'AI writes a script in Cantonese, Mandarin, or English — auto-compliance checked.',
                icon: '✍️',
              },
              {
                step: '04',
                title: 'Export & share',
                description: 'Your avatar delivers the script. One-tap export to Instagram, YouTube, or WhatsApp.',
                icon: '🚀',
              },
            ].map(({ step, title, description, icon }) => (
              <div key={step} className="card relative">
                <div className="text-3xl mb-4">{icon}</div>
                <div className="text-xs font-bold text-brand-400 mb-2">STEP {step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Built for Hong Kong insurance agents
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚖️',
                title: 'Compliance auto-check',
                description:
                  'Every script is automatically checked against HK Insurance Authority GL28 and SFC guidelines before you generate a video.',
              },
              {
                icon: '🗓️',
                title: 'Smart topic calendar',
                description:
                  'AI suggests 3-5 topics per week based on insurance seasons, market events, and your posting history. Never face a blank screen.',
              },
              {
                icon: '🌐',
                title: 'Trilingual support',
                description:
                  'Generate scripts and videos in Cantonese, Mandarin, or English. Native-quality lip-sync for Hong Kong and APAC markets.',
              },
              {
                icon: '📱',
                title: 'Multi-platform export',
                description:
                  'One-tap export to Instagram Reels, YouTube Shorts, TikTok, LinkedIn, and WhatsApp Status — correct format for each.',
              },
              {
                icon: '🎭',
                title: 'Your digital avatar',
                description:
                  'Record once, use forever. Your avatar looks and sounds like you — professional quality without cameras or editing.',
              },
              {
                icon: '📊',
                title: 'Content analytics',
                description:
                  'Track your videos created, consistency score, and most popular topics. Build the habit of regular content creation.',
              },
            ].map(({ icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="text-2xl shrink-0">{icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Simple pricing
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Break even at 60 subscribers. Start free, upgrade when you see results.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Free Trial',
                price: 'HK$0',
                period: '5 videos total',
                features: [
                  '5 video generations',
                  '1 avatar clone',
                  'Cantonese only',
                  'Basic topic suggestions',
                  'Watermarked 720p videos',
                ],
                cta: 'Start free',
                href: '/auth/signup',
                highlighted: false,
              },
              {
                name: 'Pro',
                price: 'HK$299',
                period: '/month',
                features: [
                  '20 videos/month + HK$15 extra',
                  '3 avatar clones',
                  'Cantonese + Mandarin + English',
                  '5 topics/week + market triggers',
                  'No watermark, 1080p',
                  'Branded intro/outro',
                  'All platform formats',
                  'Basic analytics',
                ],
                cta: 'Start Pro trial',
                href: '/auth/signup?plan=pro',
                highlighted: true,
              },
              {
                name: 'Team',
                price: 'HK$799',
                period: '/month · 3 seats',
                features: [
                  '60 videos/month + HK$12 extra',
                  '10 avatar clones',
                  'All languages',
                  'Unlimited topics',
                  'No watermark, 4K',
                  'Team dashboard',
                  'Custom company branding',
                  'Priority support',
                ],
                cta: 'Start Team trial',
                href: '/auth/signup?plan=team',
                highlighted: false,
              },
            ].map(({ name, price, period, features, cta, href, highlighted }) => (
              <div
                key={name}
                className={`card ${highlighted ? 'ring-2 ring-brand-500 relative' : ''}`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-1">{name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">{price}</span>
                    <span className="text-gray-500 text-sm">{period}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-8">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={highlighted ? 'btn-primary w-full text-center' : 'btn-secondary w-full text-center'}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to grow your client base with video?
          </h2>
          <p className="text-gray-600 mb-8">
            Join hundreds of HK insurance agents creating professional video content in minutes.
          </p>
          <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
            Start your free trial today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">IC</span>
            </div>
            <span className="font-semibold text-gray-900">InsureClip</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2026 InsureClip. AI-powered video creation for insurance agents in Hong Kong & APAC.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
