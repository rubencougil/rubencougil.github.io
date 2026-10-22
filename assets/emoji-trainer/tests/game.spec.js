const { test, expect } = require("@playwright/test");
const emojis = require("../emoji.json");
const params = require("../params.json");

async function ready(page) {
    await page.goto("/");
    await expect(page.locator("#input_submit")).toBeEnabled();
}

async function answerFor(page) {
    const glyph = await page.locator("#display_emoji").textContent();
    return emojis.find((entry) => entry.emoji === glyph);
}

async function loseGame(page) {
    for (let lives = 4; lives >= 0; lives -= 1) {
        await page.locator("#input_answer").fill("not_an_emoji_alias");
        await page.locator("#input_submit").click();
        await expect(page.locator("#lives")).toHaveAttribute("aria-label", `${lives} of 5 lives remaining`);
        await page.locator("#next_button").click();
    }
    await expect(page.locator("#game_over_dialog")).toBeVisible();
}

test("loads locally without browser errors and accepts normalized aliases", async ({ page }) => {
    const errors = [];
    const externalRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
        if (!request.url().startsWith("http://127.0.0.1:4174/")) externalRequests.push(request.url());
    });
    await ready(page);
    const emoji = await answerFor(page);
    await page.locator("#input_answer").fill(`  :${emoji.aliases.at(-1).toUpperCase()}:  `);
    await page.locator("#input_submit").click();
    await expect(page.locator("#display_score")).toHaveText("1");
    await expect(page.locator("#output_result")).toContainText("Correct!");
    await page.locator("#answer_form").evaluate((form) => form.dispatchEvent(new Event("submit", { cancelable: true })));
    await expect(page.locator("#display_score")).toHaveText("1");
    await page.locator("#next_button").click();
    await expect(page.locator("#display_emoji")).not.toHaveText(emoji.emoji);
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
});

test("whitespace and empty colon answers do not cost a life", async ({ page }) => {
    await ready(page);
    for (const answer of ["   ", "::", ": :"]) {
        await page.locator("#input_answer").fill(answer);
        await page.locator("#input_submit").click();
        await expect(page.locator("#output_result")).toContainText("Type an emoji shortcode");
        await expect(page.locator("#lives")).toHaveAttribute("aria-label", "5 of 5 lives remaining");
        await expect(page.locator("#input_answer")).toBeEnabled();
    }
});

test("Enter submits, feedback advances automatically, and focus returns to the input", async ({ page }) => {
    await ready(page);
    const emoji = await answerFor(page);
    await page.locator("#input_answer").fill(emoji.aliases[0]);
    await page.locator("#input_answer").press("Enter");
    await expect(page.locator("#display_score")).toHaveText("1");
    await expect(page.locator("#input_answer")).toBeEnabled({ timeout: 4000 });
    await expect(page.locator("#input_answer")).toBeFocused();
    await expect(page.locator("#display_emoji")).not.toHaveText(emoji.emoji);
});

test("all levels use their configured categories and hints", async ({ page }) => {
    await ready(page);
    for (const [level, config] of Object.entries(params)) {
        await page.locator("#select_level").selectOption(level);
        const emoji = await answerFor(page);
        expect(config.categories).toContain(emoji.category);
        await expect(page.locator("#block_hint")).toBeVisible({ visible: config.hint_ratio > 0 });
        await expect(page.locator("#no_hint")).toBeVisible({ visible: config.hint_ratio === 0 });
        await expect(page.locator(`[data-level="${level}"]`)).toHaveAttribute("data-active", "true");
    }
    await page.reload();
    await expect(page.locator("#select_level")).toHaveValue("impossible");
});

test("level changes and restarts cancel pending transitions", async ({ page }) => {
    await ready(page);
    await page.locator("#input_answer").fill((await answerFor(page)).aliases[0]);
    await page.locator("#input_submit").click();
    await page.locator("#select_level").selectOption("hard");
    const challenge = await page.locator("#display_emoji").textContent();
    await page.waitForTimeout(1650);
    await expect(page.locator("#display_emoji")).toHaveText(challenge);
    await expect(page.locator("#display_score")).toHaveText("0");
    await page.locator("#input_answer").fill("wrong");
    await page.locator("#input_submit").click();
    await page.locator("#restart_button").click();
    await expect(page.locator("#lives")).toHaveAttribute("aria-label", "5 of 5 lives remaining");
    await expect(page.locator("#input_answer")).toBeEnabled();
    await expect(page.locator("#hard_display_total_plays")).toHaveText("0");
});

test("game over records once, persists scores, and restarts without reloading", async ({ page }) => {
    await ready(page);
    await page.locator("#input_answer").fill((await answerFor(page)).aliases[0]);
    await page.locator("#input_submit").click();
    await page.locator("#next_button").click();
    await loseGame(page);
    await expect(page.locator("#final_score")).toHaveText("1");
    await expect(page.locator("#easy_display_best_score")).toHaveText("1");
    await expect(page.locator("#easy_display_total_plays")).toHaveText("1");
    let navigations = 0;
    page.on("framenavigated", () => { navigations += 1; });
    await page.locator("#try_again_button").click();
    await expect(page.locator("#game_over_dialog")).not.toBeVisible();
    await expect(page.locator("#input_answer")).toBeEnabled();
    await expect(page.locator("#display_score")).toHaveText("0");
    expect(navigations).toBe(0);
    await page.reload();
    await expect(page.locator("#easy_display_total_plays")).toHaveText("1");
    await expect(page.locator("#easy_display_best_score")).toHaveText("1");
});

test("Escape dismisses results and Restart remains usable", async ({ page }) => {
    await ready(page);
    await loseGame(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#game_over_dialog")).not.toBeVisible();
    await expect(page.locator("#input_answer")).toBeDisabled();
    await page.locator("#restart_button").click();
    await expect(page.locator("#input_answer")).toBeEnabled();
});

test("migrates legacy cookies and treats stored values as untrusted text", async ({ page, context }) => {
    await context.addCookies([
        { name: "level", value: "medium", url: "http://127.0.0.1:4174" },
        { name: "medium_best_score", value: "12", url: "http://127.0.0.1:4174" },
        { name: "medium_total_plays", value: "3", url: "http://127.0.0.1:4174" }
    ]);
    await ready(page);
    await expect(page.locator("#select_level")).toHaveValue("medium");
    await expect(page.locator("#medium_display_best_score")).toHaveText("12");
    await expect(page.locator("#medium_display_total_plays")).toHaveText("3");
    await page.evaluate(() => {
        localStorage.setItem("emoji-trainer:level", "invalid-level");
        localStorage.setItem("emoji-trainer:easy_best_score", "<img src=x onerror=alert(1)>");
        localStorage.setItem("emoji-trainer:easy_total_plays", "-1");
    });
    await page.reload();
    await expect(page.locator("#input_submit")).toBeEnabled();
    await expect(page.locator("#select_level")).toHaveValue("easy");
    await expect(page.locator("#easy_display_best_score")).toHaveText("0");
    await expect(page.locator("#easy_display_total_plays")).toHaveText("0");
    await expect(page.locator("table img")).toHaveCount(0);
});

test("blocked storage shows a notice and keeps progress in memory", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
            get() { throw new DOMException("Storage blocked", "SecurityError"); }
        });
    });
    await ready(page);
    await expect(page.locator("#storage_notice")).toContainText("unavailable");
    await loseGame(page);
    await expect(page.locator("#easy_display_total_plays")).toHaveText("1");
    await page.locator("#try_again_button").click();
    await loseGame(page);
    await expect(page.locator("#easy_display_total_plays")).toHaveText("2");
});

for (const failure of ["network", "json", "empty-pool"]) {
    test(`data failure (${failure}) has a visible, retryable error`, async ({ page }) => {
        if (failure === "network") {
            await page.route("**/emoji.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
        } else if (failure === "json") {
            await page.route("**/emoji.json", (route) => route.fulfill({ contentType: "application/json", body: "{}" }));
        } else {
            await page.route("**/params.json", (route) => route.fulfill({
                json: { ...params, easy: { hint_ratio: 0.6, categories: ["Missing category"] } }
            }));
        }
        await page.goto("/");
        await expect(page.locator("#output_result")).toContainText("Unable to load game data");
        await expect(page.locator("#reload_button")).toBeVisible();
        await expect(page.locator("#input_submit")).toBeDisabled();
        await expect(page.locator("#game")).toHaveAttribute("aria-busy", "false");
        await page.unrouteAll();
        await page.locator("#reload_button").click();
        await expect(page.locator("#input_submit")).toBeEnabled();
    });
}

test("mobile and desktop layouts fit the viewport and expose helpful metadata", async ({ page }) => {
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await ready(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.locator("#input_answer")).toHaveAccessibleName("What's the shortcode?");
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://ruben.cougil.com/assets/emoji-trainer/");
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(data["@graph"].some((entity) => entity["@type"] === "WebApplication")).toBe(true);
    await page.getByText("Are these Unicode emoji names?", { exact: true }).click();
    await expect(page.locator("#how-to-play")).toContainText("not official Unicode CLDR short names");
});

test("a single eligible emoji and long feedback work on small screens", async ({ page }) => {
    const longest = [...emojis].filter((entry) => entry.category === "Smileys & Emotion")
        .sort((a, b) => b.aliases.join(" ").length - a.aliases.join(" ").length)[0];
    await page.setViewportSize({ width: 320, height: 800 });
    await page.route("**/emoji.json", (route) => route.fulfill({ json: [longest] }));
    await ready(page);
    for (const answer of [longest.aliases[0], "not_an_alias"]) {
        await page.locator("#input_answer").fill(answer);
        await page.locator("#input_submit").click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.locator("#next_button").click();
        await expect(page.locator("#input_answer")).toBeEnabled();
        await expect(page.locator("#display_emoji")).toHaveText(longest.emoji);
    }
});

test("the shortcode guide remains available without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4174/");
    await expect(page.locator(".noscript-message")).toBeVisible();
    await expect(page.locator(".noscript-message")).toContainText("JavaScript is needed to play");
    await expect(page.locator("#game")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("#input_answer")).toBeDisabled();
    await expect(page.locator("#how-to-play")).toContainText("Each correct answer earns one point");
    await context.close();
});
