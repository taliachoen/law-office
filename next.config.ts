import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 הוא מודול native; חייב לרוץ כמות שהוא ולא להיארז על ידי ה-bundler.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
