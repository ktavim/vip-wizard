import { Injectable, signal } from '@angular/core';
import { DryRunOutcomeDto } from '../api/dto';

/**
 * Endpoints the fake can be told to fail, by short name.
 * Used as `?fake_fail=deploy` or `window.__fake.fail('deploy')`.
 */
export type FakeEndpoint = 'apps' | 'hosts' | 'dry-run' | 'deploy';

const ALL_ENDPOINTS: readonly FakeEndpoint[] = ['apps', 'hosts', 'dry-run', 'deploy'];

function isEndpoint(value: string): value is FakeEndpoint {
  return (ALL_ENDPOINTS as readonly string[]).includes(value);
}

/**
 * Runtime knobs for the fake backend, so failure and latency paths can actually be seen
 * during development rather than only reasoned about.
 *
 * Driven two ways:
 *   - URL query params — `?fake_latency=3000&fake_fail=deploy&fake_dryrun=fail`. Shareable
 *     as a repro link, and ports directly to e2e later.
 *   - `window.__fake` at runtime — `__fake.latency(0)`, `__fake.fail('deploy')`,
 *     `__fake.dryRun('fail')`, `__fake.reset()`.
 *
 * Deleted along with the rest of `lib/fake/` at cutover.
 */
@Injectable({ providedIn: 'root' })
export class FakeControls {
  /** Artificial round-trip delay. Nonzero by default so loading states are visible at all. */
  readonly latencyMs = signal(400);

  /** Endpoints that should fail. */
  readonly failing = signal<ReadonlySet<FakeEndpoint>>(new Set());

  /** HTTP status used when an endpoint is failing. */
  readonly failStatus = signal(500);

  /** Overrides the computed dry-run verdict, for exercising the deploy gate on demand. */
  readonly forcedDryRunOutcome = signal<DryRunOutcomeDto | null>(null);

  constructor() {
    this.applyQueryParams(globalThis.location?.search ?? '');
    this.exposeOnWindow();
  }

  isFailing(endpoint: FakeEndpoint): boolean {
    return this.failing().has(endpoint);
  }

  private applyQueryParams(search: string): void {
    const params = new URLSearchParams(search);

    const latency = Number.parseInt(params.get('fake_latency') ?? '', 10);
    if (Number.isFinite(latency) && latency >= 0) {
      this.latencyMs.set(latency);
    }

    const status = Number.parseInt(params.get('fake_status') ?? '', 10);
    if (Number.isFinite(status)) {
      this.failStatus.set(status);
    }

    // Repeatable: ?fake_fail=apps&fake_fail=deploy
    const failing = params.getAll('fake_fail').filter(isEndpoint);
    if (failing.length > 0) {
      this.failing.set(new Set(failing));
    }

    const outcome = params.get('fake_dryrun');
    if (outcome === 'pass' || outcome === 'warn' || outcome === 'fail') {
      this.forcedDryRunOutcome.set(outcome);
    }
  }

  private exposeOnWindow(): void {
    (globalThis as Record<string, unknown>)['__fake'] = {
      latency: (ms: number) => this.latencyMs.set(ms),
      status: (code: number) => this.failStatus.set(code),
      fail: (...endpoints: FakeEndpoint[]) => this.failing.set(new Set(endpoints)),
      dryRun: (outcome: DryRunOutcomeDto | null) => this.forcedDryRunOutcome.set(outcome),
      reset: () => {
        this.failing.set(new Set());
        this.forcedDryRunOutcome.set(null);
        this.failStatus.set(500);
      },
      state: () => ({
        latencyMs: this.latencyMs(),
        failing: [...this.failing()],
        failStatus: this.failStatus(),
        forcedDryRunOutcome: this.forcedDryRunOutcome(),
      }),
    };
  }
}
