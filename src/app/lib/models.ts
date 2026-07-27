/** The auth methods this app knows how to style. See `AUTH_COLORS`. */
export type AuthMethod = 'oauth' | 'bearer' | 'kerberos' | 'none' | 'mtls' | 'apikey';

/**
 * Widened so an auth method the server knows about but this build doesn't is carried
 * through instead of being a type error. `authColor()` already degrades to the neutral
 * style via its `??` fallback. The `(string & {})` form keeps autocomplete on the known
 * members rather than collapsing the union to plain `string`.
 */
export type AuthMethodValue = AuthMethod | (string & {});

export interface Host {
  host: string;
  auth: AuthMethodValue;
}

/** One row on the app picker. Carries a count, not the hosts themselves. */
export interface AppSummary {
  id: string;
  name: string;
  serviceCount: number;
}

export interface Vip {
  id: string;
  name: string;
  hosts: Host[];
}

export interface VipConfig {
  ip: string;
  port: string;
  protocol: string;
  sslProfile: string;
  defaultPool: string;
  iRule: string;
}

export interface AuthColor {
  bg: string;
  text: string;
  border: string;
  label: string;
}

/**
 * The complete, persistable state of the "Assign Hosts" step. Held by the Dashboard so it
 * survives the step component being destroyed/recreated on back-and-forth navigation.
 */
export interface AssignState {
  vips: Vip[];
  unassigned: Host[];
  excluded: Host[];
  nextVipId: number;
}

/** Widened like `AuthMethodValue`, for the same reason: a newer server may add severities. */
export type FindingSeverity = 'info' | 'warning' | 'error';
export type FindingSeverityValue = FindingSeverity | (string & {});

/**
 * A single validation result from the deployment API. Rendered by `FindingsPanel` — the
 * messages are server-authored, never hardcoded in templates.
 */
export interface Finding {
  code: string;
  severity: FindingSeverityValue;
  message: string;
  /** The `Vip.id` this concerns, or null when it applies to the request as a whole. */
  vipId: string | null;
  /**
   * Dotted path, e.g. `config.irule`. Server-authored and passed through verbatim, so it
   * names the *wire* field — `config.irule`, not the domain's `config.iRule`.
   * Null when not field-specific.
   */
  field: string | null;
}

export type DryRunOutcome = 'pass' | 'warn' | 'fail';

export interface DryRunResult {
  outcome: DryRunOutcome;
  findings: Finding[];
}

export interface VipResult {
  vipId: string;
  status: string;
  objectPath: string | null;
}

export interface DeployResult {
  deploymentId: string;
  status: 'succeeded' | 'failed' | 'in_progress';
  vipResults: VipResult[];
  findings: Finding[];
}
