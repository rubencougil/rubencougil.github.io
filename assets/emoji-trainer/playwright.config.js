const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    workers: 2,
    use: {
        baseURL: "http://127.0.0.1:4174",
        channel: "chrome",
        headless: true
    },
    webServer: {
        command: "python3 -m http.server 4174 --bind 127.0.0.1",
        url: "http://127.0.0.1:4174",
        reuseExistingServer: false
    }
});
