import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Base URLs are injected rather than imported directly from `environment` so services stay
 * trivially testable (override the token in TestBed, no module mocking), and so the
 * two-service split is visible at every injection site.
 */
export const INVENTORY_API_BASE_URL = new InjectionToken<string>('INVENTORY_API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.inventoryApi.baseUrl,
});

export const DEPLOYMENT_API_BASE_URL = new InjectionToken<string>('DEPLOYMENT_API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.deploymentApi.baseUrl,
});

/**
 * Every origin the app is allowed to attach credentials to. The auth interceptor matches
 * against this list rather than attaching unconditionally — an interceptor that adds a
 * bearer token to *every* outbound request leaks it to any third-party URL the app ever
 * fetches. Keep this in sync when a service is added.
 */
export const CREDENTIALED_API_BASE_URLS: readonly string[] = [
  environment.inventoryApi.baseUrl,
  environment.deploymentApi.baseUrl,
];
