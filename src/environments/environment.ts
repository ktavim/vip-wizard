import { Environment } from './environment.model';

/**
 * Production environment. Replaced by `environment.development.ts` for dev builds via
 * `fileReplacements` in angular.json — note the replacement runs on the *development*
 * configuration, since `defaultConfiguration` is `production`.
 */
export const environment: Environment = {
  production: true,
  inventoryApi: {
    baseUrl: 'https://inventory-api.prd.k8s',
    useFake: false,
  },
  deploymentApi: {
    baseUrl: 'https://deployment-api.prd.k8s',
    useFake: true,
  },
};
