import { expect, test } from "@playwright/test";

const ROUTES = [
  { link: "Beranda", path: "/", heading: /Membaca tangan/ },
  { link: "Deteksi", path: "/deteksi", heading: "Deteksi" },
  { link: "Panduan", path: "/panduan", heading: "Panduan A–Z" },
  { link: "Model", path: "/model", heading: "Model & evaluasi" },
  { link: "Tentang", path: "/tentang", heading: "Tentang" },
] as const;

test.describe("navigation", () => {
  test("every main route renders through the shared layout", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("BISINDO Lens");

    for (const route of ROUTES) {
      await page.getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: route.link, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
    }
  });

  test("an unknown URL renders the 404 page and can recover", async ({ page }) => {
    await page.goto("/rute-tidak-ada");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Halaman ini tidak ada",
    );
    await page.getByRole("link", { name: "Kembali ke beranda" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Membaca tangan",
    );
  });

  test("the current route is marked with aria-current", async ({ page }) => {
    await page.goto("/model");
    const active = page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Model", exact: true });
    await expect(active).toHaveAttribute("aria-current", "page");
  });
});
