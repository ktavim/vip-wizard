import { HttpRequest } from '@angular/common/http';
import { AppSummaryDto, HostDto } from '../api/dto';
import { FAKE_APPS, findFakeApp } from './fake-db';
import { httpException, FakeHandler } from './fake-http';

/**
 * Fake implementation of the Inventory API.
 * Delete this file when the real Inventory API goes live.
 *
 * Takes no `FakeControls` — latency and forced failures are applied by the interceptor for
 * every service uniformly, and these two endpoints need no per-handler knobs.
 */
export function inventoryHandlers(): FakeHandler[] {
  return [
    {
      endpoint: 'apps',
      matches: (req, path) => req.method === 'GET' && path === '/apps/submitted',
      handle: (): AppSummaryDto[] =>
        FAKE_APPS.map((app) => ({
          id: app.id,
          name: app.name,
          owner_ad_group: app.owner_ad_group,
          submitted_scan_id: app.submitted_scan_id,
          submitted_at: app.submitted_at,
          submitted_by: app.submitted_by,
          // The one field the seed data doesn't state outright: the server derives it, so
          // the fake derives it too rather than letting the two drift apart by hand.
          service_count: app.hosts.length,
        })),
    },
    {
      endpoint: 'hosts',
      matches: (req, path) => req.method === 'GET' && /^\/apps\/[^/]+\/services$/.test(path),
      handle: (_req: HttpRequest<unknown>, path: string): HostDto[] => {
        const appId = decodeURIComponent(path.split('/')[2]);
        const app = findFakeApp(appId);

        // The real service 404s here, and the old code path (`MOCK_APP_DATA[appName]`)
        // silently produced undefined. Surfacing it is part of the point.
        if (!app) {
          throw httpException(404, `No application with id '${appId}'.`);
        }

        return app.hosts;
      },
    },
  ];
}
