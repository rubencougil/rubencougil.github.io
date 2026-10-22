const { test, expect } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const canonical = "https://ruben.cougil.com/assets/emoji-trainer/";

test("social metadata and structured data are complete without JavaScript", async ({ browser, request }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4174/");
    const meta = (key) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).getAttribute("content");
    const title = await page.title();
    const description = await meta("description");
    await expect(page.locator("h1")).toContainText("Emoji Trainer");
    expect(await meta("og:title")).toBe(title);
    expect(await meta("twitter:title")).toBe(title);
    expect(await meta("og:description")).toBe(description);
    expect(await meta("twitter:description")).toBe(description);
    expect(await meta("og:url")).toBe(canonical);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    expect(await meta("robots")).toContain("max-image-preview:large");
    expect(await meta("og:site_name")).toBe("Emoji Trainer");
    expect(await meta("twitter:card")).toBe("summary_large_image");
    const image = await meta("og:image");
    expect(image).toBe(`${canonical}social-card.png`);
    expect(await meta("twitter:image")).toBe(image);
    expect(await meta("og:image:secure_url")).toBe(image);
    expect(await meta("og:image:type")).toBe("image/png");
    expect(await meta("twitter:image:alt")).toBe(await meta("og:image:alt"));
    const response = await request.get(new URL(image).pathname.replace("/assets/emoji-trainer/", "/"));
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(Number(await meta("og:image:width")));
    expect(png.readUInt32BE(20)).toBe(Number(await meta("og:image:height")));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(png.length).toBeLessThan(200_000);

    const { "@graph": graph } = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    const webpage = graph.find((entity) => entity["@type"].includes("WebPage"));
    const app = graph.find((entity) => entity["@type"] === "WebApplication");
    const socialImage = graph.find((entity) => entity["@type"] === "ImageObject");
    expect(webpage.url).toBe(canonical);
    expect(webpage.name).toBe(title);
    expect(webpage.description).toBe(description);
    expect(webpage.about["@id"]).toBe(app["@id"]);
    expect(app.mainEntityOfPage["@id"]).toBe(webpage["@id"]);
    expect(socialImage.url).toBe(image);
    expect(socialImage.width).toBe(1200);
    expect(socialImage.height).toBe(630);
    const entities = new Set(graph.map((entity) => entity["@id"]));
    for (const entity of graph) {
        for (const value of Object.values(entity)) {
            if (value && typeof value === "object" && "@id" in value) expect(entities.has(value["@id"])).toBe(true);
        }
    }
    const questions = await page.locator(".guide-content details").evaluateAll((details) =>
        details.map((detail) => ({
            name: detail.querySelector("summary").textContent,
            answer: detail.querySelector("p").textContent
        }))
    );
    expect(webpage.mainEntity.map((question) => ({
        name: question.name,
        answer: question.acceptedAnswer.text
    }))).toEqual(questions);
    const sitemap = readFileSync(resolve(__dirname, "../../../sitemap.xml"), "utf8");
    expect(sitemap).toContain(`<loc>${canonical}</loc>`);
    expect(sitemap).not.toContain(`<loc>${canonical}index.html</loc>`);
    await context.close();
});

test("social links work without JavaScript and share only the public page", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4174/");
    const links = page.locator(".share-actions a");
    await expect(links).toHaveCount(5);
    const expectedHosts = ["twitter.com", "wa.me", "t.me", "www.facebook.com", "www.linkedin.com"];
    for (const [index, host] of expectedHosts.entries()) {
        const link = links.nth(index);
        const url = new URL(await link.getAttribute("href"));
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toBe(host);
        const sharedUrl = url.searchParams.get("url") || url.searchParams.get("u");
        if (sharedUrl) expect(sharedUrl).toBe(canonical);
        else expect(url.searchParams.get("text")).toMatch(new RegExp(`${canonical}$`));
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    await expect(page.locator("#copy_link_button")).toBeDisabled();
    await context.close();
});

test("Copy link is explicit and never invokes system sharing", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
            value: async () => { window.systemShareCalled = true; }
        });
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText: async (value) => { window.copiedLink = value; } }
        });
    });
    await page.goto("/");
    expect(await page.evaluate(() => window.copiedLink)).toBeUndefined();
    await page.locator("#copy_link_button").click();
    await expect(page.locator("#share_status")).toContainText("Link copied");
    expect(await page.evaluate(() => window.copiedLink)).toBe(canonical);
    expect(await page.evaluate(() => window.systemShareCalled)).toBeUndefined();
    await expect(page.locator("#copy_link_button")).toBeEnabled();
});

for (const clipboardFails of [false, true]) {
    test(`manual link fallback works (clipboard denied: ${clipboardFails})`, async ({ page }) => {
        await page.addInitScript((fails) => {
            Object.defineProperty(navigator, "share", { value: undefined });
            Object.defineProperty(navigator, "clipboard", {
                value: fails ? { writeText: async () => { throw new DOMException("Blocked", "NotAllowedError"); } } : undefined
            });
        }, clipboardFails);
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto("/");
        await page.locator("#copy_link_button").click();
        await expect(page.locator("#share_link")).toBeVisible();
        await expect(page.locator("#share_url")).toHaveValue(canonical);
        await expect(page.locator("#share_url")).toBeFocused();
        await expect(page.locator("#share_status")).toContainText("Select and copy");
        expect(await page.locator("#share_url").evaluate((input) => input.selectionEnd - input.selectionStart)).toBe(canonical.length);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator("#copy_link_button")).toBeEnabled();
    });
}
