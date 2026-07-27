import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './http-api';
import { toAppSummaries, toDeployRequest, toDryRunResult, toHosts } from './mappers';
import { Vip, VipConfig } from '../models';

/**
 * These are the functions that break when the real backend's shape differs from the
 * contract, and a silently wrong value here — a port sent as a string, an empty SSL profile
 * sent as `''` — reaches production without any other test noticing. Pure functions, so no
 * TestBed and no Angular bootstrap.
 */

function config(overrides: Partial<VipConfig> = {}): VipConfig {
  return {
    ip: '10.0.1.100',
    port: '443',
    protocol: 'HTTPS',
    sslProfile: '',
    defaultPool: '',
    iRule: '',
    ...overrides,
  };
}

const vip: Vip = {
  id: 'vip-0',
  name: 'payroll-gateway-vip-1',
  hosts: [{ host: 'api.adp.com', auth: 'oauth' }],
};

describe('inventory mappers', () => {
  it('maps the app list, dropping the submission metadata the picker does not render', () => {
    const result = toAppSummaries([
      {
        id: 'payroll-gateway',
        name: 'payroll-gateway',
        owner_ad_group: 'CORP-PAYROLL-ENG',
        submitted_scan_id: 'scan-8f21c04a',
        submitted_at: '2026-06-14T09:32:11Z',
        submitted_by: 'dhalpern',
        service_count: 3,
      },
    ]);

    // toEqual, not toMatchObject: the point of the assertion is that the four extra wire
    // fields are absent from the domain object, not merely that the three kept ones match.
    expect(result).toEqual([{ id: 'payroll-gateway', name: 'payroll-gateway', serviceCount: 3 }]);
  });

  it('renames auth_method to auth and carries host through unchanged', () => {
    const result = toHosts([{ host: 'api.adp.com', auth_method: 'oauth' }]);

    expect(result).toEqual([{ host: 'api.adp.com', auth: 'oauth' }]);
  });

  it('passes through an auth method this build does not know', () => {
    // The server is free to add auth methods; rendering degrades via authColor()'s fallback.
    const result = toHosts([{ host: 'h', auth_method: 'saml-federated' }]);

    expect(result[0].auth).toBe('saml-federated');
  });
});

describe('toDeployRequest', () => {
  it('sends port as a number', () => {
    const body = toDeployRequest('payroll-gateway', [vip], {
      'vip-0': config({ port: '8443' }),
    });

    expect(body.vips[0].config.port).toBe(8443);
  });

  it('sends an unparseable port as NaN rather than defaulting it', () => {
    // Silently substituting 443 would deploy a port the user never asked for. The server
    // reports it as a finding instead.
    const body = toDeployRequest('payroll-gateway', [vip], {
      'vip-0': config({ port: 'abc' }),
    });

    expect(body.vips[0].config.port).toBeNaN();
  });

  it('converts empty optional fields to null', () => {
    const body = toDeployRequest('payroll-gateway', [vip], {
      'vip-0': config({
        sslProfile: '',
        defaultPool: '   ',
        iRule: 'irule_redirect',
      }),
    });

    expect(body.vips[0].config.ssl_profile).toBeNull();
    expect(body.vips[0].config.default_pool).toBeNull();
    expect(body.vips[0].config.irule).toBe('irule_redirect');
  });

  it('sends Vip.id as ref and hosts in wire shape', () => {
    const body = toDeployRequest('payroll-gateway', [vip], {
      'vip-0': config(),
    });

    expect(body.vips[0].ref).toBe('vip-0');
    expect(body.vips[0].hosts).toEqual([{ host: 'api.adp.com', auth_method: 'oauth' }]);
  });

  it('skips VIPs with no config rather than inventing defaults', () => {
    const body = toDeployRequest('payroll-gateway', [vip], {});

    expect(body.vips).toEqual([]);
  });
});

describe('toDryRunResult', () => {
  it('maps vip_ref to vipId and preserves the server verdict', () => {
    const result = toDryRunResult({
      outcome: 'warn',
      findings: [
        {
          code: 'MIXED_AUTH_METHODS',
          severity: 'warning',
          message: 'Mixed auth methods detected.',
          vip_ref: 'vip-0',
          field: null,
        },
      ],
    });

    expect(result.outcome).toBe('warn');
    expect(result.findings[0].vipId).toBe('vip-0');
    expect(result.findings[0].message).toBe('Mixed auth methods detected.');
  });

  it('trusts outcome even when it disagrees with the findings', () => {
    // The server owns gating policy. Re-deriving severity client-side would be wrong.
    const result = toDryRunResult({ outcome: 'fail', findings: [] });

    expect(result.outcome).toBe('fail');
  });
});

describe('toApiError', () => {
  it('treats status 0 as an unreachable network', () => {
    const error = toApiError(new HttpErrorResponse({ status: 0 }));

    expect(error.code).toBe('NETWORK_UNREACHABLE');
    expect(error.status).toBeNull();
    expect(error.retriable).toBe(true);
  });

  it('reads the string detail out of an HTTPException body', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 404,
        error: { detail: "No application with id 'x'." },
      }),
    );

    expect(error.code).toBe('HTTP_404');
    expect(error.message).toBe("No application with id 'x'.");
    expect(error.retriable).toBe(false);
  });

  it('flattens the field errors of a 422 into one message', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 422,
        error: {
          detail: [
            {
              type: 'string_pattern_mismatch',
              loc: ['body', 'vips', 0, 'config', 'ip'],
              msg: 'String should match pattern',
              input: 'nope',
            },
          ],
        },
      }),
    );

    expect(error.message).toBe('vips.0.config.ip: String should match pattern');
    expect(error.retriable).toBe(false);
  });

  it('summarizes the tail when a 422 lists more errors than fit', () => {
    const detail = Array.from({ length: 5 }, (_, index) => ({
      type: 'missing',
      loc: ['body', 'vips', index, 'name'],
      msg: 'Field required',
    }));

    const error = toApiError(new HttpErrorResponse({ status: 422, error: { detail } }));

    expect(error.message).toContain('vips.0.name: Field required');
    expect(error.message).toContain('(+2 more)');
  });

  it('does not render a non-string detail verbatim', () => {
    // `raise HTTPException(detail={...})` is legal; stringifying it shows `[object Object]`.
    const error = toApiError(
      new HttpErrorResponse({ status: 409, error: { detail: { reason: 'locked' } } }),
    );

    expect(error.message).not.toContain('object Object');
  });

  it('falls back to a generic message for a non-JSON 500', () => {
    // Gateways commonly return an HTML error page rather than our envelope.
    const error = toApiError(
      new HttpErrorResponse({ status: 500, error: '<html>Bad Gateway</html>' }),
    );

    expect(error.code).toBe('HTTP_500');
    expect(error.message).not.toContain('html');
    expect(error.retriable).toBe(true);
  });

  it('does not mark a thrown mapping bug as retriable', () => {
    const error = toApiError(new TypeError('cannot read property of undefined'));

    expect(error.code).toBe('CLIENT_ERROR');
    expect(error.retriable).toBe(false);
  });
});
