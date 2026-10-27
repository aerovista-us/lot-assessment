import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdvancedAeroVistaServerAdapter } from '@/lib/aerovista/advanced-app-adapter.server';
import { LOTSCOPE_ADVANCED_SESSION_COOKIE } from '@/lib/aerovista/advanced-config';
export const dynamic = 'force-dynamic';
export async function POST() {
  const store = await cookies();
  const token = store.get(LOTSCOPE_ADVANCED_SESSION_COOKIE)?.value;
  if (token) await getAdvancedAeroVistaServerAdapter().auth.revokeSession(token).catch(() => null);
  const response = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  response.cookies.set(LOTSCOPE_ADVANCED_SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
