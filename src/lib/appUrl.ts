const PROD_HOST = 'tikinapp.com.br';
const PROD_WWW_HOST = 'www.tikinapp.com.br';

export function getCanonicalAppOrigin() {
  if (typeof window === 'undefined') return `https://${PROD_WWW_HOST}`;

  const host = window.location.hostname.toLowerCase();
  if (host === PROD_HOST || host === PROD_WWW_HOST) {
    return `https://${PROD_WWW_HOST}`;
  }

  return window.location.origin;
}
