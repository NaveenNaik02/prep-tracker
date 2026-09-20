import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { JWK } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// getClaims() caches the signing keys on the client instance, but updateSession
// builds a fresh client per request — so without hoisting, every request would
// refetch them and the network call we are removing just changes URL.
//
// A stale cache is safe: if the project rotates keys, the new token's `kid` is
// absent here and getClaims falls back to fetching the live set itself.
let jwksPromise: Promise<{ keys: JWK[] } | undefined> | null = null;

function getJwks() {
  jwksPromise ??= fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    .then((r) => (r.ok ? r.json() : undefined))
    .catch(() => undefined)
    .then((jwks) => {
      if (!jwks) jwksPromise = null; // let the next request retry
      return jwks;
    });
  return jwksPromise;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
      global: {
        fetch: (input, init) => {
          return fetch(input, { ...init, signal: AbortSignal.timeout(5000) });
        },
      },
    },
  );

  // getClaims() verifies the JWT signature locally against the project's public
  // signing key instead of asking the Auth server, which this ran on every
  // request. It still calls getSession() internally first, which is what
  // refreshes an expiring cookie — do not add logic before this call.
  //
  // On a project using the legacy symmetric secret this silently falls back to
  // a getUser() round trip. Ours signs ES256, so the local path is live.
  const claims = await supabase.auth
    .getClaims(undefined, { jwks: await getJwks() })
    .then(({ data }) => data?.claims ?? null)
    .catch(() => null);

  // Same gate in dev and prod — there's no auto-provisioned session in
  // either environment anymore, so `isAuthed` is always a real "did this
  // visitor actually log in" check.
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  // /auth/* must stay reachable while signed out — the OAuth callback's whole
  // job is to exchange the code for the session that doesn't exist yet.
  const isExempt =
    pathname === '/manifest.json' ||
    pathname.startsWith('/auth/') ||
    // Shared Library links are public by design — the unguessable token in
    // the path is what authorizes the read, server-side.
    pathname.startsWith('/read/');
  const isAuthed = !!claims && !claims.is_anonymous;

  if (!isAuthed && !isAuthPage && !isExempt) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (isAuthed && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
