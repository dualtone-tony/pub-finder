Icon source. `art.js` holds the SVG artwork; regenerate every PNG in `assets/` with:

    node assets/source/render.js "$PWD/assets" "$PWD/assets/source"

(needs Playwright + Chromium). `preview.png` shows the iOS, Android adaptive,
Android monochrome and favicon variants.
