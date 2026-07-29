import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { getAccessToken } from './auth-interceptor';
import { TicketDataService } from './ticket-data';

/**
 * Route guard that redirects to /login if the user is not authenticated.
 * On first load with no in-memory token, tries to refresh via the httpOnly cookie.
 * In both cases it also ensures the current user profile is loaded so the UI
 * (display name, avatar) is populated after a hard refresh.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const data = inject(TicketDataService);
  const token = getAccessToken();

  // Populate currentUser$ if it isn't already (e.g. after a hard refresh where
  // the in-memory user was lost). A failure here shouldn't block navigation —
  // the token is valid, so we still let them through.
  const hydrateUser = (): Observable<boolean> =>
    data.currentUser$.value
      ? of(true)
      : data.getAuthUser().pipe(
          map(() => true),
          catchError(() => of(true)),
        );

  // Already have an access token in memory — just make sure the user is loaded.
  if (token) {
    return hydrateUser();
  }

  // No token — try to refresh using the httpOnly cookie, then load the user.
  return data.refreshAccessToken().pipe(
    switchMap(() => hydrateUser()),
    catchError(() => of(router.parseUrl('/login'))),
  );
};
