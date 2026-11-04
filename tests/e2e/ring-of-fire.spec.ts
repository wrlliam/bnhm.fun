import { expect, type Page, test } from "@playwright/test";

/** Join the room open on `page` with a name. */
async function join(page: Page, name: string) {
  await page.locator("#join-name").fill(name);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByText(/You.re in!/)).toBeVisible();
}

/** Tokens this tab holds for the room (player token per tab, host token per browser). */
const tokens = (page: Page, code: string) =>
  page.evaluate((c) => ({ token: sessionStorage.getItem(`room:${c}:token`), hostToken: localStorage.getItem(`room:${c}:host`) }), code);

test("two phones play Ring of Fire: join, start, draw, drink alerts gate the next card", async ({ browser }) => {
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();

  // host starts a room and joins it
  await host.goto("/");
  await host.locator("li", { hasText: "Ring of Fire" }).getByRole("button", { name: "Start a room" }).click();
  await expect(host).toHaveURL(/\/r\/[A-Z]{4}$/);
  const code = host.url().slice(-4);
  await join(host, "Host");
  const { hostToken } = await tokens(host, code);
  const api = (body: Record<string, unknown>) => host.request.post(`/api/rooms/${code}`, { data: { hostToken, ...body } });

  // only "3 · Me" in the deck, so the test is deterministic
  const allButThree = ["A", "2", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  expect((await api({ type: "settings", disabled: allButThree })).ok()).toBe(true);

  // guest joins with the code from the home page
  await guest.goto("/");
  await guest.locator("#code").fill(code);
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await join(guest, "Guest");

  // live update: the host sees the guest arrive without reloading
  await expect(host.getByText("Guest").first()).toBeVisible();
  await host.getByRole("button", { name: /Start with 2 players/ }).click();

  // host goes first: draws a 3 ("Me"); both phones show it, the host's phone says drink
  await host.getByRole("button", { name: /Your turn/ }).click();
  await expect(guest.getByText("Host drew")).toBeVisible();
  await expect(guest.getByRole("heading", { name: "Me" })).toBeVisible();
  await expect(host.getByText("Drink!")).toBeVisible();

  // the guest can't draw until the host confirms
  await expect(guest.getByText(/Waiting for .*Host.* to drink/)).toBeVisible();
  await host.getByRole("button", { name: "Done — I drank" }).click();
  await expect(guest.getByRole("button", { name: /Your turn/ })).toBeVisible();

  // host makes the guest drink: guest's phone takes over, everyone waits on them
  const room = await (await host.request.get(`/api/rooms/${code}`)).json();
  const guestId = room.room.players.find((p: { name: string }) => p.name === "Guest").id;
  expect((await api({ type: "penalty", playerId: guestId })).ok()).toBe(true);
  await expect(guest.getByText("Drink!")).toBeVisible();
  await expect(host.getByText(/Waiting for .*Guest.* to drink/)).toBeVisible();
  await guest.getByRole("button", { name: "Done — I drank" }).click();
  await expect(host.getByText(/Waiting for .*Guest.* to drink/)).toBeHidden();
  await expect(guest.getByRole("button", { name: /Your turn/ })).toBeVisible();
});

test("TV screen unlocks admin controls with the admin password", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  const created = await page.request.post("/api/rooms", { data: { kind: "trivia" } });
  const { code, adminPassword } = await created.json();

  await page.goto("/tv");
  await page.locator("#tv-code").fill(code);
  await page.locator("#tv-pw").fill(adminPassword.toUpperCase());
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page).toHaveURL(new RegExp(`/tv/${code}$`));
  await expect(page.getByText("Admin controls on")).toBeVisible();
});
