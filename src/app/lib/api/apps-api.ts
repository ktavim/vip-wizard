import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { INVENTORY_API_BASE_URL } from './api-config';
import { HostDto } from './dto';
import { ApiResult, request } from './http-api';
import { toHosts } from './mappers';
import { Host } from '../models';

/**
 * Client for the Inventory API.
 *
 * Only the hosts endpoint lives here — the app list is fetched by `StepSelectApp` via
 * `httpResource`, since it is a leaf read with exactly one consumer and benefits from the
 * built-in loading/error signals. This call is imperative because the Dashboard needs to
 * decide whether to advance the wizard based on the outcome.
 */
@Injectable({ providedIn: 'root' })
export class AppsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(INVENTORY_API_BASE_URL);

  getHosts(appId: string): Promise<ApiResult<Host[]>> {
    const url = `${this.baseUrl}/apps/${encodeURIComponent(appId)}/services`;
    return request(this.http.get<HostDto[]>(url), toHosts);
  }
}
