import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

/**
 * HTTP interceptor that attaches the Bearer access token to every request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Try to get the token from the singleton TicketDataService
  // We inject lazily to avoid circular dependency
  const token = getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return next(req);
};

/**
 * Module-level token holder.
 * TicketDataService sets this on login/register/refresh.
 * The interceptor reads it to attach to requests.
 */
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}
