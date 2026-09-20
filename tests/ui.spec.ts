import { expect, test } from "@playwright/test";

test("scanner filters, sorting, reset, empty state and stock navigation", async ({
  page,
}) => {
  await page.goto("/scanner");
  await expect(
    page.getByText("DEMO DATA — NOT LIVE MARKET DATA"),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByLabel("Ticker or company").fill("bank");
  await page
    .getByLabel("Market phase", { exact: true })
    .selectOption("ACCUMULATION");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("BBCA");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByLabel("Sort by").selectOption("ticker");
  await page.getByLabel("Order", { exact: true }).selectOption("asc");
  await expect(page.locator("tbody tr").first()).toContainText("ADRO");
  await page.getByLabel("Ticker or company").fill("not-a-stock");
  await expect(page.getByText("No matching stocks")).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await page.getByRole("link", { name: "Analyze BBCA", exact: true }).click();
  await expect(page).toHaveURL(/\/stocks\/BBCA/);
  await expect(
    page.getByRole("heading", { name: "Price & volume" }),
  ).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", { name: "20 sessions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "20 sessions", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("watchlist persists and removes entries", async ({ page }) => {
  await page.goto("/watchlist");
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("link", { name: "BBCA", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "BBCA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove BBCA from watchlist" })
    .click();
  await expect(page.getByText("Make room for a closer look")).toBeVisible();
});

test("replay playback, scrubbing and resets work", async ({ page }) => {
  await page.goto("/cycle-replay");
  const slider = page.getByRole("slider", { name: "Replay timeline" });
  await expect(slider).toHaveValue("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(slider).not.toHaveValue("0");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await slider.press("End");
  await expect(page.getByText("Session 20 / 20")).toBeVisible();
  await page.getByLabel("Authored cycle").selectOption("current");
  await expect(slider).toHaveValue("0");
  await page.getByLabel("Demo ticker").selectOption("BBRI");
  await expect(
    page.getByRole("heading", { name: "BBRI · Price replay" }),
  ).toBeVisible();
});

test("all routes render without browser errors and mobile stays contained", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/scanner",
    "/stocks",
    "/stocks/BBCA",
    "/broker-flow",
    "/cycle-replay",
    "/watchlist",
    "/methodology",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(
      page.getByText("DEMO DATA — NOT LIVE MARKET DATA"),
    ).toBeVisible();
  }
  await page.goto("/");
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/scanner",
    "/stocks/BBCA",
    "/broker-flow",
    "/cycle-replay",
    "/watchlist",
    "/methodology",
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/");
  await page.screenshot({
    path: "test-results/overview-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Market Scanner" }).click();
  await expect(page).toHaveURL(/\/scanner/);
  expect(errors).toEqual([]);
});
