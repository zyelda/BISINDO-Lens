import { expect, test } from "@playwright/test";

test.describe("model report", () => {
  test("renders the real held-out metrics from metrics.json", async ({ page }) => {
    await page.goto("/model");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Model & evaluasi",
    );
    await expect(page.getByText("87.50%").first()).toBeVisible();
    await expect(page.getByText("0.877", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("104 gambar held-out")).toBeVisible();
    await expect(page.getByText("12.97 MB")).toBeVisible();
    await expect(page.getByText("300", { exact: true })).toBeVisible();
    await expect(page.getByText("96 dimensi")).toBeVisible();
  });

  test("shows a 26-row per-class report and the confusion matrix", async ({
    page,
  }) => {
    await page.goto("/model");

    const reportTable = page.getByRole("table").first();
    await expect(reportTable.locator("tbody tr")).toHaveCount(26);
    await expect(reportTable.getByRole("rowheader", { name: "A" })).toBeVisible();
    await expect(reportTable.getByRole("rowheader", { name: "Z" })).toBeVisible();

    await expect(
      page.getByRole("img", { name: /Confusion matrix 26 kelas/i }),
    ).toBeVisible();

    await page.getByText("Lihat sebagai tabel").click();
    await expect(page.getByRole("table")).toHaveCount(2);
  });

  test("links the dataset and states its limitations", async ({ page }) => {
    await page.goto("/model");

    const source = page.getByRole("link", {
      name: "Research-Binus-BISINDO-DATASET",
    });
    await expect(source).toHaveAttribute(
      "href",
      "https://github.com/Zappie733/Research-Binus-BISINDO-DATASET",
    );
    await expect(
      page.getByText(/belum diuji lintas signer/i),
    ).toBeVisible();
    await expect(page.getByText(/30,8%/)).toBeVisible();
  });
});
