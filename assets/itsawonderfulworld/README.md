# It's a Wonderful World Score Calculator

An unofficial, static score companion. No build, backend, third-party fonts,
CDNs, analytics, or runtime packages are required. Serve this directory:

```sh
python3 -m http.server 4175 --bind 127.0.0.1
```

Open <http://127.0.0.1:4175/>. JavaScript modules require HTTP; do not open
`index.html` directly with a `file:` URL.

## Development

With Node.js 22.19+ (or 24.6+), Python 3, and Google Chrome installed:

```sh
npm ci
npm test
npm run social-card
npm run audit
```

Tests cover the pure scoring model and browser behavior. Browser tests manage
their own server on port 4176. Lighthouse uses the running preview on 4175 and
writes `lighthouse-report.json`; append `-- --preset=desktop` for a desktop audit.

## Scoring and scope

The original formula is preserved:

```text
Total = Printed VP
      + Σ(card count × matching VP multiplier)
      + General count × (1 + General bonus multiplier)
      + Financier count × (1 + Financier bonus multiplier)
```

The four card rows are Science/green, Energy/black, Gold/yellow, and
Exploration/blue. They count completed cards, not resource cubes. Character
counts are tokens remaining in your Empire. Enter the sum of the relevant
victory-point multipliers, not production icons. Character base points are
automatic and must not also be entered in Printed VP.

Blank fields mean zero. Counts and multipliers must be nonnegative whole
numbers; Printed VP permits signed whole-number adjustments. Fractions,
nonfinite values, and unsafe-integer arithmetic produce visible errors instead
of truncated, approximate, or `NaN` scores. The tool is one scorecard, not a
multiplayer leaderboard, expansion rules engine, or solo-rating calculator.
Resolve special scoring conditions using your rulebook first.

The guide cites the [publisher's game page](https://www.laboitedejeu.fr/en/its-a-wonderful-world/)
and [official English rules](https://www.laboitedejeu.fr/wp-content/uploads/2021/01/ITS-EN-STD-rules-web.pdf).
The tool is not affiliated with La Boîte de Jeu or Origames. Existing game
artwork remains the property of its respective owners.

## Saving, sharing, and motion

Only the current sheet is saved under `wonderful-world:scorecard:v1` in local
storage. Values are never sent to a server, included in sharing URLs, or synced
between devices. Reset requires confirmation. Blocked storage and corrupt saved
data have visible notices; a storage failure does not prevent calculation.
Unfinished number-input keystrokes cannot be serialized by the browser.

Static social links open X, WhatsApp, Telegram, Facebook, or LinkedIn in a new
tab, including without JavaScript. Copy link is an explicit clipboard action,
with a selectable canonical link if copying is blocked. No system share sheets
or third-party sharing scripts are used.
`img/social-card.svg` is the editable source for the 1200 × 630 PNG; regenerate
it with `npm run social-card`. Social metadata is static and works without
JavaScript. Actual platform previews require deployment and may be cached.

JSON-LD links the application, creator, image, and visible FAQ answers. Tests
check schema/visible-answer parity and the canonical root sitemap entry.
Search rankings, FAQ rich results, and AI citations are not guaranteed.

Animations are CSS-only, non-looping, 150–240 ms, and enabled only when the user
has not requested reduced motion. No JavaScript animation timers or libraries
are used.
