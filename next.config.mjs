/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep type-checking on (catches real bugs); skip lint so a missing eslint
  // config never blocks a build the night before a deadline.
  eslint: { ignoreDuringBuilds: true },
  // Baileys uses native-ish node deps; keep it out of the bundler so it loads
  // as a normal node_modules require at runtime.
  serverExternalPackages: ["@whiskeysockets/baileys", "pino"],
};

export default nextConfig;
