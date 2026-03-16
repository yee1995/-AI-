import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdmin } from '@/lib/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan

      if (userId && plan) {
        await supabase
          .from('users')
          .update({
            plan_tier: plan,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', subscription.customer as string)
        .single()

      if (userRecord) {
        const isActive = subscription.status === 'active'
        await supabase
          .from('users')
          .update({
            plan_tier: isActive ? determinePlan(subscription) : 'free',
            subscription_current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq('id', userRecord.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', subscription.customer as string)
        .single()

      if (userRecord) {
        await supabase
          .from('users')
          .update({
            plan_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', userRecord.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

function determinePlan(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  return 'free'
}
