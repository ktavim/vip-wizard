import { seedVipNames, vipNameFromHost } from './vip-name';

/**
 * The seed names are what the user sees before they touch anything, and a name that collides
 * or comes out empty only surfaces at deploy time as an F5 object-name error. Pure functions,
 * so no TestBed.
 */

describe('vipNameFromHost', () => {
  it('camel-cases the labels of a plain hostname', () => {
    expect(vipNameFromHost('api.salesforce.com')).toBe('apiSalesforce');
    expect(vipNameFromHost('login.microsoftonline.com')).toBe('loginMicrosoftonline');
  });

  it('strips any public TLD, not just .com', () => {
    expect(vipNameFromHost('tax-service.gov')).toBe('taxService');
    expect(vipNameFromHost('metrics.acme.io')).toBe('metricsAcme');
    expect(vipNameFromHost('billing.example.co.uk')).toBe('billingExample');
    expect(vipNameFromHost('gateway.bank.co.il')).toBe('gatewayBank');
  });

  it('keeps private-network suffixes, which say the VIP is inside the perimeter', () => {
    expect(vipNameFromHost('vault.hashicorp.internal')).toBe('vaultHashicorpInternal');
    expect(vipNameFromHost('hr.internal.corp')).toBe('hrInternalCorp');
    expect(vipNameFromHost('printer.office.local')).toBe('printerOfficeLocal');
  });

  it('drops www only as a prefix and a TLD only as a suffix', () => {
    expect(vipNameFromHost('www.stripe.com')).toBe('stripe');
    expect(vipNameFromHost('com.example.www')).toBe('comExampleWww');
  });

  it('breaks words on dashes and underscores as well as dots', () => {
    expect(vipNameFromHost('tax-service.internal')).toBe('taxServiceInternal');
    expect(vipNameFromHost('data_pipeline.internal')).toBe('dataPipelineInternal');
  });

  it('lowercases and keeps digits attached to their label', () => {
    expect(vipNameFromHost('S3.AmazonAWS.com')).toBe('s3Amazonaws');
  });

  it('never strips the last label standing, so bare internal hostnames survive', () => {
    expect(vipNameFromHost('salesforce.com')).toBe('salesforce');
    expect(vipNameFromHost('jenkins')).toBe('jenkins');
    // Two letters, and `db` happens to be a ccTLD — stripping it would leave nothing.
    expect(vipNameFromHost('db')).toBe('db');
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
      'apiAdp',
      'hrInternalCorp',
    ]);
  });

  it('suffixes collisions so no two VIPs share a name', () => {
    expect(seedVipNames(['stripe.com', 'www.stripe.co.uk', 'STRIPE.io'], fallback)).toEqual([
      'stripe',
      'stripe2',
      'stripe3',
    ]);
  });

  it('falls back to the positional name for a host that reduces to nothing', () => {
    expect(seedVipNames(['api.adp.com', 'www'], fallback)).toEqual([
      'apiAdp',
      'payroll-gateway-vip-2',
    ]);
  });
});
