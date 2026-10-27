export const LOTSCOPE_ADVANCED_APP_ID = 'lotscope_advanced' as const;
export const LOTSCOPE_ADVANCED_SESSION_COOKIE = 'lotscope_advanced_session' as const;

export function safeAdvancedNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/advanced';
  try {
    const url = new URL(value, 'https://lotscope.aerovista.us');
    if (url.origin !== 'https://lotscope.aerovista.us' ||
      (url.pathname !== '/advanced' && !url.pathname.startsWith('/advanced/')))
      return '/advanced';
    return url.pathname + url.search + url.hash;
  } catch { return '/advanced'; }
}
