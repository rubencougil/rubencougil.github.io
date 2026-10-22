import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const canonical = "https://ruben.cougil.com/assets/itsawonderfulworld/";

test("metadata, image, FAQ answers, and sitemap agree without JavaScript", async ({ browser, request }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4176/");
    const meta = (key) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).getAttribute("content");
    const title = await page.title();
    const description = await meta("description");
    for (const platform of ["og", "twitter"]) {
        expect(await meta(`${platform}:title`)).toBe(title);
        expect(await meta(`${platform}:description`)).toBe(description);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    expect(await meta("og:url")).toBe(canonical);
    expect(await meta("robots")).toContain("max-image-preview:large");
    expect(await meta("twitter:card")).toBe("summary_large_image");
    const image = await meta("og:image");
    expect(image).toBe(`${canonical}img/social-card.png`);
    expect(await meta("og:image:secure_url")).toBe(image);
    expect(await meta("twitter:image")).toBe(image);
    expect(await meta("twitter:image:alt")).toBe(await meta("og:image:alt"));
    const response = await request.get("/img/social-card.png");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(await meta("og:image:width")).toBe("1200");
    expect(await meta("og:image:height")).toBe("630");
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
    expect(app.applicationCategory).toBe("UtilitiesApplication");
    expect(socialImage.url).toBe(image);
    expect(socialImage.width).toBe(1200);
    expect(socialImage.height).toBe(630);
    const ids = new Set(graph.map((entity) => entity["@id"]));
    for (const entity of graph) {
        for (const value of Object.values(entity)) {
            if (value && typeof value === "object" && "@id" in value) expect(ids.has(value["@id"])).toBe(true);
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
    for (const citation of webpage.citation) await expect(page.locator(`.source-links a[href="${citation}"]`)).toHaveCount(1);
    const sitemap = readFileSync(new URL("../../../sitemap.xml", import.meta.url), "utf8");
    expect(sitemap).toContain(`<loc>${canonical}</loc>`);
    expect(sitemap).not.toContain(`<loc>${canonical}index.html</loc>`);
    await context.close();
});

test("all five social links work without JavaScript and contain no score data", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4176/");
    const links = page.locator(".share-actions a");
    await expect(links).toHaveCount(5);
    const hosts = ["twitter.com", "wa.me", "t.me", "www.facebook.com", "www.linkedin.com"];
    for (const [index, host] of hosts.entries()) {
        const link = links.nth(index);
        const url = new URL(await link.getAttribute("href"));
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toBe(host);
        const sharedUrl = url.searchParams.get("url") || url.searchParams.get("u");
        if (sharedUrl) expect(sharedUrl).toBe(canonical);
        else expect(url.searchParams.get("text").endsWith(canonical)).toBe(true);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    await expect(page.locator("#copy_link_button")).toBeDisabled();
    await context.close();
});

test("explicit copying uses the public link, never system sharing or private inputs", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
            value: async () => { window.systemShareCalled = true; }
        });
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText: async (value) => { window.copiedLink = value; } }
        });
    });
    await page.goto("/");
    await page.locator("#grossVictoryPointsInput").fill("98765");
    expect(await page.evaluate(() => window.copiedLink)).toBeUndefined();
    await page.locator("#copy_link_button").click();
    await expect(page.locator("#share_status")).toContainText("Link copied");
    expect(await page.evaluate(() => window.copiedLink)).toBe(canonical);
    expect(await page.evaluate(() => window.systemShareCalled)).toBeUndefined();
    await expect(page.locator("#copy_link_button")).toBeEnabled();
});

for (const clipboardDenied of [false, true]) {
    test(`manual copying remains available (clipboard denied: ${clipboardDenied})`, async ({ page }) => {
        await page.addInitScript((denied) => {
            Object.defineProperty(navigator, "clipboard", {
                value: denied ? { writeText: async () => { throw new DOMException("Blocked", "NotAllowedError"); } } : undefined
            });
        }, clipboardDenied);
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto("/");
        await page.locator("#copy_link_button").click();
        await expect(page.locator("#share_url")).toBeVisible();
        await expect(page.locator("#share_url")).toHaveValue(canonical);
        await expect(page.locator("#share_url")).toBeFocused();
        await expect(page.locator("#share_status")).toContainText("Select and copy");
        expect(await page.locator("#share_url").evaluate((input) => input.selectionEnd - input.selectionStart)).toBe(canonical.length);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}
