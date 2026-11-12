const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/\/+$/, "");
if (basePath && (!basePath.startsWith("/") || basePath === "/" || !/^\/[\w-]+(?:\/[\w-]+)*$/.test(basePath))) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or a path such as /lambert-admin");
}

const nextConfig = {
  output: "export",
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
