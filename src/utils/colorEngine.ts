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

export interface HarmonySlotSpec {
  hueOffset: number;
  lightness: number;
  satDelta: number;
}

export function getHarmonyBlueprint(mode: HarmonyMode): HarmonySlotSpec[] {
  switch (mode) {
    case 'analogous':
      return [
        { hueOffset: -36, lightness: 28, satDelta: 0 },
        { hueOffset: -18, lightness: 44, satDelta: 0 },
        { hueOffset: 0, lightness: 56, satDelta: 0 },
        { hueOffset: 18, lightness: 68, satDelta: 0 },
        { hueOffset: 36, lightness: 84, satDelta: -10 },
      ];
    case 'complementary':
      return [
        { hueOffset: 0, lightness: 26, satDelta: 0 },
        { hueOffset: 0, lightness: 52, satDelta: 0 },
        { hueOffset: 0, lightness: 82, satDelta: -20 },
        { hueOffset: 180, lightness: 48, satDelta: 0 },
        { hueOffset: 180, lightness: 68, satDelta: 0 },
      ];
    case 'triadic':
      return [
        { hueOffset: 0, lightness: 34, satDelta: 0 },
        { hueOffset: 0, lightness: 58, satDelta: 0 },
        { hueOffset: 120, lightness: 48, satDelta: 0 },
        { hueOffset: 240, lightness: 52, satDelta: 0 },
        { hueOffset: 240, lightness: 82, satDelta: -15 },
      ];
    case 'split-complementary':
      return [
        { hueOffset: 0, lightness: 30, satDelta: 0 },
        { hueOffset: 0, lightness: 56, satDelta: 0 },
        { hueOffset: 150, lightness: 48, satDelta: 0 },
        { hueOffset: 210, lightness: 54, satDelta: 0 },
        { hueOffset: 210, lightness: 86, satDelta: -25 },
      ];
    case 'monochromatic':
    default:
      return [
        { hueOffset: 0, lightness: 18, satDelta: 0 },
        { hueOffset: 0, lightness: 36, satDelta: 0 },
        { hueOffset: 0, lightness: 54, satDelta: 0 },
        { hueOffset: 0, lightness: 72, satDelta: 0 },
        { hueOffset: 0, lightness: 88, satDelta: 0 },
      ];
  }
}

/**
 * Signed shortest angular distance on the 360-degree colour wheel in [-180, 180].
 */
export function shortestHueDelta(fromHue: number, toHue: number): number {
  return ((((toHue - fromHue) % 360) + 540) % 360) - 180;
}

/**
 * Unsigned circular distance between two hues in [0, 180].
 */
export function circularHueDistance(h1: number, h2: number): number {
  return Math.abs(shortestHueDelta(h1, h2));
}

/**
 * Interpolates between two hues along the shortest circular arc.
 */
export function interpolateHue(fromHue: number, toHue: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const delta = shortestHueDelta(fromHue, toHue);
  return Math.round((((fromHue + delta * clampedT) % 360) + 360) % 360);
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

export interface GeneratePaletteOptions {
  /**
   * Optional variation step (0 = canonical harmonic stops; >0 = bounded saturation/lightness
   * and chord-order exploration so repeated generation produces fresh compatible palettes).
   */
  variationStep?: number;
  /**
   * Optional custom PRNG in [0, 1) used when no swatches are locked.
   */
  randomFn?: () => number;
}

/**
 * Generates a 5-swatch harmonic palette that honours locked swatches:
 * - 0 locked swatches: generates a fresh harmonic scale from a random seed hue.
 * - 1 locked swatch: uses the locked swatch's HSL and slot position as the harmony anchor,
 *   computing the root hue so all unlocked slots form the requested harmony around the locked swatch.
 * - 2..4 locked swatches: preserves all locked swatches in place and synthesizes compatible
 *   colours for unlocked slots (interpolating along the shortest hue arc between locked anchors
 *   for analogous mode, adopting the nearest locked anchor hue for monochromatic mode, or filling
 *   missing harmonic chord counterparts for complementary/triadic/split-complementary modes).
 * - All 5 locked: returns the swatches unchanged.
 */
export function generatePaletteWithLocks(
  currentSwatches: PaletteSwatch[],
  mode: HarmonyMode,
  options: GeneratePaletteOptions = {}
): PaletteSwatch[] {
  const { variationStep = 0, randomFn = Math.random } = options;
  const blueprint = getHarmonyBlueprint(mode);

  const lockedIndices: number[] = [];
  currentSwatches.forEach((sw, idx) => {
    if (sw.locked) lockedIndices.push(idx);
  });

  // Case 1: All swatches locked -> preserve as-is (normalized to canonical #RRGGBB)
  if (lockedIndices.length >= currentSwatches.length) {
    return currentSwatches.map((sw) => ({
      ...sw,
      hex: normalizeHex(sw.hex) ?? sw.hex,
    }));
  }

  // Case 2: No swatches locked -> random seed hue with full harmony generation
  if (lockedIndices.length === 0) {
    const randomHue = Math.floor(randomFn() * 360);
    const randomSeedHex = hslToHex({ h: randomHue, s: 78, l: 52 });
    const generated = generateHarmonicHexes(randomSeedHex, mode);
    return currentSwatches.map((sw, idx) => ({
      ...sw,
      hex: generated[idx] ?? sw.hex,
    }));
  }

  const usedHexes = new Set<string>(
    lockedIndices.map((idx) => normalizeHex(currentSwatches[idx].hex) ?? currentSwatches[idx].hex)
  );

  const satShift = variationStep > 0 ? (((variationStep * 11) % 17) - 8) : 0;
  const lightShift = variationStep > 0 ? (((variationStep * 7) % 13) - 6) : 0;

  const ensureDistinctHex = (h: number, s: number, l: number): string => {
    const clampedS = Math.max(20, Math.min(95, Math.round(s)));
    const clampedL = Math.max(14, Math.min(90, Math.round(l)));
    let candidate = hslToHex({ h, s: clampedS, l: clampedL });
    if (!usedHexes.has(candidate)) {
      usedHexes.add(candidate);
      return candidate;
    }
    for (const deltaL of [12, -12, 22, -22, 30, -30]) {
      const altL = Math.max(12, Math.min(92, clampedL + deltaL));
      candidate = hslToHex({ h, s: clampedS, l: altL });
      if (!usedHexes.has(candidate)) {
        usedHexes.add(candidate);
        return candidate;
      }
    }
    usedHexes.add(candidate);
    return candidate;
  };

  // Case 3: Single locked swatch -> anchor harmony root to the locked swatch's slot & HSL
  if (lockedIndices.length === 1) {
    const anchorIdx = lockedIndices[0];
    const anchorSwatch = currentSwatches[anchorIdx];
    const anchorHsl = hexToHsl(anchorSwatch.hex);
    const anchorSlot = blueprint[anchorIdx] ?? blueprint[0];
    const rootHue = (((anchorHsl.h - anchorSlot.hueOffset) % 360) + 360) % 360;
    const baseSat =
      anchorHsl.s < 10 ? 70 : Math.max(35, Math.min(90, anchorHsl.s));

    return currentSwatches.map((sw, idx) => {
      if (sw.locked) return { ...sw, hex: normalizeHex(sw.hex) ?? sw.hex };
      const slot = blueprint[idx] ?? blueprint[0];
      const targetHue = (((rootHue + slot.hueOffset) % 360) + 360) % 360;
      const targetSat = baseSat + slot.satDelta + satShift;
      const targetLight = slot.lightness + lightShift;
      return {
        ...sw,
        hex: ensureDistinctHex(targetHue, targetSat, targetLight),
      };
    });
  }

  // Case 4: Multiple locked swatches (2..4 locked) -> multi-anchor synthesis
  const lockedAnchors = lockedIndices.map((index) => {
    const normHex = normalizeHex(currentSwatches[index].hex) ?? currentSwatches[index].hex;
    return {
      index,
      hex: normHex,
      hsl: hexToHsl(normHex),
    };
  });

  const chromaticAnchors = lockedAnchors.filter((a) => a.hsl.s >= 10);
  const avgSat =
    chromaticAnchors.length > 0
      ? Math.round(
          chromaticAnchors.reduce((acc, a) => acc + a.hsl.s, 0) /
            chromaticAnchors.length
        )
      : 70;
  const baseSat = Math.max(35, Math.min(90, avgSat));

  const chordOffsets: Record<HarmonyMode, number[]> = {
    analogous: [-36, -18, 0, 18, 36],
    complementary: [0, 180],
    triadic: [0, 120, 240],
    'split-complementary': [0, 150, 210],
    monochromatic: [0],
  };

  const activeHues: number[] = lockedAnchors.map((a) => a.hsl.h);

  // Build candidate chord hues for complementary / triadic / split-complementary
  const candidateChordHues: number[] = [];
  const offsets = chordOffsets[mode];
  // Prioritize non-zero harmonic partners of each locked swatch first, then anchor hues
  for (let offIdx = 1; offIdx < offsets.length; offIdx++) {
    for (const anchor of lockedAnchors) {
      candidateChordHues.push((((anchor.hsl.h + offsets[offIdx]) % 360) + 360) % 360);
    }
  }
  for (const anchor of lockedAnchors) {
    candidateChordHues.push(anchor.hsl.h);
  }

  let unlockedCounter = 0;

  return currentSwatches.map((sw, idx) => {
    if (sw.locked) return { ...sw, hex: normalizeHex(sw.hex) ?? sw.hex };

    const slot = blueprint[idx] ?? blueprint[0];
    // Find nearest locked anchor by index distance
    const nearestAnchor = lockedAnchors.reduce((best, curr) =>
      Math.abs(curr.index - idx) < Math.abs(best.index - idx) ? curr : best
    );

    let targetHue = nearestAnchor.hsl.h;

    if (mode === 'monochromatic') {
      targetHue = nearestAnchor.hsl.h;
    } else if (mode === 'analogous') {
      const leftAnchor = [...lockedAnchors]
        .reverse()
        .find((a) => a.index < idx);
      const rightAnchor = lockedAnchors.find((a) => a.index > idx);

      if (leftAnchor && rightAnchor) {
        const t =
          (idx - leftAnchor.index) / (rightAnchor.index - leftAnchor.index);
        targetHue = interpolateHue(leftAnchor.hsl.h, rightAnchor.hsl.h, t);
      } else {
        const stepOffset = (idx - nearestAnchor.index) * 18;
        targetHue = (((nearestAnchor.hsl.h + stepOffset) % 360) + 360) % 360;
      }
    } else {
      // Pick harmonic chord candidate that best complements existing hues
      const rankedCandidates = [...candidateChordHues].sort((hA, hB) => {
        const minDistA = Math.min(
          ...activeHues.map((existing) => circularHueDistance(hA, existing))
        );
        const minDistB = Math.min(
          ...activeHues.map((existing) => circularHueDistance(hB, existing))
        );
        return minDistB - minDistA;
      });
      const pickIndex =
        (unlockedCounter + Math.max(0, variationStep)) %
        Math.max(1, rankedCandidates.length);
      targetHue = rankedCandidates[pickIndex] ?? nearestAnchor.hsl.h;
      activeHues.push(targetHue);
    }

    unlockedCounter += 1;
    const targetSat = baseSat + slot.satDelta + satShift;
    const targetLight = slot.lightness + lightShift;

    return {
      ...sw,
      hex: ensureDistinctHex(targetHue, targetSat, targetLight),
    };
  });
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
