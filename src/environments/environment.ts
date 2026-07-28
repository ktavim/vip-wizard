import { Environment } from './environment.model';

/**
 * Production environment. Replaced by `environment.development.ts` for dev builds via
 * `fileReplacements` in angular.json — note the replacement runs on the *development*
 * configuration, since `defaultConfiguration` is `production`.
 */
export const environment: Environment = {
  production: true,
  inventoryApi: {
    // The `/api` suffix is part of the service's own mount point
    // (`include_router(router, prefix="/api")`), not a gateway concern — production talks
    // to the host directly, so nothing else adds it. In dev the suffix is invisible here
    // because proxy.conf.json rewrites `^/api/inventory` to `/api`; that rewrite is why a
    // missing prefix survives every local run and only 404s once deployed.
    baseUrl: 'https://inventory-api.prd.k8s/api',
    useFake: false,
  },
  deploymentApi: {
    baseUrl: 'https://deployment-api.prd.k8s',
    useFake: true,
  },
};
