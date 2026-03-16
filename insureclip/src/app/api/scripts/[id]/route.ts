import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { runComplianceCheck } from '@/lib/compliance/rules'
import type { Database } from '@/lib/supabase/database.types'

const UpdateSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: script } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ script })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Re-run compliance check on manual edits
  const complianceResult = runComplianceCheck(parsed.data.content)

  if (complianceResult.status === 'fail') {
    return NextResponse.json(
      {
        error: 'Edited script failed compliance check',
        compliance_status: complianceResult.status,
        compliance_notes: complianceResult.violations.map((v) => v.message),
      },
      { status: 422 }
    )
  }

  const { data: script } = await supabase
    .from('scripts')
    .update({
      content: parsed.data.content,
      compliance_status: complianceResult.status,
      compliance_notes: complianceResult.violations.map((v) => v.message),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  return NextResponse.json({ script })
}
