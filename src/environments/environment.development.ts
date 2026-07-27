import { Environment } from './environment.model';

/**
 * Development environment. Both services are faked by default — flip an individual
 * `useFake` to `false` once that service is reachable.
 */
export const environment: Environment = {
  production: false,
  inventoryApi: {
    baseUrl: '/api/inventory',
    useFake: true,
  },
  deploymentApi: {
    baseUrl: '/api/deployments',
    useFake: true,
  },
};
