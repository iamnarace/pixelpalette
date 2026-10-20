# Changelog

## [1.0.1] - 2026-10-20

### Changed
- **Locked Swatch Harmony Synthesis:** Implemented `generatePaletteWithLocks` so single and multiple locked swatches act as true colour-wheel anchors across all five harmony modes (*Analogous*, *Complementary*, *Triadic*, *Split-Complementary*, and *Monochromatic*).
- **Deterministic Generation & Shorthand Normalization:** Added deterministic `variationStep` and `randomFn` support and normalized locked 3-digit hex codes to canonical `#RRGGBB` format.
- **Build & Test Tooling:** Upgraded Vite to v6 and Vitest to v4 with multi-lock, achromatic, and determinism regression tests.

## [1.0.0] - 2026-10-20

### Added
- **Harmonic Palette Generator:** Generate 5-swatch colour schemes across Analogous, Complementary, Triadic, Split-Complementary, and Monochromatic rules with individual swatch locking.
- **WCAG 2.1 Accessibility Contrast Auditor:** Exact W3C relative luminance and contrast ratio calculator (`1:1` to `21:1`) with live typography preview and AA/AAA pass/fail matrix.
- **HEX / RGB / HSL Colour Space Converter & 3-Stop CSS Gradient Composer:** Bi-directional channel conversion and interactive linear/radial CSS gradient builder.
- **Design Token Exporter & Saved Library:** Export palettes to CSS Custom Properties (`:root`), Tailwind config, or W3C Design Token JSON.
