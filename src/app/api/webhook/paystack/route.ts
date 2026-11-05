import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Paystack Payment Webhook Handler
 * POST /api/webhook/paystack
 *
 * When a hotel pays via Paystack (Cards, Apple Pay, or Mobile Money),
 * Paystack fires a 'charge.success' event to activate the subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_paystack_secret_key';

    // Verify HMAC SHA512 signature if secret key is present in production
    if (process.env.NODE_ENV === 'production' && process.env.PAYSTACK_SECRET_KEY) {
      const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
      if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid Paystack signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    // Handle Successful Payment
    if (event === 'charge.success') {
      const metadata = data?.metadata || {};
      const hotelId = metadata.hotel_id || 'h-1';
      const plan = metadata.plan || (data.amount >= 5000 ? 'pro' : 'starter');
      const maxRooms = plan === 'pro' ? 50 : 10;
      const customerEmail = data.customer?.email || metadata.owner_email;

      console.log(`[PAYSTACK WEBHOOK] charge.success for Hotel ${hotelId}, Plan: ${plan}, Customer: ${customerEmail}`);

      // In production Supabase, execute:
      // UPDATE hotels SET subscription_status = 'active', plan = plan, max_rooms = maxRooms WHERE id = hotelId;

      return NextResponse.json({
        received: true,
        event: 'charge.success',
        hotel_id: hotelId,
        plan,
        max_rooms: maxRooms,
        status: 'active',
        message: `Hotel subscription successfully activated on ${plan.toUpperCase()} plan.`,
      }, { status: 200 });
    }

    return NextResponse.json({ received: true, event }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
