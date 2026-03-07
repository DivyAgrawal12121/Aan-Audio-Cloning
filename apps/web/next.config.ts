import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@resound-studio/api", "@resound-studio/ui", "@resound-studio/shared"],
};

export default nextConfig;
