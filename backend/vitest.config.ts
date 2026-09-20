import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Points the store's sqlite connection at an isolated in-memory database
    // instead of the real dev data file — see INTERNEZ_DB_PATH in db/database.ts.
    env: { INTERNEZ_DB_PATH: ":memory:" },
  },
});
