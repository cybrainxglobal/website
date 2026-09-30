// Small helpers shared by the generator modules. No dependencies.
import { createHash } from 'node:crypto';

export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Plain text → escaped <p> blocks (blank line = new paragraph). */
export const paragraphs = (text) =>
  String(text ?? '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n');

/** ["a","b","c"] → "a, b and c" */
export function joinList(items, and) {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ${and} ${list[list.length - 1]}`;
}

export const sha256 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** Today's date (YYYY-MM-DD) in the site's time zone. */
export function today(timeZone = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** "2026-04-09" → "April 9, 2026" / "9 de abril de 2026" */
export function formatDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// ─── Colors ─────────────────────────────────────────────────────────────────

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;

/** Mix `hex` with `other` (0 = hex, 1 = other). */
export const mix = (hex, other, amount) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
};

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nudge a brand color toward `toward` (black or white) until it reaches
 * `ratio` contrast against `background`, so links and labels stay legible
 * whatever color an app picks.
 */
export function readable(hex, background, toward, ratio = 4.5) {
  let color = hex;
  for (let step = 1; step <= 20 && contrast(color, background) < ratio; step++) {
    color = mix(hex, toward, step * 0.05);
  }
  return color;
}

/** Rotate the hue of a color (degrees) — used to derive a second gradient stop. */
export function shiftHue(hex, degrees) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([r1 + m, g1 + m, b1 + m].map((v) => v * 255));
}
