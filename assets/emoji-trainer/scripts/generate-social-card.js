const { chromium } = require("@playwright/test");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

async function generate() {
    const browser = await chromium.launch({ channel: "chrome" });
    try {
        const page = await browser.newPage({
            viewport: { width: 1200, height: 630 },
            deviceScaleFactor: 1
        });
        await page.goto(pathToFileURL(resolve(__dirname, "../social-card.svg")).href);
        if (await page.locator("parsererror").count()) throw new Error("Invalid social-card.svg");
        await page.screenshot({ path: resolve(__dirname, "../social-card.png") });
    } finally {
        await browser.close();
    }
}

generate().catch((error) => {
    console.error("Could not generate the social preview:", error);
    process.exitCode = 1;
});
