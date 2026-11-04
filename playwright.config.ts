import { defineConfig, devices } from "@playwright/test";

const PORT = 3456;

/** End-to-end tests against the production (standalone) build: `bun run test:e2e`. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "bun run start:standalone",
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1", REDIS_URL: "" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
