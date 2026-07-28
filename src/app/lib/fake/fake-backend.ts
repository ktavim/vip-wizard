import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { deploymentHandlers } from './deployment-handlers';
import { FakeControls } from './fake-controls';
import { FakeHandler, httpException, sleep } from './fake-http';
import { inventoryHandlers } from './inventory-handlers';

/**
 * Short-circuits requests to a faked service and answers them in-process.
 *
 * **Routing is per service, not global.** Each request is matched against a service's base
 * URL and that service's own `useFake` flag is consulted, so setting
 * `inventoryApi.useFake: false` while leaving `deploymentApi.useFake: true` runs the app
 * against the live Inventory API with deploy still faked. That mixed mode is how each
 * cutover gets verified in isolation rather than both at once.
 *
 * Anything unmatched — a different origin, an asset, a service already cut over — passes
 * straight through untouched.
 *
 * Known trade-off: faked requests never reach the network, so they do not appear in the
 * DevTools Network tab. The console group logged below is the substitute.
 */
export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const controls = inject(FakeControls);

  const services = [
    { config: environment.inventoryApi, handlers: inventoryHandlers() },
    {
      config: environment.deploymentApi,
      handlers: deploymentHandlers(controls),
    },
  ];

  const service = services.find(
    (candidate) => candidate.config.useFake && matchesBase(req.url, candidate.config.baseUrl),
  );
  if (!service) {
    return next(req);
  }

  // Path relative to the service's base, so handlers match on `/apps` rather than the
  // full versioned prefix.
  const path = req.url.slice(service.config.baseUrl.length).split('?')[0];
  const handler = service.handlers.find((candidate) => candidate.matches(req, path));

  return from(respond(req, path, handler, controls));
};

/**
 * Prefix match, with a blank base URL rejected rather than treated as "matches everything".
 *
 * `''` is a prefix of every string, so a faked service left with an empty `baseUrl` would
 * out-match the service the request was actually for — including a service already cut over
 * to live — and then 404 it, since no handler matches an absolute URL. That failure reads as
 * a dead endpoint (`[fake] ✗ GET https://…/apps/submitted → 404`) rather than as the config
 * mistake it is, so name it here instead.
 */
function matchesBase(url: string, baseUrl: string): boolean {
  if (baseUrl === '') {
    console.error(
      '[fake] A service has useFake: true with an empty baseUrl, so it is being skipped. ' +
        'An empty baseUrl prefix-matches every request and would hijack the whole app. ' +
        'Set that service\'s baseUrl in src/environments/, or set useFake: false.',
    );
    return false;
  }
  return url.startsWith(baseUrl);
}

async function respond(
  req: Parameters<HttpInterceptorFn>[0],
  path: string,
  handler: FakeHandler | undefined,
  controls: FakeControls,
): Promise<HttpResponse<unknown>> {
  const startedAt = performance.now();
  await sleep(controls.latencyMs());

  try {
    if (!handler) {
      throw httpException(404, `No fake handler for ${req.method} ${path}.`);
    }

    // Forced failure is checked after routing so that `?fake_fail=deploy` reports the
    // configured status rather than a confusing 404 from a typo'd endpoint name.
    if (controls.isFailing(handler.endpoint)) {
      throw httpException(
        controls.failStatus(),
        `Injected failure: the fake backend was told to fail '${handler.endpoint}'.`,
      );
    }

    const response = new HttpResponse({
      status: 200,
      url: req.url,
      body: handler.handle(req, path),
    });
    log(req, path, response.status, startedAt, response.body);
    return response;
  } catch (cause) {
    const status = cause instanceof HttpErrorResponse ? cause.status : 500;
    log(req, path, status, startedAt, cause instanceof HttpErrorResponse ? cause.error : cause);
    throw cause;
  }
}

/** Stands in for the Network tab, which faked requests never reach. */
function log(
  req: Parameters<HttpInterceptorFn>[0],
  path: string,
  status: number,
  startedAt: number,
  body: unknown,
): void {
  const duration = Math.round(performance.now() - startedAt);
  const marker = status < 400 ? '✓' : '✗';

  console.groupCollapsed(
    `%c[fake] ${marker} ${req.method} ${path} → ${status} (${duration}ms)`,
    `color: ${status < 400 ? '#10b981' : '#f43f5e'}`,
  );
  if (req.body !== null) console.log('request', req.body);
  console.log('response', body);
  console.groupEnd();
}
