import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { generateScript } from '@/lib/claude/script-generator'
import type { Database } from '@/lib/supabase/database.types'

const RequestSchema = z.object({
  topic_id: z.string().uuid().optional(),
  topic_title: z.string().min(1).max(200),
  language: z.enum(['cantonese', 'mandarin', 'english']).default('cantonese'),
  tone: z.enum(['professional', 'warm_casual', 'educational']).default('warm_casual'),
  length: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30),
  structure: z.enum(['problem_solution', 'story', 'list', 'qa']).default('problem_solution'),
  cta: z.enum(['contact_me', 'book_review', 'learn_more', 'none']).default('contact_me'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Get user profile for agent name
    const { data: userProfile } = await supabase
      .from('users')
      .select('name, company, plan_tier')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check language access based on plan
    if (
      parsed.data.language !== 'cantonese' &&
      userProfile.plan_tier === 'free'
    ) {
      return NextResponse.json(
        { error: 'Mandarin and English scripts require a Pro subscription' },
        { status: 403 }
      )
    }

    // Generate script via Claude API
    const result = await generateScript({
      ...parsed.data,
      agent_name: userProfile.name,
      agent_company: userProfile.company || undefined,
    })

    // Block generation if compliance fails
    if (result.compliance_status === 'fail') {
      return NextResponse.json(
        {
          error: 'Script failed compliance check',
          compliance_status: result.compliance_status,
          compliance_notes: result.compliance_notes,
        },
        { status: 422 }
      )
    }

    // Save script to database
    const { data: script, error: dbError } = await supabase
      .from('scripts')
      .insert({
        user_id: user.id,
        topic_id: parsed.data.topic_id || null,
        topic_title: parsed.data.topic_title,
        language: parsed.data.language,
        tone: parsed.data.tone,
        length: parsed.data.length,
        structure: parsed.data.structure,
        cta: parsed.data.cta,
        content: result.script,
        compliance_status: result.compliance_status,
        compliance_notes: result.compliance_notes,
        word_count: result.word_count,
        estimated_duration: result.estimated_duration,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Failed to save script:', dbError)
      return NextResponse.json({ error: 'Failed to save script' }, { status: 500 })
    }

    return NextResponse.json({
      script,
      compliance_status: result.compliance_status,
      compliance_notes: result.compliance_notes,
    })
  } catch (error) {
    console.error('Script generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
