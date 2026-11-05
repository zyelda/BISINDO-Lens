import { expect, test } from "@playwright/test";

const samples = (page: import("@playwright/test").Page) =>
  page.locator('img[alt^="Contoh gestur huruf"]');

test.describe("alphabet guide", () => {
  test("shows 26 real samples and filters static vs motion letters", async ({
    page,
  }) => {
    await page.goto("/panduan");
    await expect(samples(page)).toHaveCount(26);

    await page.getByRole("button", { name: "Statis 24" }).click();
    await expect(page.getByRole("button", { name: "Statis 24" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(samples(page)).toHaveCount(24);

    await page.getByRole("button", { name: "Gerak 2" }).click();
    await expect(samples(page)).toHaveCount(2);
    await expect(page.getByText("J", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Z", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Semua 26" }).click();
    await expect(samples(page)).toHaveCount(26);
  });

  test("every sample image actually loads", async ({ page }) => {
    await page.goto("/panduan");
    const images = page.locator('img[alt^="Contoh gestur huruf"]');
    const count = await images.count();
    for (let index = 0; index < count; index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element) =>
              (element as HTMLImageElement).complete &&
              (element as HTMLImageElement).naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
  });

  test("marks J and Z as motion letters", async ({ page }) => {
    await page.goto("/panduan");
    await page.getByRole("button", { name: "Gerak 2" }).click();
    await expect(page.getByText("Gerbang gerak")).toBeVisible();
    await expect(
      page.getByText(/memakai lintasan ujung telunjuk/i),
    ).toBeVisible();
  });
});
