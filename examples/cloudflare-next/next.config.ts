import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  serverExternalPackages: ['cloudflare:workers'],

  /* config options here */
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // The IgnorePlugin for node: built-ins is still a good practice
      // for Cloudflare Workers environment.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:/, // ignore node specific modules like fs, path, etc
        })
      );
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^cloudflare:/, // ignore node specific modules like fs, path, etc
        })
      );
    }
    return config;
  },
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
// This shim is important for OpenNext to polyfill Cloudflare context during dev and build.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
