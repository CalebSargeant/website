import type { ExpoConfig } from "expo/config";

// New Architecture ON. API base URL is configuration via EXPO_PUBLIC_*.
const config: ExpoConfig = {
  name: "calebsargeant.com",
  slug: "calebsargeant-website",
  scheme: "calebsargeant",
  version: "0.1.0",
  orientation: "portrait",
  newArchEnabled: true,
  ios: { supportsTablet: true, bundleIdentifier: "com.calebsargeant.website" },
  android: { package: "com.calebsargeant.website" },
  plugins: ["expo-router"],
  experiments: { typedRoutes: true },
};

export default config;
