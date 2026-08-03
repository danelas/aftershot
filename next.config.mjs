/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion + its bundler are worker-only; keep them out of the Next build.
  serverExternalPackages: ['@remotion/renderer', '@remotion/bundler'],

  // Both hosts served the app, so a signup started on www built its Stripe
  // return_url on www too — a second origin to register with Stripe and to
  // debug. Pin everything to the apex.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{type: 'host', value: 'www.theaftershot.com'}],
        destination: 'https://theaftershot.com/:path*',
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
