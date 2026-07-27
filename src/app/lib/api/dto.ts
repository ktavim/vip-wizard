/**
 * Wire shapes. Nothing here is used by components —
 * `mappers.ts` converts to and from the domain types in `lib/models.ts`.
 *
 * The domain types stay camelCase because that is what
 * TypeScript reads like and there is no column behind them. The gap between the two is the
 * entire job of `mappers.ts`, which is why it is the only file that spells both names.
 *
 * Keep these honest even where they're awkward (`port` as a number, `null` rather than
 * `''`). The whole point of the split is that wire drift shows up here and in the mappers,
 * not scattered through templates.
 */

/**
 * FastAPI's native error body. Both services raise `HTTPException`, which serializes to
 * `{"detail": ...}` and nothing else — no `title`, no `type`, and crucially no
 * machine-readable code, which is why `ApiError.code` is synthesized from the status.
 *
 * `detail` is `unknown` because FastAPI puts whatever the handler passed there: a string for
 * `HTTPException(status_code=404, detail="…")`, a `ValidationErrorDto[]` for the automatic
 * 422, or an arbitrary JSON object if a handler passes a dict.
 */
export interface HttpExceptionDto {
  detail: unknown;
}

/**
 * One entry in the `detail` array of FastAPI's automatic 422. Emitted by Pydantic when the
 * request body fails validation, so reaching one means *we* sent a bad payload.
 */
export interface ValidationErrorDto {
  /** Path to the offending input, e.g. `['body', 'vips', 0, 'config', 'ip']`. */
  loc: (string | number)[];
  msg: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Inventory API
// ---------------------------------------------------------------------------

/**
 * A row from `GET /apps/submitted` — apps whose scan has been submitted for onboarding,
 * which is why every row drags its submission provenance along with it.
 *
 * Wider than the picker needs: `toAppSummaries` keeps `id`, `name`, and `service_count`
 * and drops the rest. Recorded in full anyway, because this file is the record of what the
 * server sends, not of what the UI happens to read this week — and because promoting a
 * dropped field is then one line here and one in `AppSummary`, with no re-inspection of
 * the response.
 */
export interface AppSummaryDto {
  id: string;
  name: string;
  /** Owning AD *group*, not a person — don't render it as if it were a username. */
  owner_ad_group: string;
  /** The scan whose submission put this app in the list. */
  submitted_scan_id: string;
  /**
   * `Optional[str] = None` server-side, which FastAPI serializes as an explicit `null`, so
   * the key is present and the value is missing — not the other way round. Hence
   * `string | null` rather than `?:`.
   *
   * The format is server-authored and unvalidated by any contract we hold; treat it as
   * opaque until something actually renders it, then parse it at that boundary.
   */
  submitted_at: string | null;
  submitted_by: string | null;
  service_count: number;
}

/**
 * Used in both directions and by both services: inbound from the Inventory API's
 * `/apps/{id}/services`, and outbound inside `VipPayloadDto.hosts`. That is only sound
 * while the two services agree on the shape — if they ever diverge, split this in two
 * rather than widening it to satisfy both.
 */
export interface HostDto {
  host: string;
  /**
   * Deliberately an open string, not the closed `AuthMethod` union. The server will grow
   * auth methods faster than this app ships; rendering already degrades safely via the
   * `??` fallback in `authColor()`.
   */
  auth_method: string;
}

// ---------------------------------------------------------------------------
// Deployment API
// ---------------------------------------------------------------------------

export interface VipConfigDto {
  ip: string;
  port: number;
  protocol: string;
  ssl_profile: string | null;
  default_pool: string | null;
  irule: string | null;
}

export interface VipPayloadDto {
  /** Echo of the client-side `Vip.id` (`"vip-0"`). A correlation key; never persisted. */
  ref: string;
  name: string;
  hosts: HostDto[];
  config: VipConfigDto;
}

/** Request body shared by both `/deployments/dry-run` and `/deployments`. */
export interface DeployRequestDto {
  app_id: string;
  vips: VipPayloadDto[];
}

export type FindingSeverityDto = 'info' | 'warning' | 'error';

export interface FindingDto {
  code: string;
  severity: FindingSeverityDto;
  message: string;
  /** Correlates to `VipPayloadDto.ref`. Null for findings about the request as a whole. */
  vip_ref: string | null;
  /** Dotted path, e.g. `config.irule`. Null when not field-specific. */
  field: string | null;
}

export type DryRunOutcomeDto = 'pass' | 'warn' | 'fail';

export interface DryRunResultDto {
  /**
   * Sent explicitly rather than derived client-side from max severity — the server owns
   * gating policy, and we don't want that logic duplicated here.
   */
  outcome: DryRunOutcomeDto;
  findings: FindingDto[];
}

export type DeployStatusDto = 'succeeded' | 'failed' | 'in_progress';

export interface VipResultDto {
  vip_ref: string;
  status: string;
  object_path: string | null;
}

export interface DeployResultDto {
  deployment_id: string;
  /**
   * `in_progress` is accepted by the contract from day one so that switching to
   * `202` + polling later is an additive change rather than a breaking one. The client
   * does not poll today.
   */
  status: DeployStatusDto;
  vip_results: VipResultDto[];
  findings: FindingDto[];
}
