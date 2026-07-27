import { seedVipNames, vipNameFromHost } from './vip-name';

/**
 * The seed names are what the user sees before they touch anything, and a name that collides
 * or comes out empty only surfaces at deploy time as an F5 object-name error. Pure functions,
 * so no TestBed.
 */

describe('vipNameFromHost', () => {
  it('pascal-cases the labels of a plain hostname', () => {
    expect(vipNameFromHost('api.salesforce.com')).toBe('ApiSalesforce');
    expect(vipNameFromHost('login.microsoftonline.com')).toBe('LoginMicrosoftonline');
  });

  it('strips any public TLD, not just .com', () => {
    expect(vipNameFromHost('tax-service.gov')).toBe('TaxService');
    expect(vipNameFromHost('metrics.acme.io')).toBe('MetricsAcme');
    expect(vipNameFromHost('billing.example.co.uk')).toBe('BillingExample');
    expect(vipNameFromHost('gateway.bank.co.il')).toBe('GatewayBank');
  });

  it('keeps private-network suffixes, which say the VIP is inside the perimeter', () => {
    expect(vipNameFromHost('vault.hashicorp.internal')).toBe('VaultHashicorpInternal');
    expect(vipNameFromHost('hr.internal.corp')).toBe('HrInternalCorp');
    expect(vipNameFromHost('printer.office.local')).toBe('PrinterOfficeLocal');
  });

  it('drops www only as a prefix and a TLD only as a suffix', () => {
    expect(vipNameFromHost('www.stripe.com')).toBe('Stripe');
    expect(vipNameFromHost('com.example.www')).toBe('ComExampleWww');
  });

  it('breaks words on dashes and underscores as well as dots', () => {
    expect(vipNameFromHost('tax-service.internal')).toBe('TaxServiceInternal');
    expect(vipNameFromHost('data_pipeline.internal')).toBe('DataPipelineInternal');
  });

  it('normalizes the case of the host and keeps digits attached to their label', () => {
    expect(vipNameFromHost('S3.AmazonAWS.com')).toBe('S3Amazonaws');
  });

  it('never strips the last label standing, so bare internal hostnames survive', () => {
    expect(vipNameFromHost('salesforce.com')).toBe('Salesforce');
    expect(vipNameFromHost('jenkins')).toBe('Jenkins');
    // Two letters, and `db` happens to be a ccTLD — stripping it would leave nothing.
    expect(vipNameFromHost('db')).toBe('Db');
  });

  it('returns empty when nothing survives, leaving the fallback to the caller', () => {
    expect(vipNameFromHost('www')).toBe('');
    expect(vipNameFromHost('...')).toBe('');
    expect(vipNameFromHost('')).toBe('');
  });
});

describe('seedVipNames', () => {
  const fallback = (i: number) => `payroll-gateway-vip-${i + 1}`;

  it('names each VIP after its one host', () => {
    expect(seedVipNames(['api.adp.com', 'hr.internal.corp'], fallback)).toEqual([
      'ApiAdp',
      'HrInternalCorp',
    ]);
  });

  it('suffixes collisions so no two VIPs share a name', () => {
    expect(seedVipNames(['stripe.com', 'www.stripe.co.uk', 'STRIPE.io'], fallback)).toEqual([
      'Stripe',
      'Stripe2',
      'Stripe3',
    ]);
  });

  it('falls back to the positional name for a host that reduces to nothing', () => {
    expect(seedVipNames(['api.adp.com', 'www'], fallback)).toEqual([
      'ApiAdp',
      'payroll-gateway-vip-2',
    ]);
  });
});
