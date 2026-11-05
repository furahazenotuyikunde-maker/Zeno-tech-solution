import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function withRefreshedCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase authentication is not configured.' }, { status: 503 });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return withRefreshedCookies(response, NextResponse.json({ error: 'Could not verify your session.' }, { status: 503 }));
  }
  if (!user) {
    const login = new URL('/auth/signin', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return withRefreshedCookies(response, NextResponse.redirect(login));
  }

  const { data: membership, error: membershipError } = await supabase
    .from('hotel_users')
    .select('hotel_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return withRefreshedCookies(response, NextResponse.json({ error: 'Could not verify hotel access.' }, { status: 503 }));
  }
  if (!membership) {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/hotel-not-found', request.url)));
  }

  const role = membership.role as string;
  if (!['manager', 'receptionist', 'electrician'].includes(role)) {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/hotel-not-found', request.url)));
  }
  const isLogs = path === '/dashboard/logs';
  const isHardware = path === '/dashboard/hardware';
  const isBilling = path === '/dashboard/billing';
  const isDashboardRoot = path === '/dashboard';
  const managerRoutes = new Set([
    '/dashboard',
    '/dashboard/logs',
    '/dashboard/hardware',
    '/dashboard/billing',
    '/dashboard/users',
    '/dashboard/rooms',
    '/dashboard/master-cards',
    '/dashboard/cards',
  ]);

  if (role === 'receptionist' && !isDashboardRoot && !isLogs) {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/dashboard', request.url)));
  }
  if (role === 'electrician' && !isDashboardRoot && !isHardware && !isLogs) {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/dashboard', request.url)));
  }
  if (role === 'manager' && !managerRoutes.has(path)) {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/dashboard', request.url)));
  }
  if (isBilling && role !== 'manager') {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('subscription_status, trial_ends_at')
    .eq('id', membership.hotel_id)
    .maybeSingle();

  if (hotelError) {
    return withRefreshedCookies(response, NextResponse.json({ error: 'Could not verify hotel subscription.' }, { status: 503 }));
  }
  if (!hotel) {
    return withRefreshedCookies(response, NextResponse.redirect(new URL('/hotel-not-found', request.url)));
  }

  const subscriptionActive =
    hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now());
  if (!subscriptionActive && !isBilling) {
    const blockedPath = role === 'manager' ? '/dashboard/billing' : '/service-blocked';
    return withRefreshedCookies(response, NextResponse.redirect(new URL(blockedPath, request.url)));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
