const { chromium } = require('playwright');
const { fg, bg, svg, scaled } = require('./art.js');
const out = process.argv[2];
// Full icon: artwork nudged up slightly so the pin + origins sit visually centred.
const full = bg() + scaled(`<g transform="translate(0 -40)">${fg()}</g>`, 0.9);
const jobs = [
  ['icon.png', 1024, svg(full)],
  ['favicon.png', 48, svg(full)],
  ['splash-icon.png', 1024, svg(scaled(`<g transform="translate(0 -40)">${fg()}</g>`, 0.9))],
  // Android adaptive: only the centre ~61% is guaranteed visible, so shrink the foreground.
  ['android-icon-foreground.png', 512, svg(scaled(`<g transform="translate(0 -40)">${fg()}</g>`, 0.62))],
  ['android-icon-background.png', 512, svg(bg())],
  ['android-icon-monochrome.png', 432, svg(scaled(`<g transform="translate(0 -40)">${fg({ mono: true })}</g>`, 0.62))],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, size, markup] of jobs) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${markup.replace(/width="1024" height="1024" viewBox/, `width="${size}" height="${size}" viewBox`)}</body></html>`);
    await p.locator('svg').screenshot({ path: `${out}/${name}`, omitBackground: true });
  }
  // Preview sheet: iOS rounded square + Android circle mask.
  await p.setViewportSize({ width: 900, height: 420 });
  require('fs').writeFileSync(`${process.argv[3]}/preview.html`, `<body style="margin:0;background:#e5e5e5;display:flex;gap:40px;padding:40px;align-items:center">
    <img src="file://${out}/icon.png" style="width:300px;border-radius:66px">
    <div style="flex:none;width:300px;height:300px;border-radius:50%;overflow:hidden;position:relative">
      <img src="file://${out}/android-icon-background.png" style="position:absolute;width:136%;left:-18%;top:-18%">
      <img src="file://${out}/android-icon-foreground.png" style="position:absolute;width:136%;left:-18%;top:-18%"></div>
    <div style="flex:none;width:120px;height:120px;border-radius:50%;overflow:hidden;position:relative;background:#444">
      <img src="file://${out}/android-icon-monochrome.png" style="position:absolute;width:136%;left:-18%;top:-18%"></div>
    <img src="file://${out}/favicon.png" style="width:48px"></body>`);
  await p.goto(`file://${process.argv[3]}/preview.html`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${process.argv[3]}/preview.png` });
  await b.close();
})();
