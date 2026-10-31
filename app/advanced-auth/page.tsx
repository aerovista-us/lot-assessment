'use client';
import { createBrowserAppAdapter } from '@aerovista-us/app-adapter/browser';
import { LOTSCOPE_ADVANCED_APP_ID, LOTSCOPE_ADVANCED_STORE_URL, safeAdvancedNext } from '@/lib/aerovista/advanced-config';
function adapter() {
  return createBrowserAppAdapter({
    appId: LOTSCOPE_ADVANCED_APP_ID,
    appOrigin: window.location.origin,
    callbackPath: '/advanced-auth/callback',
    localEndpoints: {
      session: '/api/advanced/auth/session',
      handoffExchange: '/api/advanced/auth/handoff-exchange',
      capabilityCheck: '/api/advanced/auth/capability-check',
      identityMe: '/api/advanced/auth/me',
      logout: '/api/advanced/auth/logout',
    },
  });
}
export default function AdvancedAuthPage() {
  return <main className="shell" style={{maxWidth:680, margin:'7vh auto',padding:24}}>
    <p className="eyebrow">LotScope Advanced · Paid Customer</p>
    <h1>Access your design projects.</h1>
    <p>Sign in with AeroVista Account. Your Advanced entitlement and access to each project are verified separately. Public LotScope remains free.</p>
    <button type="button" className="primary-button" onClick={() => adapter().auth.beginLogin({ next: safeAdvancedNext(new URLSearchParams(window.location.search).get('next')) })}>Continue with AeroVista Account</button>
    <p><a href={LOTSCOPE_ADVANCED_STORE_URL} rel="noopener noreferrer">Explore Advanced passes in AeroVista Account</a></p>
    <p><a href="/">Return to free LotScope assessment</a></p>
  </main>;
}
