import { HostDto } from '../api/dto';

/**
 * Seed data for the fake backend, in **wire shape** rather than domain shape — the fake is
 * standing in for a server, so it should speak the server's language and exercise the
 * mappers on every request.
 *
 * Deleted wholesale when the real Inventory API lands.
 */
export interface FakeApp {
  id: string;
  name: string;
  owner_ad_group: string;
  submitted_scan_id: string;
  submitted_at: string | null;
  submitted_by: string | null;
  hosts: HostDto[];
}

/**
 * Timestamps are fixed strings, not `new Date()`. A fake that changes what it returns
 * between page loads makes every "did that render right?" question ambiguous.
 *
 * `identity-broker` deliberately carries null submission metadata — the server declares
 * those two optional, so at least one row here has to actually exercise the null path.
 */
export const FAKE_APPS: readonly FakeApp[] = [
  {
    id: 'payroll-gateway',
    name: 'payroll-gateway',
    owner_ad_group: 'CORP-PAYROLL-ENG',
    submitted_scan_id: 'scan-8f21c04a',
    submitted_at: '2026-06-14T09:32:11Z',
    submitted_by: 'dhalpern',
    hosts: [
      { host: 'api.adp.com', auth_method: 'oauth' },
      { host: 'hr.internal.corp', auth_method: 'kerberos' },
      { host: 'tax-service.gov', auth_method: 'mtls' },
    ],
  },
  {
    id: 'crm-sync-engine',
    name: 'crm-sync-engine',
    owner_ad_group: 'CORP-REVOPS-PLATFORM',
    submitted_scan_id: 'scan-1b7de933',
    submitted_at: '2026-06-28T16:04:57Z',
    submitted_by: 'akaplan',
    hosts: [
      { host: 'api.salesforce.com', auth_method: 'oauth' },
      { host: 'api.stripe.com', auth_method: 'bearer' },
      { host: 'hooks.slack.com', auth_method: 'none' },
      { host: 'analytics.datadog.com', auth_method: 'apikey' },
      { host: 'vault.hashicorp.internal', auth_method: 'kerberos' },
    ],
  },
  {
    id: 'identity-broker',
    name: 'identity-broker',
    owner_ad_group: 'CORP-IAM-CORE',
    submitted_scan_id: 'scan-4c09ae15',
    submitted_at: null,
    submitted_by: null,
    hosts: [
      { host: 'login.microsoftonline.com', auth_method: 'oauth' },
      { host: 'ldap.corp.internal', auth_method: 'kerberos' },
    ],
  },
  {
    id: 'data-pipeline-orchestrator',
    name: 'data-pipeline-orchestrator',
    owner_ad_group: 'CORP-DATA-INFRA',
    submitted_scan_id: 'scan-72fbb680',
    submitted_at: '2026-07-02T11:47:03Z',
    submitted_by: 'rmoreau',
    hosts: [
      { host: 'kafka.streaming.internal', auth_method: 'mtls' },
      { host: 's3.amazonaws.com', auth_method: 'apikey' },
      { host: 'elastic.observability.corp', auth_method: 'kerberos' },
      { host: 'grafana.monitoring.internal', auth_method: 'none' },
    ],
  },
];

export function findFakeApp(appId: string): FakeApp | undefined {
  return FAKE_APPS.find((app) => app.id === appId);
}
