import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { authInterceptor } from './lib/api/auth-interceptor';
import { fakeBackendInterceptor } from './lib/fake/fake-backend';

/**
 * The fake backend is registered only when some service is actually faked, so a
 * misconfigured production build cannot serve fabricated data. Note this guards *behavior*,
 * not bundle size — the static import means `lib/fake/` still ships until it is deleted
 * outright at cutover.
 */
const FAKE_INTERCEPTORS =
  environment.inventoryApi.useFake || environment.deploymentApi.useFake
    ? [fakeBackendInterceptor]
    : [];
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  LucideAngularModule,
  Network,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Server,
  Trash2,
  X,
} from 'lucide-angular';

import { routes } from './app.routes';

const LUCIDE_ICONS = {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Network,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Server,
  Trash2,
  X,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Order matters: the fake runs after authInterceptor so faked requests carry the same
    // headers a real request would, and short-circuits before reaching the network.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, ...FAKE_INTERCEPTORS])),
    importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
  ],
};
