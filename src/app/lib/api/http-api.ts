import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { HttpExceptionDto, ValidationErrorDto } from './dto';

/**
 * Services return this instead of throwing. Every call site in this app is a UI state
 * machine that must *render* failure rather than propagate it, so a union makes the error
 * branch type-enforced and removes the floating-rejection hazard from template-invoked
 * async handlers (`(click)="deploy()"` ignores the returned promise).
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface ApiError {
  /**
   * Machine-readable, and always synthetic: FastAPI error bodies carry no code of their own,
   * so this is derived from the status (`HTTP_404`) or from the transport failure
   * (`NETWORK_UNREACHABLE`, `CLIENT_ERROR`). Branch on `status` for anything finer.
   */
  code: string;
  /** Display string. Always populated — never surface an empty error to the user. */
  message: string;
  /** Null when the request never reached a server (offline, DNS, CORS). */
  status: number | null;
  /** Whether retrying the identical request could plausibly succeed. */
  retriable: boolean;
}

const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/** 4xx are caller errors and stay broken on retry; transient/server-side faults do not. */
function isRetriable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/** How many field errors of a 422 to spell out before summarizing the rest as a count. */
const MAX_VALIDATION_ERRORS = 3;

function isHttpException(body: unknown): body is HttpExceptionDto {
  return typeof body === 'object' && body !== null && 'detail' in body;
}

function isValidationErrors(detail: unknown): detail is ValidationErrorDto[] {
  return (
    Array.isArray(detail) &&
    detail.length > 0 &&
    detail.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ValidationErrorDto).msg === 'string' &&
        Array.isArray((entry as ValidationErrorDto).loc),
    )
  );
}

/**
 * Flattens a 422 body into one line. `loc[0]` is the request part (`body`, `query`, …),
 * which means nothing to a reader, so it's dropped and the rest becomes a dotted field path.
 */
function validationMessage(errors: ValidationErrorDto[]): string {
  const shown = errors.slice(0, MAX_VALIDATION_ERRORS).map((error) => {
    const field = error.loc.slice(1).join('.');
    return field ? `${field}: ${error.msg}` : error.msg;
  });
  const hidden = errors.length - shown.length;

  return hidden > 0 ? `${shown.join('; ')} (+${hidden} more)` : shown.join('; ');
}

/**
 * Extracts a renderable string from a FastAPI error body, or null when there isn't one —
 * a gateway's HTML page, Starlette's plain-text `Internal Server Error`, or a handler that
 * passed a dict as `detail` (rendering that would print `[object Object]`).
 */
function detailMessage(body: unknown): string | null {
  if (!isHttpException(body)) {
    return null;
  }

  const { detail } = body;
  if (typeof detail === 'string') {
    return detail.trim() || null;
  }
  if (isValidationErrors(detail)) {
    return validationMessage(detail);
  }
  return null;
}

/**
 * Normalizes anything thrown by HttpClient into a renderable ApiError. Both services share
 * this because both are FastAPI apps raising the framework's own `HTTPException`.
 */
export function toApiError(cause: unknown): ApiError {
  if (!(cause instanceof HttpErrorResponse)) {
    // A bug in our own mapping/parse code rather than a transport failure. Don't claim it's
    // retriable — retrying deterministic client-side code just fails again.
    return {
      code: 'CLIENT_ERROR',
      message: FALLBACK_MESSAGE,
      status: null,
      retriable: false,
    };
  }

  // status 0 means the request never completed: offline, DNS failure, CORS rejection.
  if (cause.status === 0) {
    return {
      code: 'NETWORK_UNREACHABLE',
      message: NETWORK_MESSAGE,
      status: null,
      retriable: true,
    };
  }

  // `detailMessage` returns null when the body isn't FastAPI's — a 500 from a proxy or
  // gateway is frequently an HTML error page rather than anything we generated.
  return {
    code: `HTTP_${cause.status}`,
    message: detailMessage(cause.error) ?? FALLBACK_MESSAGE,
    status: cause.status,
    retriable: isRetriable(cause.status),
  };
}

/**
 * Runs a request and maps the response body into a domain value, converting any failure —
 * transport or mapping — into `{ ok: false }`.
 *
 * This is the only place in `src/app` outside `lib/fake/` allowed to touch RxJS. Keeping
 * `firstValueFrom` contained here is what lets the rest of the app stay promise/signal based.
 */
export async function request<TWire, TDomain>(
  source: Observable<TWire>,
  map: (wire: TWire) => TDomain,
): Promise<ApiResult<TDomain>> {
  try {
    return { ok: true, data: map(await firstValueFrom(source)) };
  } catch (cause) {
    return { ok: false, error: toApiError(cause) };
  }
}
