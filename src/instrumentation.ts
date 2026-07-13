export async function register() {
  // Importing this module runs the environment schema validation defined in
  // src/lib/env.ts, so a misconfigured deployment fails at startup rather
  // than on the first request that happens to touch process.env.
  await import("@/lib/env");
}
