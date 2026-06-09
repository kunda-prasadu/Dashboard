import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

export interface NormalisedHttpError {
  status: number;
  message: string;
  originalError: HttpErrorResponse;
}

function toUserMessage(status: number): string {
  if (status === 0)   return 'Unable to reach the server. Please check your connection.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status >= 400 && status < 500) return 'Invalid request. Please check your input and try again.';
  return 'A server error occurred. Please try again later.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((raw: unknown) => {
      if (!(raw instanceof HttpErrorResponse)) return throwError(() => raw);

      const normalisedError: NormalisedHttpError = {
        status: raw.status,
        message: toUserMessage(raw.status),
        originalError: raw
      };

      logger.error(`HTTP ${raw.status} on ${req.method} ${req.url}`, normalisedError.message);

      return throwError(() => normalisedError);
    })
  );
};
