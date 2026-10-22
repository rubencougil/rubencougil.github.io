# Emoji Trainer

A static, dependency-free browser game for practicing GitHub-style emoji aliases.
Serve this directory over HTTP; no build or application server is required:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. Emoji data, styles, and scripts are served locally;
playing does not require a third-party CDN or API.

## Development checks

With Node.js 22.19+ (or 24.6+), Python 3, and Google Chrome installed:

```sh
npm ci
npm test
npm run audit
```

The browser tests start and stop their own server on port 4174. The Lighthouse
command uses the running server on port 4173 and writes `lighthouse-report.json`.
For a desktop audit, append `-- --preset=desktop` to `npm run audit`.

## Game behavior and data

Each correct answer earns a point; a wrong answer reveals all aliases and costs
one of five lives. Answers ignore case and surrounding whitespace, and accept
optional surrounding colons. Feedback advances automatically or via Next emoji.
Only completed games count toward plays and best scores. Changing difficulty or
restarting abandons the current game. Difficulty and hints are in `params.json`.

Game reactions use short, non-looping CSS animations (180–280 ms). Existing
feedback attributes trigger the effects; no JavaScript animation timers or
libraries are added. All motion and transitions are opt-in through
`prefers-reduced-motion: no-preference`.

Scores and difficulty use namespaced local storage, with legacy cookies read for
backward compatibility. If storage is blocked, a visible notice explains that
new scores last only for the page session. Scores are never sent to a server.

## Sharing and discoverability

Open Graph and X/Twitter metadata use the same canonical URL, title, description,
and dedicated 1200 × 630 PNG preview. Edit `social-card.svg` and run
`npm run social-card` to regenerate `social-card.png` with Chrome. The full
`screenshot.png` remains a separate screenshot for the application schema.

Static links open X, WhatsApp, Telegram, Facebook, and LinkedIn sharing pages
in a new tab and work without JavaScript. Copy link is a separate, explicit
clipboard action, with a selectable link if copying is blocked. System share
sheets are not used. No third-party sharing SDKs or trackers are loaded.

Static JSON-LD links the application, page, creator, image, and FAQ answers.
Keep structured answers identical to the visible guide; browser tests check
their parity, social image dimensions, and the canonical URL in the root sitemap.
This makes the content easier for search engines and AI tools to interpret;
it does not guarantee rankings, AI citations, or FAQ rich results. Actual social
previews can only be confirmed after deployment and may be cached by platforms.

`emoji.json` contains only the `emoji`, `aliases`, and `category` fields from
[github/gemoji](https://github.com/github/gemoji), pinned to revision
`fadaeaf1f1a9be82b321316a6c5502e43138b2f6`. Its MIT license is preserved in
`LICENSE.gemoji`. Aliases are not official Unicode CLDR short names, and support
for individual aliases varies between apps. When updating the dataset, retain
the license and validate all difficulty pools with `npm test`.
