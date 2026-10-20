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
  formatPaletteTokens,
} from '../utils/colorEngine';
import App from '../App';

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
});
