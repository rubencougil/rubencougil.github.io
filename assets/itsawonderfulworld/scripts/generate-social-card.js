import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

async function generate() {
    const browser = await chromium.launch({ channel: "chrome" });
    try {
        const page = await browser.newPage({
            viewport: { width: 1200, height: 630 },
            deviceScaleFactor: 1
        });
        await page.goto(new URL("../img/social-card.svg", import.meta.url).href);
        if (await page.locator("parsererror").count()) throw new Error("Invalid social-card.svg");
        await page.screenshot({ path: fileURLToPath(new URL("../img/social-card.png", import.meta.url)) });
    } finally {
        await browser.close();
    }
}

generate().catch((error) => {
    console.error("Could not generate the social preview:", error);
    process.exitCode = 1;
});
