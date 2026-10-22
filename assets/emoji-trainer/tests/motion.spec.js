const { test, expect } = require("@playwright/test");
const emojis = require("../emoji.json");

for (const reducedMotion of ["no-preference", "reduce"]) {
    test(`game motion is brief and respects preference: ${reducedMotion}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion });
        await page.goto("/");
        await expect(page.locator("#input_submit")).toBeEnabled();
        const animation = async (selector, name) => {
            const style = await page.locator(selector).evaluate((element) => {
                const computed = getComputedStyle(element);
                return {
                    name: computed.animationName,
                    duration: parseFloat(computed.animationDuration),
                    iterations: computed.animationIterationCount
                };
            });
            expect(style.name).toBe(reducedMotion === "reduce" ? "none" : name);
            expect(style.duration).toBeLessThanOrEqual(0.3);
            expect(style.iterations).toBe("1");
        };
        await animation("#display_emoji", "emoji-reveal");
        const glyph = await page.locator("#display_emoji").textContent();
        const answer = emojis.find((entry) => entry.emoji === glyph).aliases[0];
        await page.locator("#input_answer").fill(answer);
        await page.locator("#input_submit").click();
        await animation("#display_emoji", "emoji-correct");
        await animation("#output_result", "feedback-reveal");
        await page.locator("#next_button").click();
        await animation("#display_emoji", "emoji-reveal");
        for (let remaining = 4; remaining >= 0; remaining -= 1) {
            await page.locator("#input_answer").fill("not_an_emoji");
            await page.locator("#input_submit").click();
            await animation("#display_emoji", "emoji-incorrect");
            await animation("#output_result", "feedback-reveal");
            await expect(page.locator("#lives")).toHaveAttribute("aria-label", `${remaining} of 5 lives remaining`);
            await page.locator("#next_button").click();
        }
        await expect(page.locator("#game_over_dialog")).toBeVisible();
        await animation("#game_over_dialog", "dialog-reveal");
        await page.locator("#try_again_button").click();
        await expect(page.locator("#display_score")).toHaveText("0");
        await expect(page.locator("#input_answer")).toBeEnabled();
        if (reducedMotion === "reduce") {
            expect(await page.locator("#input_submit").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
        }
    });
}
