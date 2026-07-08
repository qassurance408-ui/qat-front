import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { getAccessToken, setAccessToken } from './auth-interceptor';
import { apiConfig } from '../api.config';

/**
 * Route guard that redirects to /login if the user is not authenticated.
 * On first load with no in-memory token, tries to refresh via the httpOnly cookie.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = getAccessToken();

  // If we already have an access token in memory, let them through
  if (token) {
    return true;
  }

  // No token — try to refresh using the httpOnly cookie
  return http.post<{ accessToken: string }>(`${apiConfig.baseUrl}/api/auth/refresh`, {}).pipe(
    map(res => {
      setAccessToken(res.accessToken);
      return true;
    }),
    catchError(() => {
      // Refresh failed — redirect to login
      return of(router.parseUrl('/login'));
    }),
  );
};
