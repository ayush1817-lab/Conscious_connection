/**
 * npm run test:auth  (milestone 2 acceptance)
 *
 * Needs the app running (npm run dev, or npm run build && npm start) and a seeded database.
 * Checks: /admin redirects when logged out; the seeded admin can log in, stays
 * logged in and can log out; a wrong password shows a clear error; a signed-in
 * non-admin is blocked.
 */
import { env, serviceClient } from "../lib/env";
import { BASE_URL, check, finish, launch } from "./browser";

async function main() {
  const browser = await launch();
  const service = serviceClient();

  try {
    console.log("Logged out");
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/events`);
    check(page.url().startsWith(`${BASE_URL}/admin/login`), "/admin/events redirects to the login page", page.url());
    await page.goto(`${BASE_URL}/admin`);
    check(page.url().startsWith(`${BASE_URL}/admin/login`), "/admin redirects to the login page", page.url());

    console.log("\nWrong password");
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    const wrongPassword = page.getByText("That email and password don't match");
    check(await wrongPassword.waitFor().then(() => true, () => false), "shows a plain-language error");

    console.log("\nSeeded admin");
    await page.goto(`${BASE_URL}/admin/events`);
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"));
    check(new URL(page.url()).pathname === "/admin/events", "logs in and returns to the page they asked for", page.url());

    const second = await context.newPage();
    await second.goto(`${BASE_URL}/admin`);
    check(new URL(second.url()).pathname === "/admin", "stays logged in on a new visit", second.url());
    const welcome = second.getByRole("heading", { name: "Welcome, Karina" });
    check(await welcome.waitFor().then(() => true, () => false), "sees the admin home");

    await second.goto(`${BASE_URL}/admin/login`);
    check(new URL(second.url()).pathname === "/admin", "login page sends a logged-in admin to the admin home");

    await second.getByRole("button", { name: "Log out" }).click();
    await second.waitForURL(`${BASE_URL}/admin/login`);
    const toast = second.getByText("You've been logged out.");
    check(await toast.waitFor({ timeout: 5000 }).then(() => true, () => false), "log out shows a confirmation");
    await second.goto(`${BASE_URL}/admin`);
    check(second.url().startsWith(`${BASE_URL}/admin/login`), "after logging out, /admin redirects to login");

    console.log("\nSigned-in user who is not an admin");
    const email = `e2e-${Date.now()}@example.com`;
    const password = `pw-${crypto.randomUUID()}`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Could not create test user");
    const userId = data.user.id;
    try {
      const outsider = await (await browser.newContext()).newPage();
      await outsider.goto(`${BASE_URL}/admin/login`);
      await outsider.getByLabel("Email").fill(email);
      await outsider.getByLabel("Password").fill(password);
      await outsider.getByRole("button", { name: "Log in" }).click();
      await outsider.waitForURL(`${BASE_URL}/admin/no-access`);
      const heading = outsider.getByRole("heading", { name: "You don't have access" });
      check(await heading.waitFor().then(() => true, () => false), "sees \"You don't have access\"");
      await outsider.goto(`${BASE_URL}/admin/events`);
      check(new URL(outsider.url()).pathname === "/admin/no-access", "cannot open other admin pages");
    } finally {
      await service.auth.admin.deleteUser(userId);
    }

    console.log("\nForgot password");
    const reset = await (await browser.newContext()).newPage();
    await reset.goto(`${BASE_URL}/admin/login`);
    await reset.getByRole("link", { name: "Forgot password?" }).click();
    await reset.getByRole("heading", { name: "Forgot your password?" }).waitFor();
    await reset.getByLabel("Email").fill("nobody@example.com");
    await reset.getByRole("button", { name: "Send reset link" }).click();
    const sent = reset.getByText("If there's an account for nobody@example.com");
    const sentOk = await sent.waitFor().then(() => true, () => false);
    check(sentOk, "shows the same message whether or not the account exists", sentOk ? "" : await reset.locator("main").innerText());
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
