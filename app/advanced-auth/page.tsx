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
  return <main className="shell arch-advanced-shell" style={{maxWidth:1050,paddingBottom:90}}>
    <header className="topbar"><a href="/" className="brand-lockup" style={{textDecoration:'none'}}><span className="brand-mark">LS</span><span><strong>LotScope / Advanced</strong><span>Secure customer sign-in</span></span></a>
      <nav className="studio-nav"><a href="/advanced/overview">Explore Advanced</a><a href="/" className="nav-accent">Free site study ↗</a></nav></header>
    <section className="arch-advanced-hero"><p className="hero-kicker">PRIVATE DESIGN ACCESS / 01 — IDENTIFY</p><h1>Your designs deserve a secure home.</h1>
      <p>Continue through AeroVista Account. We verify your active Advanced entitlement and separately check permission for every private project.</p></section>
    <div className="arch-project-grid">
      <section className="arch-onboarding"><span className="arch-step-label">SECURE ACCOUNT HANDOFF</span><h2>Sign in to continue.</h2>
        <p>Private projects never open from a guessed URL. No staff Workbench privileges are granted by a paid customer pass.</p>
        <button type="button" className="primary-button" onClick={() => adapter().auth.beginLogin({ next: safeAdvancedNext(new URLSearchParams(window.location.search).get('next')) })}>Continue with AeroVista Account ↗</button>
        <p>Returning customers: use the account associated with the original project assignment.</p></section>
      <section className="arch-onboarding"><span className="arch-step-label">WHAT HAPPENS NEXT</span>
        <h2>Reopen the right revision.</h2>
        <p><strong>01</strong> Session and entitlement checked.</p><p><strong>02</strong> Assigned project permissions checked.</p>
        <p><strong>03</strong> Saved layout reloaded and report linked to the same design source.</p>
        <p><a href={LOTSCOPE_ADVANCED_STORE_URL} rel="noopener noreferrer">Explore one-time Advanced passes ↗</a></p></section>
    </div>
    <p className="arch-disclaimer">Account sign-in is not construction approval, and purchasing access does not automatically assign a private project. Public LotScope remains free.</p>
  </main>;
}
