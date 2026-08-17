# GPS Shops web application

Production builds default to the root path and the production API origin.
Non-production deployments can configure both without editing application
endpoint strings:

```bash
VITE_APP_BASE=/gpsshops-live/ \
VITE_API_ORIGIN=https://stage-web.gpsshops.com \
npm run build -- --mode staging
```

`VITE_API_ORIGIN` must be an HTTPS origin without a path. The build rewrites
legacy `https://web.gpsshops.com` API-origin literals before bundling, while
production builds retain the existing origin by default.

TODO: Document your project here
