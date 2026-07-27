import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DEPLOYMENT_API_BASE_URL } from './api-config';
import { DeployResultDto, DryRunResultDto } from './dto';
import { ApiResult, request } from './http-api';
import { toDeployResult, toDeployRequest, toDryRunResult } from './mappers';
import { DeployResult, DryRunResult, Vip, VipConfig } from '../models';

/**
 * Both calls are commands rather than reactive reads, so they are plain promises returning
 * `ApiResult` — `httpResource` would be the wrong shape here.
 */
@Injectable({ providedIn: 'root' })
export class DeploymentsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(DEPLOYMENT_API_BASE_URL);

  /**
   * Validates without applying. Note that a `fail` verdict arrives as a **200** with
   * `outcome: 'fail'`, not an HTTP error — user-fixable problems are findings, and the
   * `{ ok: false }` branch means only that the request itself did not complete.
   */
  dryRun(
    appId: string,
    vips: Vip[],
    configs: Record<string, VipConfig>,
  ): Promise<ApiResult<DryRunResult>> {
    const body = toDeployRequest(appId, vips, configs);
    const url = `${this.baseUrl}/deployments/dry-run`;
    return request(this.http.post<DryRunResultDto>(url, body), toDryRunResult);
  }

  /**
   * Applies the configuration.
   *
   * `idempotencyKey` must be stable across retries of the same configuration — that is what
   * stops a retry after a network timeout from double-creating VIPs on the F5. The caller
   * owns the key's lifetime; see `StepReviewDeploy`.
   */
  deploy(
    appId: string,
    vips: Vip[],
    configs: Record<string, VipConfig>,
    idempotencyKey: string,
  ): Promise<ApiResult<DeployResult>> {
    const body = toDeployRequest(appId, vips, configs);
    const url = `${this.baseUrl}/deployments`;
    return request(
      this.http.post<DeployResultDto>(url, body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      toDeployResult,
    );
  }
}
