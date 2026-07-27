import { HttpRequest } from '@angular/common/http';
import {
  DeployRequestDto,
  DeployResultDto,
  DryRunOutcomeDto,
  DryRunResultDto,
  FindingDto,
  VipPayloadDto,
} from '../api/dto';
import { findFakeApp } from './fake-db';
import { FakeControls } from './fake-controls';
import { httpException, validationError, FakeHandler } from './fake-http';

/**
 * Fake implementation of the Deployment API.
 * Delete this file when the real Deployment API goes live.
 */

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isValidIpv4(value: string): boolean {
  const match = IPV4.exec(value);
  return match !== null && match.slice(1).every((octet) => Number(octet) <= 255);
}

/** Reproduces the original client-side check: more than one distinct auth method on one VIP. */
function hasMixedAuth(vip: VipPayloadDto): boolean {
  return new Set(vip.hosts.map((host) => host.auth_method)).size > 1;
}

/**
 * Server-side validation, standing in for what F5 would reject. Deliberately real enough
 * that `outcome: 'fail'` is reachable by typing a bad IP — the deploy gate should be
 * exercisable without reaching for `?fake_dryrun=fail`.
 */
function validate(vips: VipPayloadDto[]): FindingDto[] {
  const findings: FindingDto[] = [];

  for (const vip of vips) {
    if (!isValidIpv4(vip.config.ip)) {
      findings.push({
        code: 'INVALID_VIRTUAL_IP',
        severity: 'error',
        message: `'${vip.config.ip || '(empty)'}' is not a valid IPv4 address.`,
        vip_ref: vip.ref,
        field: 'config.ip',
      });
    }

    // The mapper sends an unparseable port through as NaN, which serializes to null rather
    // than being silently defaulted to 443. This is where that surfaces to the user.
    const port = vip.config.port;
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      findings.push({
        code: 'INVALID_PORT',
        severity: 'error',
        message: 'Port must be a whole number between 1 and 65535.',
        vip_ref: vip.ref,
        field: 'config.port',
      });
    }

    if (hasMixedAuth(vip)) {
      findings.push({
        code: 'MIXED_AUTH_METHODS',
        severity: 'warning',
        message: 'Mixed auth methods detected — verify F5 policy profile compatibility.',
        vip_ref: vip.ref,
        field: null,
      });
    }
  }

  if (findings.some((f) => f.code === 'MIXED_AUTH_METHODS')) {
    findings.push({
      code: 'MANUAL_IRULE_VERIFICATION',
      severity: 'info',
      message: 'Deployment will proceed, but manual iRule verification is recommended.',
      vip_ref: null,
      field: null,
    });
  }

  return findings;
}

function outcomeFor(findings: FindingDto[]): DryRunOutcomeDto {
  if (findings.some((f) => f.severity === 'error')) return 'fail';
  if (findings.some((f) => f.severity === 'warning')) return 'warn';
  return 'pass';
}

function parseRequest(req: HttpRequest<unknown>): DeployRequestDto {
  const body = req.body as DeployRequestDto | null;

  // A shape the route model rejects, so it never reaches the handler: FastAPI answers with
  // its own 422, not an `HTTPException` we raise.
  if (!body || !Array.isArray(body.vips) || body.vips.length === 0) {
    throw validationError([
      {
        loc: ['body', 'vips'],
        msg: 'List should have at least 1 item after validation, not 0',
        type: 'too_short',
      },
    ]);
  }

  if (!findFakeApp(body.app_id)) {
    throw httpException(404, `No application with id '${body.app_id}'.`);
  }

  return body;
}

export function deploymentHandlers(controls: FakeControls): FakeHandler[] {
  return [
    {
      endpoint: 'dry-run',
      matches: (req, path) => req.method === 'POST' && path === '/deployments/dry-run',
      handle: (req): DryRunResultDto => {
        const body = parseRequest(req);
        const findings = validate(body.vips);

        // Note the forced outcome overrides the verdict but keeps the real findings, so the
        // UI is exercised with a mismatched pair on purpose — the client must trust
        // `outcome` rather than re-deriving it from severities.
        return {
          outcome: controls.forcedDryRunOutcome() ?? outcomeFor(findings),
          findings,
        };
      },
    },
    {
      endpoint: 'deploy',
      matches: (req, path) => req.method === 'POST' && path === '/deployments',
      handle: (req): DeployResultDto => {
        const body = parseRequest(req);

        if (!req.headers.has('Idempotency-Key')) {
          throw httpException(400, 'POST /deployments requires an Idempotency-Key header.');
        }

        const findings = validate(body.vips);
        if (findings.some((f) => f.severity === 'error')) {
          throw httpException(
            400,
            'Configuration is invalid. Run a dry run and resolve the reported errors before deploying.',
          );
        }

        return {
          deployment_id: `dep_fake_${body.app_id}`,
          status: 'succeeded',
          vip_results: body.vips.map((vip) => ({
            vip_ref: vip.ref,
            status: 'created',
            object_path: `/Common/${vip.name}`,
          })),
          findings: findings.filter((f) => f.severity !== 'error'),
        };
      },
    },
  ];
}
