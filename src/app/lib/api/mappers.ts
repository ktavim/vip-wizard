import {
  AppSummaryDto,
  DeployRequestDto,
  DeployResultDto,
  DryRunResultDto,
  FindingDto,
  HostDto,
  VipConfigDto,
  VipPayloadDto,
} from './dto';
import {
  AppSummary,
  DeployResult,
  DryRunResult,
  Finding,
  Host,
  Vip,
  VipConfig,
  VipResult,
} from '../models';

/**
 * The wire/domain boundary. Every mismatch between what the servers speak and what the
 * wizard's components want lives in this file and nowhere else — which is why `models.ts`
 * needed almost no changes, and why backend drift after cutover is cheap to absorb.
 *
 * That includes the casing split: both contracts are `snake_case`, the domain is camelCase,
 * and the conversion is written out by hand rather than done by a generic re-caser. A
 * re-caser would make every domain name a *function* of its wire name, so renaming one end
 * would silently move the other — and neither name would be greppable.
 *
 * These are pure functions with no Angular dependency, so they test without TestBed.
 */

// --- Inventory -------------------------------------------------------------

/**
 * Deliberately narrowing: `owner_ad_group`, `submitted_scan_id`, `submitted_at`, and
 * `submitted_by` are dropped on the floor. The picker renders none of them, and a domain
 * field with no reader is a field that rots — it acquires a shape nobody checks and a
 * meaning nobody remembers. Dropping here is exactly what this layer is for.
 */
export function toAppSummaries(dtos: AppSummaryDto[]): AppSummary[] {
  return dtos.map((app) => ({
    id: app.id,
    name: app.name,
    serviceCount: app.service_count,
  }));
}

/**
 * `host` matches on both sides now, so only `auth_method` → `auth` is a real rename. The
 * function stays anyway: it is the seam where a future divergence gets absorbed, and
 * deleting it in favour of a cast would mean the next wire change edits component code.
 */
export function toHost(dto: HostDto): Host {
  return { host: dto.host, auth: dto.auth_method };
}

export function toHosts(dtos: HostDto[]): Host[] {
  return dtos.map(toHost);
}

function toHostDto(host: Host): HostDto {
  return { host: host.host, auth_method: host.auth };
}

// --- Deployment: outbound --------------------------------------------------

/**
 * Empty string is how the config form represents "not set" (see the defaults in
 * `StepConfigureVIPs.ngOnInit`), but on the wire that's a meaningless value for an
 * optional F5 field. Send null.
 */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * `port` is a string in the domain purely because `(input)` handlers produce strings.
 * NaN is passed through rather than coerced to a default — the server validates and
 * reports it as a finding, which is a far better experience than silently deploying 443.
 */
function toVipConfigDto(config: VipConfig): VipConfigDto {
  return {
    ip: config.ip.trim(),
    port: Number.parseInt(config.port, 10),
    protocol: config.protocol,
    ssl_profile: emptyToNull(config.sslProfile),
    default_pool: emptyToNull(config.defaultPool),
    irule: emptyToNull(config.iRule),
  };
}

function toVipPayloadDto(vip: Vip, config: VipConfig): VipPayloadDto {
  return {
    ref: vip.id,
    name: vip.name,
    hosts: vip.hosts.map(toHostDto),
    config: toVipConfigDto(config),
  };
}

/**
 * Builds the body shared by dry-run and deploy. VIPs with no config are skipped rather
 * than sent with defaults — that state shouldn't be reachable from the wizard, and
 * inventing values here would mask the bug if it ever became reachable.
 */
export function toDeployRequest(
  appId: string,
  vips: Vip[],
  configs: Record<string, VipConfig>,
): DeployRequestDto {
  return {
    app_id: appId,
    vips: vips
      .filter((vip) => configs[vip.id] !== undefined)
      .map((vip) => toVipPayloadDto(vip, configs[vip.id])),
  };
}

// --- Deployment: inbound ---------------------------------------------------

/** `ref` on the wire is the client's `Vip.id` coming back — name it as such in the domain. */
function toFinding(dto: FindingDto): Finding {
  return {
    code: dto.code,
    severity: dto.severity,
    message: dto.message,
    vipId: dto.vip_ref,
    field: dto.field,
  };
}

export function toDryRunResult(dto: DryRunResultDto): DryRunResult {
  return {
    outcome: dto.outcome,
    findings: dto.findings.map(toFinding),
  };
}

function toVipResult(dto: {
  vip_ref: string;
  status: string;
  object_path: string | null;
}): VipResult {
  return {
    vipId: dto.vip_ref,
    status: dto.status,
    objectPath: dto.object_path,
  };
}

export function toDeployResult(dto: DeployResultDto): DeployResult {
  return {
    deploymentId: dto.deployment_id,
    status: dto.status,
    vipResults: dto.vip_results.map(toVipResult),
    findings: dto.findings.map(toFinding),
  };
}
