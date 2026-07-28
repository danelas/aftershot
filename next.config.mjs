/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion + its bundler are worker-only; keep them out of the Next build.
  serverExternalPackages: ['@remotion/renderer', '@remotion/bundler'],
};
export default nextConfig;
