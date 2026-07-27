/**
 * Per-service API configuration.
 *
 * The inventory and deployment APIs are separate backends,
 * so each carries its own `useFake` flag. Setting one to `false`
 * while the other stays `true` runs the app against one live service and one faked —
 * which is how each cutover gets verified in isolation.
 */
export interface ApiServiceConfig {
  readonly baseUrl: string;
  /** When true, requests to `baseUrl` are short-circuited by the fake backend interceptor. */
  readonly useFake: boolean;
}

export interface Environment {
  readonly production: boolean;
  /** Apps and hosts. Read path. */
  readonly inventoryApi: ApiServiceConfig;
  /** Dry run and deploy. F5 write path. */
  readonly deploymentApi: ApiServiceConfig;
}
