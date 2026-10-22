import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.js",
    fullyParallel: true,
    workers: 2,
    use: {
        baseURL: "http://127.0.0.1:4176",
        channel: "chrome",
        headless: true
    },
    webServer: {
        command: "python3 -m http.server 4176 --bind 127.0.0.1",
        url: "http://127.0.0.1:4176",
        reuseExistingServer: false
    }
});
