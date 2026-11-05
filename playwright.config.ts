import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fakeVideo = fileURLToPath(
  new URL("./tests/fixtures/hand-A.mjpeg", import.meta.url),
);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    permissions: ["camera"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // The `chromium` channel uses the full browser build, which is required
      // by the fake video capture device.
      channel: "chromium",
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-video-capture=${fakeVideo}`,
      ],
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
