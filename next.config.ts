import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Excel export library runs as plain Node code on the server.
  serverExternalPackages: ["exceljs", "web-push"],
  // Allows document uploads up to 8 MB (plus form overhead).
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // Allow forms to work through your private Tailscale HTTPS address.
      allowedOrigins: ["*.ts.net"],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
