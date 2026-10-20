export interface RgbColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HslColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export type HarmonyMode =
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'split-complementary'
  | 'monochromatic';

export interface PaletteSwatch {
  id: string;
  hex: string;
  name: string;
  locked: boolean;
}

export interface SavedPalette {
  id: string;
  title: string;
  swatches: string[];
  createdAt: string;
}

/**
 * Normalizes any 3-digit or 6-digit hex string into uppercase #RRGGBB.
 */
export function normalizeHex(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return `#${(r + g + b).toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex) ?? '#000000';
  const intVal = parseInt(norm.slice(1), 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hn >= 0 && hn < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hn >= 60 && hn < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hn >= 120 && hn < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hn >= 180 && hn < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hn >= 240 && hn < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

export function hexToHsl(hex: string): HslColor {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: HslColor): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * WCAG 2.1 Relative Luminance:
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (channel8Bit: number) => {
    const sRGB = channel8Bit / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  const R = transform(r);
  const G = transform(g);
  const B = transform(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export interface WcagContrastAudit {
  ratio: number;
  aaNormal: boolean;   // >= 4.5
  aaLarge: boolean;    // >= 3.0
  aaaNormal: boolean;  // >= 7.0
  aaaLarge: boolean;   // >= 4.5
  uiComponents: boolean; // >= 3.0
  levelBadge: 'AAA' | 'AA' | 'AA Large Only' | 'Fail';
}

/**
 * Computes exact WCAG 2.1 contrast ratio (L1 + 0.05) / (L2 + 0.05)
 */
export function calculateWcagContrast(foregroundHex: string, backgroundHex: string): WcagContrastAudit {
  const lum1 = getRelativeLuminance(foregroundHex);
  const lum2 = getRelativeLuminance(backgroundHex);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const rawRatio = (brightest + 0.05) / (darkest + 0.05);
  const ratio = Math.round(rawRatio * 100) / 100;

  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3.0;
  const aaaNormal = ratio >= 7.0;
  const aaaLarge = ratio >= 4.5;
  const uiComponents = ratio >= 3.0;

  let levelBadge: WcagContrastAudit['levelBadge'] = 'Fail';
  if (aaaNormal) {
    levelBadge = 'AAA';
  } else if (aaNormal) {
    levelBadge = 'AA';
  } else if (aaLarge) {
    levelBadge = 'AA Large Only';
  }

  return {
    ratio,
    aaNormal,
    aaLarge,
    aaaNormal,
    aaaLarge,
    uiComponents,
    levelBadge,
  };
}

/**
 * Generates a 5-colour harmonic palette from a base HSL seed and harmony rule.
 */
export function generateHarmonicHexes(baseHex: string, mode: HarmonyMode): string[] {
  const base = hexToHsl(baseHex);
  const h = base.h;
  const s = Math.max(35, Math.min(90, base.s));

  switch (mode) {
    case 'analogous':
      return [
        hslToHex({ h: (h - 36 + 360) % 360, s, l: 28 }),
        hslToHex({ h: (h - 18 + 360) % 360, s, l: 44 }),
        hslToHex({ h, s, l: 56 }),
        hslToHex({ h: (h + 18) % 360, s, l: 68 }),
        hslToHex({ h: (h + 36) % 360, s: Math.max(25, s - 10), l: 84 }),
      ];
    case 'complementary':
      return [
        hslToHex({ h, s, l: 26 }),
        hslToHex({ h, s, l: 52 }),
        hslToHex({ h, s: Math.max(20, s - 20), l: 82 }),
        hslToHex({ h: (h + 180) % 360, s, l: 48 }),
        hslToHex({ h: (h + 180) % 360, s, l: 68 }),
      ];
    case 'triadic':
      return [
        hslToHex({ h, s, l: 34 }),
        hslToHex({ h, s, l: 58 }),
        hslToHex({ h: (h + 120) % 360, s, l: 48 }),
        hslToHex({ h: (h + 240) % 360, s, l: 52 }),
        hslToHex({ h: (h + 240) % 360, s: Math.max(25, s - 15), l: 82 }),
      ];
    case 'split-complementary':
      return [
        hslToHex({ h, s, l: 30 }),
        hslToHex({ h, s, l: 56 }),
        hslToHex({ h: (h + 150) % 360, s, l: 48 }),
        hslToHex({ h: (h + 210) % 360, s, l: 54 }),
        hslToHex({ h: (h + 210) % 360, s: 35, l: 86 }),
      ];
    case 'monochromatic':
    default:
      return [
        hslToHex({ h, s, l: 18 }),
        hslToHex({ h, s, l: 36 }),
        hslToHex({ h, s, l: 54 }),
        hslToHex({ h, s, l: 72 }),
        hslToHex({ h, s, l: 88 }),
      ];
  }
}

export type ExportFormat = 'css' | 'tailwind' | 'json';

export function formatPaletteTokens(hexList: string[], format: ExportFormat): string {
  if (format === 'css') {
    const lines = hexList.map((hex, i) => {
      const { r, g, b } = hexToRgb(hex);
      return `  --palette-${(i + 1) * 100}: ${hex}; /* rgb(${r}, ${g}, ${b}) */`;
    });
    return `:root {\n${lines.join('\n')}\n}`;
  }

  if (format === 'tailwind') {
    const entries = hexList.map((hex, i) => `        ${(i + 1) * 100}: '${hex}',`);
    return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: {\n${entries.join('\n')}\n        }\n      }\n    }\n  }\n};`;
  }

  const obj: Record<string, { value: string; rgb: string; hsl: string }> = {};
  hexList.forEach((hex, i) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb);
    obj[`swatch-${(i + 1) * 100}`] = {
      value: hex,
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    };
  });
  return JSON.stringify({ palette: obj }, null, 2);
}
