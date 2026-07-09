import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { finalize } from 'rxjs';

/**
 * HTTP interceptor that triggers Angular change detection after every
 * HTTP response. This is necessary because the app runs in zoneless mode
 * (no zone.js), so async callbacks don't automatically trigger view
 * updates. Without this, component state changes made in subscribe
 * callbacks never re-render until a user event (click, input, etc.)
 * manually triggers change detection.
 *
 * Uses finalize() so that change detection runs AFTER the subscriber's
 * next/error callbacks have updated component state — tap() would run
 * before those callbacks, at which point the component hasn't updated yet.
 */
export const cdTriggerInterceptor: HttpInterceptorFn = (req, next) => {
  const appRef = inject(ApplicationRef);

  return next(req).pipe(
    finalize(() => appRef.tick()),
  );
};
