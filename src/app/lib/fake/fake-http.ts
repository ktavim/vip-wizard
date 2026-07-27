import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { HttpExceptionDto, ValidationErrorDto } from '../api/dto';
import { FakeEndpoint } from './fake-controls';

/**
 * Shared plumbing for the fake handlers. Everything here mimics what Angular's HttpClient
 * would surface from a real server, so that app code sees an identical failure shape either
 * way — that fidelity is the entire reason for faking at the interceptor layer rather than
 * swapping out the service.
 */

export interface FakeHandler {
  /** Short name matched by `?fake_fail=…`. */
  endpoint: FakeEndpoint;
  matches: (req: HttpRequest<unknown>, path: string) => boolean;
  /** Returns the response body, or throws via `httpException()` to produce an error. */
  handle: (req: HttpRequest<unknown>, path: string) => unknown;
}

/**
 * Builds the same `HttpErrorResponse` that HttpClient produces for a real error response,
 * with the body FastAPI's `HTTPException` serializes to. Thrown from handlers; the
 * interceptor lets it reject the stream.
 */
export function httpException(status: number, detail: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: 'Error',
    error: { detail } satisfies HttpExceptionDto,
  });
}

/**
 * The 422 FastAPI raises by itself when the request body fails Pydantic validation. The real
 * services get this for free from their route models, so the fakes have to hand-write the
 * cases the app can actually provoke.
 */
export function validationError(errors: ValidationErrorDto[]): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 422,
    statusText: 'Unprocessable Entity',
    error: { detail: errors } satisfies HttpExceptionDto,
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
