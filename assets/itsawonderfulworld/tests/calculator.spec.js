import { test, expect } from "@playwright/test";
import { CATEGORIES, FIELD_IDS } from "../js/scoring.js";

const storageKey = "wonderful-world:scorecard:v1";
const example = {
    grossVictoryPointsInput: "32",
    scienceVictoryPointsInput: "5", scienceMultiplierInput: "3",
    energyVictoryPointsInput: "8", energyMultiplierInput: "2",
    goldVictoryPointsInput: "4", goldMultiplierInput: "2",
    explorationVictoryPointsInput: "6", explorationMultiplierInput: "2",
    generalsVictoryPointsInput: "9", generalsMultiplierInput: "2",
    financiersVictoryPointsInput: "5", financiersMultiplierInput: "2"
};

async function ready(page) {
    await page.goto("/");
    await expect(page.locator("#scienceVictoryPointsInput")).toBeEnabled();
}

test("live scoring matches the complete example, without external requests or runtime errors", async ({ page }) => {
    const errors = [];
    const external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
        if (!request.url().startsWith("http://127.0.0.1:4176/")) external.push(request.url());
    });
    await ready(page);
    await expect(page.locator("#resultInput")).toHaveText("0");
    await expect(page.locator("#reset_button")).toBeDisabled();
    for (const [id, value] of Object.entries(example)) await page.locator(`#${id}`).fill(value);
    await expect(page.locator("#resultInput")).toHaveText("125");
    await expect(page.locator("#printed-breakdown")).toHaveText("32");
    await expect(page.locator("#cards-breakdown")).toHaveText("51");
    await expect(page.locator("#generals-breakdown")).toHaveText("27");
    await expect(page.locator("#financiers-breakdown")).toHaveText("15");
    for (const [category, score] of Object.entries({ science: 15, energy: 16, gold: 8, exploration: 12, generals: 27, financiers: 15 })) {
        await expect(page.locator(`#${category}Subtotal`)).toHaveText(String(score));
    }
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
});

test("character base points are automatic; blank card multipliers score zero", async ({ page }) => {
    await ready(page);
    await page.locator("#scienceVictoryPointsInput").fill("5");
    await expect(page.locator("#scienceSubtotal")).toHaveText("0");
    await page.locator("#generalsVictoryPointsInput").fill("3");
    await page.locator("#financiersVictoryPointsInput").fill("4");
    await expect(page.locator("#resultInput")).toHaveText("7");
    await page.locator("#generalsMultiplierInput").fill("2");
    await expect(page.locator("#generalsSubtotal")).toHaveText("9");
    await expect(page.locator("#resultInput")).toHaveText("13");
});

test("fractions, negatives, and unsafe totals show errors instead of truncating or displaying NaN", async ({ page }) => {
    await ready(page);
    const science = page.locator("#scienceVictoryPointsInput");
    for (const [value, message] of [["1.5", "whole number"], ["-1", "positive number"], ["9007199254740992", "too large"]]) {
        await science.fill(value);
        await expect(science).toHaveAttribute("aria-invalid", "true");
        await expect(page.locator("#scienceVictoryPointsInputError")).toContainText(message);
        await expect(page.locator("#resultInput")).toHaveText("—");
    }
    await science.fill("9007199254740991");
    await page.locator("#scienceMultiplierInput").fill("2");
    await expect(page.locator("#score_status")).toContainText("safe calculation range");
    await expect(page.locator("#resultInput")).toHaveText("—");
    await science.fill("3");
    await expect(science).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("#resultInput")).toHaveText("6");
});

test("unfinished number input is invalid, and signed printed VP is preserved", async ({ page }) => {
    await ready(page);
    await page.locator("#grossVictoryPointsInput").fill("-4");
    await page.locator("#scienceVictoryPointsInput").fill("2e2");
    await page.locator("#scienceMultiplierInput").fill("3");
    await expect(page.locator("#resultInput")).toHaveText("596");
    await page.locator("#energyVictoryPointsInput").pressSequentially("-");
    await expect(page.locator("#energyVictoryPointsInput")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#resultInput")).toHaveText("—");
});

test("autosave survives reload and Enter does not navigate", async ({ page }) => {
    await ready(page);
    await page.locator("#grossVictoryPointsInput").fill("12");
    await page.locator("#generalsVictoryPointsInput").fill("3");
    await page.locator("#generalsVictoryPointsInput").press("Enter");
    await expect(page.locator("#resultInput")).toHaveText("15");
    await page.reload();
    await expect(page.locator("#resultInput")).toHaveText("15");
    await expect(page.locator("#grossVictoryPointsInput")).toHaveValue("12");
    await expect(page.locator("#storage_notice")).toContainText("restored");
});

test("clear score is confirmed, cancelable, and persists a fresh sheet", async ({ page }) => {
    await ready(page);
    await page.locator("#grossVictoryPointsInput").fill("18");
    await page.locator("#reset_button").click();
    await expect(page.locator("#reset_dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep my score" })).toBeFocused();
    await page.getByRole("button", { name: "Keep my score" }).click();
    await expect(page.locator("#resultInput")).toHaveText("18");
    await page.locator("#reset_button").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#resultInput")).toHaveText("18");
    await page.locator("#reset_button").click();
    await page.locator("#confirm_reset").click();
    await expect(page.locator("#resultInput")).toHaveText("0");
    await expect(page.locator("#grossVictoryPointsInput")).toBeFocused();
    for (const id of FIELD_IDS) await expect(page.locator(`#${id}`)).toHaveValue("");
    await page.reload();
    await expect(page.locator("#resultInput")).toHaveText("0");
});

for (const failure of ["blocked", "quota"]) {
    test(`storage ${failure} has a visible notice without breaking calculation`, async ({ page }) => {
        await page.addInitScript((mode) => {
            if (mode === "blocked") {
                Object.defineProperty(window, "localStorage", {
                    get() { throw new DOMException("Blocked", "SecurityError"); }
                });
            } else {
                Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
            }
        }, failure);
        await ready(page);
        await page.locator("#grossVictoryPointsInput").fill("7");
        await page.locator("#generalsVictoryPointsInput").fill("3");
        await expect(page.locator("#resultInput")).toHaveText("10");
        await expect(page.locator("#storage_notice")).toContainText("Storage is unavailable");
    });
}

for (const failure of ["json", "version", "missing-field", "html"]) {
    test(`corrupt saved data (${failure}) is not silently trusted`, async ({ page }) => {
        await page.goto("/");
        const values = Object.fromEntries(FIELD_IDS.map((id) => [id, ""]));
        if (failure === "missing-field") delete values.scienceMultiplierInput;
        if (failure === "html") values.scienceVictoryPointsInput = "<img src=x onerror=alert(1)>";
        const saved = failure === "json" ? "{" : JSON.stringify({ version: failure === "version" ? 99 : 1, values });
        await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, saved]);
        await page.reload();
        await expect(page.locator("#storage_notice")).toContainText("could not be restored");
        await expect(page.locator("#resultInput")).toHaveText("0");
        await expect(page.locator("#scienceVictoryPointsInput")).toHaveValue("");
    });
}

test("a saved invalid numeric edit still shows its error on reload", async ({ page }) => {
    await ready(page);
    await page.locator("#goldVictoryPointsInput").fill("1.5");
    await page.reload();
    await expect(page.locator("#goldVictoryPointsInput")).toHaveValue("1.5");
    await expect(page.locator("#goldVictoryPointsInput")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#resultInput")).toHaveText("—");
});

test("responsive layouts and input labels remain usable", async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await ready(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.getByRole("spinbutton", { name: "Science card count", exact: true })).toBeVisible();
        await expect(page.locator("h1")).toHaveCount(1);
        for (const id of FIELD_IDS) {
            const box = await page.locator(`#${id}`).boundingBox();
            expect(box.height).toBeGreaterThanOrEqual(44);
        }
    }
    expect(await page.locator("#score-form input").count()).toBe(FIELD_IDS.length);
    for (const category of CATEGORIES) await expect(page.locator(`#${category}Subtotal`)).toBeVisible();
});

for (const preference of ["no-preference", "reduce"]) {
    test(`CSS motion respects ${preference}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: preference });
        await ready(page);
        const check = async (selector, expected) => {
            const style = await page.locator(selector).evaluate((element) => {
                const computed = getComputedStyle(element);
                return { name: computed.animationName, duration: parseFloat(computed.animationDuration), iterations: computed.animationIterationCount };
            });
            expect(style.name).toBe(preference === "reduce" ? "none" : expected);
            expect(style.duration).toBeLessThanOrEqual(0.25);
            expect(style.iterations).toBe("1");
        };
        await check(".total-card", "score-reveal");
        await page.locator("#scienceVictoryPointsInput").fill("-1");
        await check("#scienceVictoryPointsInput", "field-attention");
        await page.locator("#reset_button").click();
        await check("#reset_dialog", "dialog-reveal");
    });
}

test("the guide and network share links work without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4176/");
    await expect(page.locator(".notice")).toContainText("JavaScript is needed");
    await expect(page.locator("#scienceVictoryPointsInput")).toBeDisabled();
    await expect(page.locator(".worked-example")).toContainText("125 VP");
    await expect(page.locator(".share-actions a")).toHaveCount(5);
    await context.close();
});
