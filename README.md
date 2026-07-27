# Fast & Furious — F5 BIG-IP VIP Configurator

An Angular 21 app: a four-step wizard for assigning external hosts to F5 BIG-IP
virtual servers (VIPs) and configuring them for deployment. 

## Stack

- **Angular 21** (standalone components, **zoneless** change detection, signals)
- **Angular Router** — `/` → Dashboard, `**` → NotFound
- **Angular CDK** `drag-drop` — host-to-VIP assignment (Step 2)
- **Tailwind CSS v3** — theme tokens in `src/styles.css`, config in `tailwind.config.js`
- **lucide-angular** — icons (registered in `app.config.ts`, rendered via `[img]`)


## Layout

```
src/app/
  app.ts, app.config.ts, app.routes.ts   # bootstrap, providers, routes
  lib/          # models, mock data, cn() helper, IPv4 validator
  ui/           # button, input, label, select
  wizard/       # WizardProgress + the 4 steps + HostChip / VipCard
  pages/        # Dashboard (wizard shell) + NotFound
```

## Backends

The app talks to two independent services.

### Running against the Inventory API

1. Start the service.
2. Set `inventoryApi.useFake: false` in `src/environments/environment.development.ts`.
3. `npm start`. `proxy.conf.json` forwards `/api/inventory` to `127.0.0.1:8000`.

> In production the app talks to two distinct hosts
> (`https://inventory-api.prd.k8s`, `https://deployment-api.prd.k8s`) directly, with no reverse proxy.

## Notes

- Both backends are faked in-browser by default (`lib/fake/`), intercepting at the
  `HttpClient` layer so the app exercises its real API clients and mappers. Each
  service has its own `useFake` flag in `src/environments/`, so they cut over
  independently.
- State is held in signals; the CDK drag handlers mutate the drop-list arrays and
  then re-set the signals so zoneless/OnPush change detection re-renders.
