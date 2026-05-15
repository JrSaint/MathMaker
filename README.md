# MathMaker

A web app for 3rd and 4th graders to practice multi-digit multiplication on a place-value grid.

- Type a problem from your workbook (e.g. `364 × 57`) or generate a random one.
- The grid sets itself up automatically: place-value columns, carry-over rows, partial-product rows, and a final sum row, all aligned.
- Hints catch the common mistakes (swapping the carry and ones digit, adding instead of multiplying, multiplying instead of adding) and explain the next step.
- Once the multiplication is correct, the answer digits turn green as the child enters them in the bottom row.

## Run locally

It's a static site — just open `index.html` in a browser, or serve the directory with any static file server:

```sh
python3 -m http.server 8123
```

Then visit <http://localhost:8123>.

## Install as a Home Screen app (iPhone / iPad)

1. Open the hosted URL in Safari.
2. Tap the Share button → **Add to Home Screen**.
3. The app launches fullscreen from the Home Screen with its own icon.

## Tech

Plain HTML, CSS, and JavaScript — no build step, no dependencies. The grid is laid out with CSS Grid; state is kept in memory and persisted to `localStorage` (current problem and solved count).

## Icons

Source PNG is in `icons/` along with the resize script (`make_icons.py`) that generates the various sizes referenced by `manifest.json` and `apple-touch-icon`.
