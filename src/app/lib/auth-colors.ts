import { AuthColor, AuthMethod, AuthMethodValue } from './models';

/**
 * Presentational lookup only — no data. Hosts and their auth methods come from the
 * Inventory API; this maps whichever method the server sends onto a Tailwind style.
 */
export const AUTH_COLORS: Record<AuthMethod, AuthColor> = {
  oauth: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'OAuth' },
  bearer: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Bearer' },
  kerberos: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Kerberos' },
  none: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'None' },
  mtls: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'mTLS' },
  apikey: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', label: 'API Key' },
};

/** Falls back to the neutral style for any method this build doesn't know about. */
export function authColor(auth: AuthMethodValue): AuthColor {
  return AUTH_COLORS[auth as AuthMethod] ?? AUTH_COLORS.none;
}
