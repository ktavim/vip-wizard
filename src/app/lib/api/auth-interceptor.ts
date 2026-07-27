import { HttpInterceptorFn } from '@angular/common/http';
import { CREDENTIALED_API_BASE_URLS } from './api-config';

/**
 * Returns the credential to send, or null when there is none.
 *
 * NOT YET IMPLEMENTED — the app currently has no login flow, so there is no credential to
 * attach and this interceptor is a pass-through. It exists now so that the URL guard below
 * is in place before a token source arrives; retrofitting the guard onto a working
 * interceptor is exactly the kind of change that gets skipped.
 */
function readAccessToken(): string | null {
  return null;
}

/**
 * Matches on base-URL prefix. Works for absolute or relative base URLs alike, since the
 * request URL is built from the same base — in production both services are distinct
 * cross-origin hosts; in dev they are same-origin via proxy/fakes.
 */
function isCredentialedApi(url: string): boolean {
  return CREDENTIALED_API_BASE_URLS.some((baseUrl) => url.startsWith(baseUrl));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isCredentialedApi(req.url)) {
    return next(req);
  }

  const token = readAccessToken();
  if (token === null) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
