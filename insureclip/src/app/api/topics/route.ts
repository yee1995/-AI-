import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  let query = supabase
    .from('topics')
    .select('*')
    .eq('active', true)
    .order('category')

  if (category) {
    query = query.eq('category', category)
  }

  const { data: topics, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }

  return NextResponse.json({ topics: topics || [] })
}
