import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const PRODUCTION_API_ORIGIN = "https://web.gpsshops.com";

function apiOriginPlugin(apiOrigin: string): Plugin {
  const normalizedOrigin = apiOrigin.replace(/\/$/, "");

  return {
    name: "gpsshops-api-origin",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/src/") || !/\.[jt]sx?$/.test(id)) return null;

      const transformed = code
        .replaceAll(`${PRODUCTION_API_ORIGIN}/`, `${normalizedOrigin}/`)
        .replaceAll(PRODUCTION_API_ORIGIN, normalizedOrigin);

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = (env.VITE_API_ORIGIN || PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  const appBase = env.VITE_APP_BASE || "/";

  if (!/^https:\/\/[^/]+$/.test(apiOrigin)) {
    throw new Error("VITE_API_ORIGIN must be an HTTPS origin without a path");
  }

  if (!/^\/.*\/$/.test(appBase)) {
    throw new Error("VITE_APP_BASE must start and end with a slash");
  }

  return {
  base: appBase,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [apiOriginPlugin(apiOrigin), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  };
});
