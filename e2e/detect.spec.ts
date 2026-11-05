import { expect, test, type Page } from "@playwright/test";

const desktopOnly = () =>
  test.skip(test.info().project.name === "mobile", "webcam flow is desktop-only");

const panel = (page: Page) =>
  page.locator('section[aria-labelledby="hasil-prediksi"]');
const history = (page: Page) =>
  page.locator('section[aria-labelledby="riwayat"]');

async function waitForRuntime(page: Page) {
  await page.goto("/deteksi");
  await expect(page.getByText("MediaPipe siap")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Model siap")).toBeVisible({ timeout: 45_000 });
}

async function startCamera(page: Page) {
  await page.getByRole("button", { name: "Mulai kamera" }).first().click();
  await expect(page.getByText("Kamera aktif")).toBeVisible();
}

test.describe("detection flow", () => {
  test("classifies the sample hand end to end and records history", async ({
    page,
  }) => {
    desktopOnly();
    await waitForRuntime(page);
    await startCamera(page);

    await expect(panel(page)).toContainText("Prediksi terkunci", {
      timeout: 30_000,
    });
    await expect(panel(page).locator('p[aria-hidden="true"]')).toHaveText("A");
    await expect(panel(page)).toContainText("Huruf A terdeteksi");
    await expect(history(page)).toContainText("A");

    const confidenceLabel = panel(page)
      .getByText("Keyakinan", { exact: true })
      .locator("..");
    const confidenceText = await confidenceLabel.innerText();
    const confidenceValue = Number(confidenceText.match(/(\d+)%/)?.[1]);
    expect(confidenceValue).toBeGreaterThanOrEqual(60);

    await page.getByRole("button", { name: "Hentikan kamera" }).click();
    await expect(page.getByText("Kamera nonaktif")).toBeVisible();
  });

  test("does not commit a letter when the confidence threshold is too high", async ({
    page,
  }) => {
    desktopOnly();
    await waitForRuntime(page);

    await page.getByText("Pengaturan", { exact: true }).click();
    await page.locator("#threshold").focus();
    await page.locator("#threshold").press("End");
    await expect(panel(page)).toContainText("90%");

    await startCamera(page);
    await expect(panel(page)).toContainText("Gestur belum dikenali", {
      timeout: 30_000,
    });
    await expect(panel(page).locator('p[aria-hidden="true"]')).toHaveText("—");
    await expect(history(page)).toContainText("Belum ada huruf yang terkunci");
    await expect(panel(page)).not.toContainText("Prediksi terkunci");
  });

  test("reports a waiting state when no hand is in frame", async ({ page }) => {
    desktopOnly();
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext("2d")!;
        const paint = () => {
          context.fillStyle = "#6f6a60";
          context.fillRect(0, 0, canvas.width, canvas.height);
          requestAnimationFrame(paint);
        };
        paint();
        return canvas.captureStream(30);
      };
    });

    await waitForRuntime(page);
    await startCamera(page);

    await expect(panel(page)).toContainText("Menunggu tangan", {
      timeout: 30_000,
    });
    await expect(panel(page).locator("dd").first()).toHaveText("0");
    await expect(page.getByText("Kamera aktif")).toBeVisible();
  });

  test("surfaces a denied camera permission", async ({ page }) => {
    desktopOnly();
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
    });

    await waitForRuntime(page);
    await page.getByRole("button", { name: "Mulai kamera" }).first().click();

    const alert = page.getByRole("alert").filter({
      hasText: "Izin kamera ditolak",
    });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Coba lagi");
    await expect(page.getByText("Kamera nonaktif")).toBeVisible();
  });

  test("shows an error state when the ONNX model is unavailable", async ({
    page,
  }) => {
    desktopOnly();
    await page.route("**/models/model.onnx", (route) => route.abort());

    await page.goto("/deteksi");
    const alert = page.getByRole("alert").filter({
      hasText: "Model klasifikasi gagal dimuat",
    });
    await expect(alert).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Model gagal")).toBeVisible();
  });

  test("releases the camera when navigating away", async ({ page }) => {
    desktopOnly();
    await waitForRuntime(page);
    await startCamera(page);

    await page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Panduan", exact: true })
      .click();
    await expect(page).toHaveURL(/\/panduan$/);

    await page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Deteksi", exact: true })
      .click();
    await expect(page).toHaveURL(/\/deteksi$/);
    await expect(page.getByText("Kamera nonaktif")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mulai kamera" }).first(),
    ).toBeVisible();
  });
});
