import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/deteksi", "/panduan", "/model", "/tentang", "/404"];

test.describe("responsive layout", () => {
  test("no route causes horizontal page overflow", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewport,
        };
      });
      expect(
        overflow.scrollWidth,
        `${route} overflows by ${overflow.scrollWidth - overflow.viewport}px`,
      ).toBeLessThanOrEqual(overflow.viewport + 2);
    }
  });

  test("mobile camera controls and prediction panel stay usable", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "mobile", "mobile-only layout check");

    await page.goto("/deteksi");
    await expect(page.getByText("MediaPipe siap")).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("button", { name: "Mulai kamera" }).first().click();
    await expect(page.getByText("Kamera aktif")).toBeVisible();
    await expect(
      page.locator('section[aria-labelledby="hasil-prediksi"]'),
    ).toBeVisible();

    const box = await page
      .getByRole("button", { name: "Hentikan kamera" })
      .boundingBox();
    expect(box?.width).toBeGreaterThan(40);
  });
});
