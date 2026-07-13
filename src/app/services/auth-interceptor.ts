import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, Observable } from 'rxjs';
import { catchError, switchMap, map, tap, finalize, share } from 'rxjs/operators';
import { apiConfig } from '../api.config';

let _accessToken: string | null = null;
let _refresh$: Observable<string> | null = null;
let _http: HttpClient | null = null;
let _router: Router | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!_http) {
    _http = inject(HttpClient);
    _router = inject(Router);
  }

  const token = _accessToken;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.includes('/auth/refresh')) {
        return refreshAndRetry(req, next);
      }
      return throwError(() => err);
    }),
  );
};

function refreshAndRetry(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  if (!_refresh$) {
    _refresh$ = _http!.post<{ accessToken: string }>(`${apiConfig.baseUrl}/api/auth/refresh`, {}).pipe(
      tap(res => _accessToken = res.accessToken),
      map(res => res.accessToken),
      catchError(err => {
        _accessToken = null;
        _router!.navigateByUrl('/login');
        return throwError(() => err);
      }),
      finalize(() => { _refresh$ = null; }),
      share(),
    );
  }

  return _refresh$.pipe(
    switchMap(newToken => {
      const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
      return next(cloned);
    }),
  );
}
