# InsureClip — AI Video Studio for Insurance Agents

> **HK$299/month · Generate compliant insurance videos in under 2 minutes**

InsureClip is an AI-powered video creation studio purpose-built for insurance agents and financial advisors in Hong Kong and Asia-Pacific. Agents record a 60-second selfie video once, and the platform creates their digital avatar clone that can deliver any script in Cantonese, Mandarin, or English with natural lip-sync and compliant content.

## Core User Loop

```
Pick a topic (10s) → AI generates compliant script (5s) → Review/edit (30s) → Generate video (60s) → Export & share (10s)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI Scripts | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Avatar + Video | HeyGen API (primary) / D-ID API (fallback) |
| Payments | Stripe (subscriptions) |
| Hosting | Vercel (frontend) |

---

## Features

### F1: Insurance Script Engine
- 30+ curated insurance topics in 5 categories
- AI-generated scripts in Cantonese, Mandarin, or English
- Two-stage compliance check: Claude prompt-level + regex/keyword scan
- Based on HK Insurance Authority GL28 + SFC guidelines

### F2: 1-Minute Avatar Clone
- 60-second calibration video → digital twin via HeyGen API
- Face cloning + voice cloning
- 4-step onboarding with quality checks

### F3: One-Click Video Generation
- Script + Avatar → branded video with subtitles + disclaimer
- Formats: Instagram Reels, YouTube Shorts, TikTok, LinkedIn, WhatsApp, General
- Compliance disclaimer footer auto-applied

### F4: Smart Topic Calendar
- AI suggests 3-5 topics/week based on insurance seasons and posting history
- Seasonal triggers: CNY, Mid-Autumn, tax season, renewal season, back-to-school
- Activity nudge after 5 days without a video

### F5: Analytics Dashboard
- Videos created this month
- Consistency score
- Most popular topics
- Weekly trend chart

---

## Project Structure

```
insureclip/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── onboarding/page.tsx         # Avatar creation flow
│   │   ├── dashboard/page.tsx          # Main dashboard
│   │   ├── studio/page.tsx             # Video creation studio
│   │   ├── pricing/page.tsx
│   │   └── api/
│   │       ├── scripts/
│   │       │   ├── generate/route.ts   # Claude API script generation
│   │       │   └── [id]/route.ts
│   │       ├── videos/
│   │       │   ├── generate/route.ts   # HeyGen video generation
│   │       │   └── [id]/route.ts
│   │       ├── avatars/route.ts        # Avatar creation + management
│   │       ├── topics/
│   │       │   ├── route.ts            # Topic library
│   │       │   └── calendar/route.ts   # Weekly suggestions
│   │       ├── analytics/route.ts
│   │       ├── billing/checkout/route.ts
│   │       └── webhooks/stripe/route.ts
│   ├── lib/
│   │   ├── supabase/                   # DB client + types
│   │   ├── claude/script-generator.ts  # Claude API integration
│   │   ├── heygen/client.ts            # HeyGen API client
│   │   └── compliance/rules.ts         # HK IA compliance rules
│   ├── types/index.ts
│   └── middleware.ts                   # Auth protection
├── supabase/
│   ├── schema.sql                      # Full database schema
│   └── seed.sql                        # Topic library seed data
└── .env.example
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd insureclip
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
- `HEYGEN_API_KEY` — from [HeyGen API pricing](https://www.heygen.com/api-pricing)
- `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard

### 3. Set up Supabase

In Supabase SQL editor, run:
```sql
-- Run supabase/schema.sql first
-- Then run supabase/seed.sql
```

### 4. Create Stripe products

Create two subscription products in Stripe:
- **Pro**: HK$299/month → copy Price ID to `STRIPE_PRO_PRICE_ID`
- **Team**: HK$799/month → copy Price ID to `STRIPE_TEAM_PRICE_ID`

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pricing

| Plan | Price | Videos/mo | Avatars |
|---|---|---|---|
| Free Trial | HK$0 | 5 (total) | 1 |
| Pro | HK$299/mo | 20 + HK$15 extra | 3 |
| Team | HK$799/mo | 60 + HK$12 extra | 10 |

**Break-even**: 60 paying subscribers
**Year 1 target**: 300 subscribers = HK$1.08M ARR

---

## Unit Economics (per 30-sec video)

| Cost | Amount |
|---|---|
| HeyGen API | US$0.50 |
| Claude API | US$0.03 |
| FFmpeg processing | US$0.01 |
| Storage | US$0.005 |
| **Total COGS** | **US$0.55 (~HK$4.30)** |
| Selling price | HK$15 |
| **Gross margin** | **~71%** |

---

## Compliance

All scripts are checked against:
- **HK Insurance Authority GL28** (Long Term Insurance guidelines)
- **SFC** marketing requirements

The two-stage compliance check:
1. **Stage 1 (Prompt-level)**: Claude's system prompt contains full compliance rules and refuses to generate non-compliant content
2. **Stage 2 (Post-generation regex)**: Scans for blacklisted phrases, checks for required disclaimers

Scripts that fail compliance are blocked from video generation.

---

## Development Roadmap

| Weeks | Phase |
|---|---|
| 1-2 | Foundation: Next.js, Supabase, HeyGen prototype |
| 3-4 | F1 + F2: Script engine + avatar creation |
| 5-6 | F3: Full video pipeline + FFmpeg post-processing |
| 7-8 | Beta: 20 beta testers, compliance engine v1 |
| 9-10 | F4 + F5: Topic calendar + analytics + Stripe |
| 11-12 | Launch: Landing page, App Store PWA, marketing |

---

## License

Proprietary — InsureClip © 2026
