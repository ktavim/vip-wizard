import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEPLOYMENT_API_BASE_URL } from './api-config';
import { DeploymentsApi } from './deployments-api';
import { Vip, VipConfig } from '../models';


const BASE = '/api/deployments';

const vip: Vip = {
  id: 'vip-0',
  name: 'payroll-gateway-vip-1',
  hosts: [{ host: 'api.adp.com', auth: 'oauth' }],
};

const configs: Record<string, VipConfig> = {
  'vip-0': {
    ip: '10.0.1.100',
    port: '443',
    protocol: 'HTTPS',
    sslProfile: 'clientssl-secure',
    defaultPool: '',
    iRule: '',
  },
};

describe('DeploymentsApi', () => {
  let api: DeploymentsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DEPLOYMENT_API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(DeploymentsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('dryRun', () => {
    it('POSTs the contract body to /deployments/dry-run', async () => {
      const pending = api.dryRun('payroll-gateway', [vip], configs);

      const req = http.expectOne(`${BASE}/deployments/dry-run`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        app_id: 'payroll-gateway',
        vips: [
          {
            ref: 'vip-0',
            name: 'payroll-gateway-vip-1',
            hosts: [{ host: 'api.adp.com', auth_method: 'oauth' }],
            config: {
              ip: '10.0.1.100',
              port: 443,
              protocol: 'HTTPS',
              ssl_profile: 'clientssl-secure',
              default_pool: null,
              irule: null,
            },
          },
        ],
      });

      req.flush({ outcome: 'warn', findings: [] });

      const result = await pending;
      expect(result).toEqual({
        ok: true,
        data: { outcome: 'warn', findings: [] },
      });
    });

    it('surfaces a 200 fail verdict as success, not an error', async () => {
      // Validation failures are findings, not transport errors. The `ok: false` branch must
      // mean only that the request did not complete.
      const pending = api.dryRun('payroll-gateway', [vip], configs);

      http.expectOne(`${BASE}/deployments/dry-run`).flush({
        outcome: 'fail',
        findings: [
          {
            code: 'INVALID_VIRTUAL_IP',
            severity: 'error',
            message: 'Not a valid IPv4 address.',
            vip_ref: 'vip-0',
            field: 'config.ip',
          },
        ],
      });

      const result = await pending;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.outcome).toBe('fail');
        expect(result.data.findings[0].vipId).toBe('vip-0');
      }
    });

    it('maps a 500 into a retriable ApiError', async () => {
      const pending = api.dryRun('payroll-gateway', [vip], configs);

      http
        .expectOne(`${BASE}/deployments/dry-run`)
        .flush({ detail: 'Upstream device unreachable.' }, { status: 500, statusText: 'Error' });

      const result = await pending;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_500');
        expect(result.error.message).toBe('Upstream device unreachable.');
        expect(result.error.retriable).toBe(true);
      }
    });
  });

  describe('deploy', () => {
    it('sends the Idempotency-Key header', async () => {
      const pending = api.deploy('payroll-gateway', [vip], configs, 'key-abc');

      const req = http.expectOne(`${BASE}/deployments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe('key-abc');

      req.flush({
        deployment_id: 'dep_1',
        status: 'succeeded',
        vip_results: [{ vip_ref: 'vip-0', status: 'created', object_path: '/Common/x' }],
        findings: [],
      });

      const result = await pending;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.vipResults[0].vipId).toBe('vip-0');
      }
    });

    it('reuses the same key on a retry after failure', async () => {
      // This is what stops a retry after a network timeout from double-creating VIPs.
      const first = api.deploy('payroll-gateway', [vip], configs, 'key-abc');
      http.expectOne(`${BASE}/deployments`).flush(null, { status: 0, statusText: 'Unknown' });
      expect((await first).ok).toBe(false);

      const retry = api.deploy('payroll-gateway', [vip], configs, 'key-abc');
      const retried = http.expectOne(`${BASE}/deployments`);
      expect(retried.request.headers.get('Idempotency-Key')).toBe('key-abc');

      retried.flush({
        deployment_id: 'dep_1',
        status: 'succeeded',
        vip_results: [],
        findings: [],
      });
      expect((await retry).ok).toBe(true);
    });
  });
});
