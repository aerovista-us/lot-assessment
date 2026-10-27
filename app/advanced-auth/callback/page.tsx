'use client';
import { createBrowserAppAdapter } from '@aerovista-us/app-adapter/browser';
import { useEffect, useState } from 'react';
import { LOTSCOPE_ADVANCED_APP_ID, safeAdvancedNext } from '@/lib/aerovista/advanced-config';
function adapter() {
  return createBrowserAppAdapter({
    appId: LOTSCOPE_ADVANCED_APP_ID,
    appOrigin: window.location.origin,
    callbackPath: '/advanced-auth/callback',
    localEndpoints: {
      session: '/api/advanced/auth/session', handoffExchange: '/api/advanced/auth/handoff-exchange',
      capabilityCheck: '/api/advanced/auth/capability-check', identityMe: '/api/advanced/auth/me',
      logout: '/api/advanced/auth/logout',
    },
  });
}
export default function AdvancedCallback() {
  const [message, setMessage] = useState('Verifying your Advanced account…');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const originalUrl = window.location.href;
    const next = safeAdvancedNext(new URL(originalUrl).searchParams.get('next'));
    window.history.replaceState(null, '', '/advanced-auth/callback?next=' + encodeURIComponent(next));
    adapter().auth.completeLogin({ url: originalUrl })
      .then(({ next: destination }) => window.location.replace(safeAdvancedNext(destination)))
      .catch((cause: unknown) => {
        setMessage(cause instanceof Error ? cause.message : 'Advanced sign-in could not be completed.');
        setFailed(true);
      });
  }, []);
  return <main className="shell" style={{ maxWidth:680, margin:'8vh auto', padding:24 }}>
    <h1>{message}</h1>
    {failed ? <><p>Account access remains protected. You can retry your sign-in or return to free LotScope.</p>
      <button type="button" className="primary-button" onClick={() => adapter().auth.beginLogin({next:safeAdvancedNext(new URLSearchParams(window.location.search).get('next'))})}>Try sign-in again</button>
      <p><a href="/">Public LotScope</a></p></> : null}
  </main>;
}
