const glob = require('glob');
const macros = require('unplugin-parcel-macros');

// Create a single instance of the plugin that's shared between server and client builds.
let plugin = macros.webpack();

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@adobe/react-spectrum', '@react-spectrum/*', '@spectrum-icons/*'].flatMap(
    spec => glob.sync(`${spec}`, { cwd: 'node_modules/' })
  ),

  webpack(config) {
    config.plugins.push(plugin);
    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
