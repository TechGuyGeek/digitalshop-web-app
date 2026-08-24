/**
 * Build provenance sent to the canonical API by every Web auth operation.
 *
 * Staging/CI can provide VITE_APP_VERSION; the package version remains the
 * deterministic local-development fallback.  Keeping this in one module
 * prevents login and registration from drifting apart.
 */
import packageJson from "../../package.json";

export const WEB_CLIENT = "web" as const;
export const WEB_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || packageJson.version;
