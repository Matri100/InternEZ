import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Requires DATABASE_URL in the environment, pointing at a real Postgres
    // instance to test against — a local one, or DATABASE_SSL=disable
    // against a plain CI service container (see .github/workflows/ci.yml).
    // globalSetup truncates every table first, so each test run starts from
    // a clean slate the way the old SQLite :memory: database did for free.
    globalSetup: "./vitest.globalSetup.ts",
  },
});
