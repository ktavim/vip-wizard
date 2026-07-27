import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { INVENTORY_API_BASE_URL } from '../lib/api/api-config';
import { AppSummaryDto } from '../lib/api/dto';
import { Dashboard } from './dashboard';

/**
 * The wizard must not reach step 2 until hosts have loaded.
 *
 * `StepAssignHosts.ngOnInit` snapshots its `hosts` input exactly once to seed the VIP list,
 * with no effect watching it. If step 2 ever mounts with an empty array it produces a
 * permanently empty step that never recovers — a bug that would look like a data problem
 * rather than a navigation one. If someone later "optimizes" selectApp to advance
 * immediately and show a skeleton, this test is what catches it.
 */

const BASE = '/api/inventory';

function textOf(fixture: ComponentFixture<Dashboard>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('Dashboard wizard navigation', () => {
  let fixture: ComponentFixture<Dashboard>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: INVENTORY_API_BASE_URL, useValue: BASE },
      ],
    });

    fixture = TestBed.createComponent(Dashboard);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  /**
   * Waits for a request to be issued, WITHOUT calling `fixture.whenStable()`.
   *
   * This matters and is easy to get wrong: under zoneless change detection an outstanding
   * HttpClient request counts as a pending task, so `whenStable()` does not resolve until
   * that request is flushed. Awaiting stability before flushing deadlocks until the hook
   * times out. Yield to the microtask queue and re-run change detection instead — the
   * `httpResource` request is issued from an effect, so it needs at least one pass.
   */
  async function awaitRequest(url: string): Promise<TestRequest> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const matches = http.match(url);
      if (matches.length === 1) return matches[0];
      await Promise.resolve();
      fixture.detectChanges();
    }
    throw new Error(`No request to ${url} was issued.`);
  }

  /**
   * Drains pending work after a response is flushed. Safe to await stability here —
   * nothing is left in flight once the response lands.
   *
   * The microtask loop matters: flushing resolves the HttpClient observable, but
   * `selectApp` then continues past its `await` before setting `step`. `whenStable()`
   * alone does not guarantee those continuations have run, so yield a few turns and render
   * between each.
   */
  async function settle(): Promise<void> {
    for (let turn = 0; turn < 5; turn++) {
      await Promise.resolve();
      fixture.detectChanges();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function flushApps(): Promise<void> {
    (await awaitRequest(`${BASE}/apps/submitted`)).flush([
      {
        id: 'identity-broker',
        name: 'identity-broker',
        owner_ad_group: 'CORP-IAM-CORE',
        submitted_scan_id: 'scan-4c09ae15',
        submitted_at: null,
        submitted_by: null,
        service_count: 2,
      } satisfies AppSummaryDto,
    ]);
    await settle();
  }

  function clickFirstApp(): void {
    const card = (fixture.nativeElement as HTMLElement).querySelector('button');
    (card as HTMLButtonElement).click();
  }

  it('stays on step 1 while hosts are in flight, then mounts step 2 with them', async () => {
    await flushApps();
    expect(textOf(fixture)).toContain('Select Application');

    clickFirstApp();

    // Request issued, but not yet answered — the wizard must not have advanced.
    const hostsReq = await awaitRequest(`${BASE}/apps/identity-broker/services`);

    // Render before asserting. `awaitRequest` can return on its first check, before any
    // change detection has run, and asserting against a stale DOM would let an eager
    // `step.set(2)` slip through — verified by mutation.
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Select Application');
    expect(textOf(fixture)).not.toContain('Assign Hosts to VIPs');

    hostsReq.flush([
      { host: 'login.microsoftonline.com', auth_method: 'oauth' },
      { host: 'ldap.corp.internal', auth_method: 'kerberos' },
    ]);
    await settle();

    const text = textOf(fixture);
    expect(text).toContain('Assign Hosts to VIPs');
    expect(text).toContain('login.microsoftonline.com');
    expect(text).toContain('ldap.corp.internal');

    // The assertion that actually guards the race: one VIP seeded per host. An empty step 2
    // still renders its heading and chrome, so checking the heading alone would not catch a
    // regression here. VIP names live in input values, not text content.
    const vipNames = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input'),
    ].map((input) => input.value);
    expect(vipNames).toEqual(['identity-broker-vip-1', 'identity-broker-vip-2']);
  });

  it('stays on step 1 and shows the error when the hosts request fails', async () => {
    await flushApps();

    clickFirstApp();

    (await awaitRequest(`${BASE}/apps/identity-broker/services`)).flush(
      { detail: 'No application with that id.' },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();

    const text = textOf(fixture);
    expect(text).toContain('Select Application');
    expect(text).not.toContain('Assign Hosts to VIPs');
    expect(text).toContain('No application with that id.');
  });
});
