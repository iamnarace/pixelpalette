import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  normalizeHex,
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  getRelativeLuminance,
  calculateWcagContrast,
  generateHarmonicHexes,
  generatePaletteWithLocks,
  circularHueDistance,
  interpolateHue,
  PaletteSwatch,
  formatPaletteTokens,
} from '../utils/colorEngine';
import { App } from '../App';

describe('PixelPalette Colour Space & WCAG 2.1 Contrast Suite', () => {
  it('normalizes 3-digit and 6-digit HEX strings and converts between HEX, RGB, and HSL', () => {
    expect(normalizeHex('#f0a')).toBe('#FF00AA');
    expect(normalizeHex('3b82f6')).toBe('#3B82F6');
    expect(normalizeHex('invalid')).toBeNull();

    const rgb = hexToRgb('#FF5733');
    expect(rgb).toEqual({ r: 255, g: 87, b: 51 });
    expect(rgbToHex(rgb)).toBe('#FF5733');

    const hsl = hexToHsl('#FF0000');
    expect(hsl).toEqual({ h: 0, s: 100, l: 50 });
    expect(hslToHex(hsl)).toBe('#FF0000');
  });

  it('computes exact W3C WCAG 2.1 relative luminance and contrast ratios', () => {
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);

    const blackOnWhite = calculateWcagContrast('#000000', '#FFFFFF');
    expect(blackOnWhite.ratio).toBe(21);
    expect(blackOnWhite.aaaNormal).toBe(true);
    expect(blackOnWhite.levelBadge).toBe('AAA');

    const lowContrast = calculateWcagContrast('#94A3B8', '#FFFFFF');
    expect(lowContrast.aaNormal).toBe(false);
  });

  it('generates 5-swatch harmonic palettes and formats CSS/Tailwind/JSON tokens', () => {
    const triadic = generateHarmonicHexes('#6366F1', 'triadic');
    expect(triadic).toHaveLength(5);

    const cssTokens = formatPaletteTokens(triadic, 'css');
    expect(cssTokens).toContain(':root {');
    expect(cssTokens).toContain('--palette-100:');
  });

  it('renders PixelPalette Studio and navigates between Palette, Contrast, and Converter tabs', () => {
    render(<App />);
    expect(screen.getByText('PixelPalette')).toBeInTheDocument();
    expect(
      screen.getByText(/Export Design Tokens & CSS Variables/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /WCAG Contrast Auditor/i }));
    expect(
      screen.getByText(/WCAG 2.1 Accessibility Contrast Lab/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Color Space & Gradients/i }));
    expect(screen.getByText(/3-Stop CSS Gradient Composer/i)).toBeInTheDocument();
  });

  it('anchors palette generation around a single locked swatch across harmony modes', () => {
    // Lock slot 2 (index 2) to pure Emerald (#10B981, hue ~160)
    const baseSwatches: PaletteSwatch[] = [
      { id: '1', hex: '#FF0000', name: 'S1', locked: false },
      { id: '2', hex: '#FF8800', name: 'S2', locked: false },
      { id: '3', hex: '#10B981', name: 'S3', locked: true },
      { id: '4', hex: '#0000FF', name: 'S4', locked: false },
      { id: '5', hex: '#FF00FF', name: 'S5', locked: false },
    ];
    const anchorHue = hexToHsl('#10B981').h;

    // 1. Monochromatic: all unlocked swatches must match the locked anchor's hue
    const monoResult = generatePaletteWithLocks(baseSwatches, 'monochromatic');
    expect(monoResult[2].hex).toBe('#10B981');
    monoResult.forEach((sw, i) => {
      if (i !== 2) {
        expect(circularHueDistance(hexToHsl(sw.hex).h, anchorHue)).toBeLessThanOrEqual(2);
      }
    });

    // 2. Complementary: unlocked slots 3 and 4 should sit on the 180-degree complement hue
    const compResult = generatePaletteWithLocks(baseSwatches, 'complementary');
    expect(compResult[2].hex).toBe('#10B981');
    const complementHue = (anchorHue + 180) % 360;
    expect(circularHueDistance(hexToHsl(compResult[3].hex).h, complementHue)).toBeLessThanOrEqual(2);
    expect(circularHueDistance(hexToHsl(compResult[4].hex).h, complementHue)).toBeLessThanOrEqual(2);

    // 3. Analogous: all unlocked swatches stay within 36 degrees of the locked center swatch
    const analogousResult = generatePaletteWithLocks(baseSwatches, 'analogous');
    expect(analogousResult[2].hex).toBe('#10B981');
    analogousResult.forEach((sw) => {
      expect(circularHueDistance(hexToHsl(sw.hex).h, anchorHue)).toBeLessThanOrEqual(38);
    });
  });

  it('preserves multiple locked swatches and synthesizes compatible colours between and around them', () => {
    // Lock index 0 at Red (#EF4444, hue ~0) and index 4 at Amber/Yellow (#EAB308, hue ~45)
    const multiLocked: PaletteSwatch[] = [
      { id: '1', hex: '#EF4444', name: 'S1', locked: true },
      { id: '2', hex: '#111111', name: 'S2', locked: false },
      { id: '3', hex: '#222222', name: 'S3', locked: false },
      { id: '4', hex: '#333333', name: 'S4', locked: false },
      { id: '5', hex: '#EAB308', name: 'S5', locked: true },
    ];
    const h0 = hexToHsl('#EF4444').h;
    const h4 = hexToHsl('#EAB308').h;

    // Analogous: unlocked slots 1, 2, 3 interpolate smoothly along shortest arc between h0 and h4
    const analogousMulti = generatePaletteWithLocks(multiLocked, 'analogous');
    expect(analogousMulti[0].hex).toBe('#EF4444');
    expect(analogousMulti[4].hex).toBe('#EAB308');

    const h2Expected = interpolateHue(h0, h4, 0.5);
    expect(circularHueDistance(hexToHsl(analogousMulti[2].hex).h, h2Expected)).toBeLessThanOrEqual(3);

    // Complementary with 2 locked swatches: generates complementary chord partners
    const compMulti = generatePaletteWithLocks(multiLocked, 'complementary');
    expect(compMulti[0].hex).toBe('#EF4444');
    expect(compMulti[4].hex).toBe('#EAB308');
    const unlockedHues = [1, 2, 3].map((idx) => hexToHsl(compMulti[idx].hex).h);
    // At least one unlocked swatch should represent the complement of #EF4444 (h0 + 180)
    const hasRedComplement = unlockedHues.some(
      (uh) => circularHueDistance(uh, (h0 + 180) % 360) <= 3
    );
    expect(hasRedComplement).toBe(true);

    // All 5 locked: returns exact same hex values unchanged
    const allLocked = multiLocked.map((s) => ({ ...s, locked: true }));
    const unchanged = generatePaletteWithLocks(allLocked, 'triadic');
    expect(unchanged.map((s) => s.hex)).toEqual(allLocked.map((s) => s.hex));
  });

  it('handles unusual lock combinations (non-adjacent locks, achromatic locks, 3-digit hexes) across all 5 harmony modes and guarantees deterministic output for identical inputs', () => {
    const modes = [
      'analogous',
      'complementary',
      'triadic',
      'split-complementary',
      'monochromatic',
    ] as const;

    // Non-adjacent locked slots [0, 2, 4] including achromatic black (#000000) and shorthand (#f0a -> #FF00AA)
    const nonAdjacentLocks: PaletteSwatch[] = [
      { id: '1', hex: '#000000', name: 'S1', locked: true },
      { id: '2', hex: '#123456', name: 'S2', locked: false },
      { id: '3', hex: '#f0a', name: 'S3', locked: true },
      { id: '4', hex: '#654321', name: 'S4', locked: false },
      { id: '5', hex: '#FFFFFF', name: 'S5', locked: true },
    ];

    for (const mode of modes) {
      const runA = generatePaletteWithLocks(nonAdjacentLocks, mode, { variationStep: 2 });
      const runB = generatePaletteWithLocks(nonAdjacentLocks, mode, { variationStep: 2 });

      // Deterministic for identical inputs and variationStep
      expect(runA).toEqual(runB);

      // Locked slots [0, 2, 4] are preserved (with #f0a normalized to #FF00AA)
      expect(runA[0].hex).toBe('#000000');
      expect(runA[2].hex).toBe('#FF00AA');
      expect(runA[4].hex).toBe('#FFFFFF');

      // Unlocked slots [1, 3] are valid 6-digit uppercase hex colours
      expect(runA[1].hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(runA[3].hex).toMatch(/^#[0-9A-F]{6}$/);
    }

    // 0-lock mode is also 100% deterministic when a seeded randomFn is provided
    const unlockedSwatches = nonAdjacentLocks.map((s) => ({ ...s, locked: false }));
    const seededA = generatePaletteWithLocks(unlockedSwatches, 'split-complementary', {
      randomFn: () => 0.37,
    });
    const seededB = generatePaletteWithLocks(unlockedSwatches, 'split-complementary', {
      randomFn: () => 0.37,
    });
    expect(seededA).toEqual(seededB);
  });

  it('honours locked swatches in the Palette Studio UI when clicking Generate Harmonic Palette', () => {
    render(<App />);
    // Lock the first swatch (#1E1B4B)
    const lockFirstBtn = screen.getByRole('button', { name: /Lock swatch #1E1B4B/i });
    fireEvent.click(lockFirstBtn);

    expect(screen.getByTestId('locked-anchor-status')).toHaveTextContent(
      /Anchored to 1 locked swatch/i
    );

    const generateBtn = screen.getByRole('button', { name: /Generate Harmonic Palette/i });
    fireEvent.click(generateBtn);

    // First swatch remains locked at #1E1B4B
    expect(screen.getByRole('button', { name: /Unlock swatch #1E1B4B/i })).toBeInTheDocument();
  });
});
