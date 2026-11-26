// Shared icon artwork. art(opts) returns SVG markup for a 1024x1024 canvas.
const PIN = 'M512,836 C452,742 292,628 292,446 A220,220 0 1 1 732,446 C732,628 572,742 512,836 Z';
const FOAM = 'M250,180 H780 V372 C752,402 722,380 700,398 C676,420 640,392 614,404 C588,418 560,388 532,402 C504,416 476,390 450,404 C422,418 392,390 366,402 C340,414 310,392 290,402 L250,402 Z';
function fg({ mono = false } = {}) {
  const white = '#FFFFFF';
  if (mono) return `
    <path d="M196,940 C230,860 330,840 420,860 C470,870 500,850 512,836" fill="none" stroke="${white}" stroke-width="22" stroke-linecap="round" stroke-dasharray="2 44"/>
    <path d="M828,940 C794,860 694,840 604,860 C554,870 524,850 512,836" fill="none" stroke="${white}" stroke-width="22" stroke-linecap="round" stroke-dasharray="2 44"/>
    <circle cx="196" cy="940" r="34" fill="${white}"/><circle cx="828" cy="940" r="34" fill="${white}"/>
    <path d="${PIN}" fill="${white}"/>`;
  return `
    <defs>
      <linearGradient id="beer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FCD34D"/><stop offset="0.55" stop-color="#F59E0B"/><stop offset="1" stop-color="#B45309"/>
      </linearGradient>
      <clipPath id="pin"><path d="${PIN}"/></clipPath>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/>
      </filter>
    </defs>
    <g fill="none" stroke-width="20" stroke-linecap="round" stroke-dasharray="1 42" opacity="0.95">
      <path d="M196,940 C230,860 330,840 420,860 C470,870 500,850 512,836" stroke="#93C5FD"/>
      <path d="M828,940 C794,860 694,840 604,860 C554,870 524,850 512,836" stroke="#F9A8D4"/>
    </g>
    <circle cx="196" cy="940" r="36" fill="#2563EB" stroke="#fff" stroke-width="12"/>
    <circle cx="828" cy="940" r="36" fill="#DB2777" stroke="#fff" stroke-width="12"/>
    <g filter="url(#shadow)"><path d="${PIN}" fill="url(#beer)"/></g>
    <g clip-path="url(#pin)">
      <path d="${FOAM}" fill="#FFF8E7"/>
      <circle cx="380" cy="300" r="40" fill="#FFFFFF"/><circle cx="470" cy="270" r="52" fill="#FFFFFF"/>
      <circle cx="580" cy="285" r="46" fill="#FFFFFF"/><circle cx="660" cy="320" r="34" fill="#FFFFFF"/>
      <g fill="#FFF7D6" opacity="0.75">
        <circle cx="430" cy="520" r="12"/><circle cx="470" cy="600" r="8"/><circle cx="560" cy="480" r="10"/>
        <circle cx="600" cy="560" r="14"/><circle cx="520" cy="660" r="9"/><circle cx="455" cy="460" r="7"/>
        <circle cx="575" cy="640" r="6"/><circle cx="505" cy="540" r="6"/>
      </g>
      <path d="M352,430 C352,540 380,620 430,690" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="26" stroke-linecap="round" fill="none"/>
    </g>
    <path d="${PIN}" fill="none" stroke="#78350F" stroke-opacity="0.35" stroke-width="6"/>`;
}
function bg() {
  return `
    <defs>
      <radialGradient id="bg" cx="0.5" cy="0.38" r="0.75">
        <stop offset="0" stop-color="#3B2F7A"/><stop offset="0.6" stop-color="#1E1B4B"/><stop offset="1" stop-color="#0F0D2E"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <g stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="10" fill="none">
      <path d="M-20,250 C200,300 380,180 620,240 S900,200 1044,150"/>
      <path d="M-20,700 C220,640 380,760 640,700 S900,760 1044,720"/>
      <path d="M220,-20 C260,250 160,500 260,1044"/>
      <path d="M820,-20 C760,300 880,560 780,1044"/>
    </g>
    <g fill="#FDE68A" opacity="0.5">
      <circle cx="150" cy="150" r="5"/><circle cx="880" cy="120" r="4"/><circle cx="930" cy="420" r="3"/>
      <circle cx="90" cy="500" r="3"/><circle cx="760" cy="80" r="3"/>
    </g>`;
}
const svg = (inner, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`;
// Scale content about the centre (for adaptive-icon safe zone / splash padding).
const scaled = (inner, s) => `<g transform="translate(512 512) scale(${s}) translate(-512 -512)">${inner}</g>`;
module.exports = { fg, bg, svg, scaled };
