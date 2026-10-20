import { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Contrast,
  Sliders,
  Sparkles,
  Lock,
  Unlock,
  Copy,
  Check,
  RefreshCw,
  Bookmark,
  Trash2,
  ArrowLeftRight,
  Code2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  HarmonyMode,
  PaletteSwatch,
  SavedPalette,
  ExportFormat,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  hexToHsl,
  calculateWcagContrast,
  generatePaletteWithLocks,
  formatPaletteTokens,
} from './utils/colorEngine';

type StudioTab = 'palette' | 'contrast' | 'converter';

const STORAGE_SAVED_KEY = 'pixelpalette_saved_v1';

const INITIAL_SWATCHES: PaletteSwatch[] = [
  { id: 'sw-1', hex: '#1E1B4B', name: 'Deep Indigo 100', locked: false },
  { id: 'sw-2', hex: '#4338CA', name: 'Royal Violet 200', locked: false },
  { id: 'sw-3', hex: '#6366F1', name: 'Electric Iris 300', locked: false },
  { id: 'sw-4', hex: '#EC4899', name: 'Magenta Pulse 400', locked: false },
  { id: 'sw-5', hex: '#FDF2F8', name: 'Rose Quartz 500', locked: false },
];

const DEFAULT_SAVED_PALETTES: SavedPalette[] = [
  {
    id: 'pal-1',
    title: 'Nordic Aurora UI',
    swatches: ['#0F172A', '#1E293B', '#0EA5E9', '#38BDF8', '#E0F2FE'],
    createdAt: '2026-10-18',
  },
  {
    id: 'pal-2',
    title: 'Editorial Warm Terracotta',
    swatches: ['#1C1917', '#7C2D12', '#C84B31', '#F59E0B', '#FAF8F5'],
    createdAt: '2026-10-19',
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('palette');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Palette Generator & Export State
  const [swatches, setSwatches] = useState<PaletteSwatch[]>(INITIAL_SWATCHES);
  const [harmony, setHarmony] = useState<HarmonyMode>('analogous');
  const [variationStep, setVariationStep] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('css');
  const [paletteTitle, setPaletteTitle] = useState<string>('Cyber Iris System');
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SAVED_PALETTES;
  });

  // 2. WCAG Contrast Checker State
  const [fgHex, setFgHex] = useState<string>('#FFFFFF');
  const [bgHex, setBgHex] = useState<string>('#4338CA');

  // 3. Converter & Gradient Builder State
  const [convHexInput, setConvHexInput] = useState<string>('#6366F1');
  const [gradType, setGradType] = useState<'linear' | 'radial'>('linear');
  const [gradAngle, setGradAngle] = useState<number>(135);
  const [gradStart, setGradStart] = useState<string>('#4338CA');
  const [gradMid, setGradMid] = useState<string>('#EC4899');
  const [gradEnd, setGradEnd] = useState<string>('#F59E0B');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(savedPalettes));
    } catch {
      // Ignore quota errors
    }
  }, [savedPalettes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as StudioTab | null;
    if (tab && ['palette', 'contrast', 'converter'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    setCopiedId(key);
    setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1600);
  };

  // Generate new harmonic palette respecting locked swatches
  const handleGeneratePalette = (nextHarmony = harmony, resetVariation = false) => {
    const step = resetVariation ? 0 : variationStep;
    setSwatches((prev) =>
      generatePaletteWithLocks(prev, nextHarmony, {
        variationStep: step,
      })
    );
    setVariationStep(step + 1);
  };

  const toggleLockSwatch = (id: string) => {
    setVariationStep(0);
    setSwatches((prev) =>
      prev.map((sw) => (sw.id === id ? { ...sw, locked: !sw.locked } : sw))
    );
  };

  const updateSwatchHex = (id: string, nextValue: string) => {
    const norm = normalizeHex(nextValue);
    if (!norm) return;
    setSwatches((prev) =>
      prev.map((sw) => (sw.id === id ? { ...sw, hex: norm } : sw))
    );
  };

  const handleSavePalette = () => {
    const entry: SavedPalette = {
      id: `pal-${Date.now()}`,
      title: paletteTitle.trim() || 'Untitled Palette',
      swatches: swatches.map((s) => s.hex),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSavedPalettes((prev) => [entry, ...prev]);
  };

  const handleLoadSavedPalette = (pal: SavedPalette) => {
    setPaletteTitle(pal.title);
    setSwatches((prev) =>
      prev.map((sw, i) => ({
        ...sw,
        hex: pal.swatches[i] ?? sw.hex,
        locked: false,
      }))
    );
  };

  const exportedTokens = useMemo(
    () =>
      formatPaletteTokens(
        swatches.map((s) => s.hex),
        exportFormat
      ),
    [swatches, exportFormat]
  );

  // Contrast audit computation
  const contrastAudit = useMemo(
    () => calculateWcagContrast(fgHex, bgHex),
    [fgHex, bgHex]
  );

  // Converter derived values
  const validConvHex = normalizeHex(convHexInput) ?? '#6366F1';
  const convRgb = useMemo(() => hexToRgb(validConvHex), [validConvHex]);
  const convHsl = useMemo(() => hexToHsl(validConvHex), [validConvHex]);

  const gradientCss =
    gradType === 'linear'
      ? `linear-gradient(${gradAngle}deg, ${gradStart} 0%, ${gradMid} 50%, ${gradEnd} 100%)`
      : `radial-gradient(circle at center, ${gradStart} 0%, ${gradMid} 50%, ${gradEnd} 100%)`;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-500 text-white flex items-center justify-center shadow-md">
              <Palette className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  PixelPalette
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  WCAG 2.1 Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Design systems colour studio, contrast auditor, converter & CSS gradient lab
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Colour studio modes">
            {[
              { id: 'palette', label: 'Palette Studio & Tokens', icon: Sparkles },
              { id: 'contrast', label: 'WCAG Contrast Auditor', icon: Contrast },
              { id: 'converter', label: 'Color Space & Gradients', icon: Sliders },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as StudioTab)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: PALETTE STUDIO & TOKEN EXPORT */}
        {activeTab === 'palette' && (
          <div className="space-y-6">
            {/* Control Toolbar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="harmony-select" className="text-xs font-mono text-zinc-400">
                  Harmony Rule:
                </label>
                <select
                  id="harmony-select"
                  value={harmony}
                  onChange={(e) => {
                    const next = e.target.value as HarmonyMode;
                    setHarmony(next);
                    handleGeneratePalette(next, true);
                  }}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-100"
                >
                  <option value="analogous">Analogous Harmony</option>
                  <option value="complementary">Complementary Contrast</option>
                  <option value="triadic">Triadic Balance</option>
                  <option value="split-complementary">Split-Complementary</option>
                  <option value="monochromatic">Monochromatic Scale</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleGeneratePalette(harmony, false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate Harmonic Palette
                </button>
                {swatches.some((s) => s.locked) && (
                  <span
                    data-testid="locked-anchor-status"
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  >
                    Anchored to {swatches.filter((s) => s.locked).length} locked{' '}
                    {swatches.filter((s) => s.locked).length === 1 ? 'swatch' : 'swatches'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  aria-label="Palette name"
                  value={paletteTitle}
                  onChange={(e) => setPaletteTitle(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 w-44"
                  placeholder="Palette name..."
                />
                <button
                  type="button"
                  onClick={handleSavePalette}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-violet-400" />
                  Save Palette
                </button>
              </div>
            </div>

            {/* 5 Interactive Swatch Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {swatches.map((sw, idx) => {
                const rgb = hexToRgb(sw.hex);
                const hsl = hexToHsl(sw.hex);
                const whiteContrast = calculateWcagContrast('#FFFFFF', sw.hex).ratio;
                const darkContrast = calculateWcagContrast('#09090B', sw.hex).ratio;
                const useLightText = whiteContrast >= darkContrast;

                return (
                  <div
                    key={sw.id}
                    className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900 flex flex-col justify-between shadow-lg"
                  >
                    <div
                      style={{ backgroundColor: sw.hex }}
                      className="h-44 p-4 flex flex-col justify-between transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded backdrop-blur-xs ${
                            useLightText
                              ? 'bg-black/30 text-white'
                              : 'bg-white/40 text-zinc-950 font-semibold'
                          }`}
                        >
                          {(idx + 1) * 100}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleLockSwatch(sw.id)}
                          aria-label={sw.locked ? `Unlock swatch ${sw.hex}` : `Lock swatch ${sw.hex}`}
                          className={`p-2 rounded-lg backdrop-blur-xs cursor-pointer ${
                            useLightText
                              ? 'bg-black/30 text-white hover:bg-black/50'
                              : 'bg-white/50 text-zinc-950 hover:bg-white/70'
                          }`}
                        >
                          {sw.locked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div>
                        <p
                          className={`font-mono text-xl font-bold tracking-tight ${
                            useLightText ? 'text-white' : 'text-zinc-950'
                          }`}
                        >
                          {sw.hex}
                        </p>
                        <p
                          className={`text-[11px] font-mono ${
                            useLightText ? 'text-white/80' : 'text-zinc-900/80'
                          }`}
                        >
                          Contrast W:{whiteContrast}:1 / B:{darkContrast}:1
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2.5 text-xs font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="color"
                          aria-label={`Pick colour for swatch ${idx + 1}`}
                          value={sw.hex}
                          onChange={(e) => updateSwatchHex(sw.id, e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        />
                        <button
                          type="button"
                          onClick={() => copyText(sw.hex, sw.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === sw.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> {sw.hex}
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-zinc-400 space-y-0.5 pt-1 border-t border-zinc-800">
                        <div>
                          rgb({rgb.r}, {rgb.g}, {rgb.b})
                        </div>
                        <div>
                          hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: CSS/Tailwind/JSON Token Exporter & Saved Palettes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section
                aria-labelledby="export-heading"
                className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <h2 id="export-heading" className="text-base font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-violet-400" />
                    Export Design Tokens & CSS Variables
                  </h2>

                  <div className="flex items-center gap-2">
                    {(['css', 'tailwind', 'json'] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase cursor-pointer ${
                          exportFormat === fmt
                            ? 'bg-violet-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => copyText(exportedTokens, 'export-tokens')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                    >
                      {copiedId === 'export-tokens' ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-violet-200 overflow-x-auto">
                  {exportedTokens}
                </pre>
              </section>

              <section
                aria-labelledby="saved-heading"
                className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
              >
                <h2 id="saved-heading" className="text-base font-bold text-white border-b border-zinc-800 pb-3">
                  Saved Palettes ({savedPalettes.length})
                </h2>

                <ul className="space-y-3 max-h-64 overflow-y-auto">
                  {savedPalettes.map((pal) => (
                    <li
                      key={pal.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleLoadSavedPalette(pal)}
                            className="text-xs font-semibold text-white hover:text-violet-300 truncate cursor-pointer"
                          >
                            {pal.title}
                          </button>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {pal.createdAt}
                          </span>
                        </div>
                        <div className="flex h-5 rounded-md overflow-hidden border border-zinc-800">
                          {pal.swatches.map((hex, i) => (
                            <div
                              key={`${pal.id}-${i}`}
                              style={{ backgroundColor: hex }}
                              className="flex-1"
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSavedPalettes((prev) => prev.filter((p) => p.id !== pal.id))
                        }
                        aria-label={`Delete palette ${pal.title}`}
                        className="p-1.5 rounded hover:bg-rose-950 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: WCAG 2.1 CONTRAST AUDITOR */}
        {activeTab === 'contrast' && (
          <section aria-labelledby="contrast-heading" className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <h2 id="contrast-heading" className="text-xl font-bold text-white">
                    WCAG 2.1 Accessibility Contrast Lab
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Computed using the W3C relative luminance formula (L1 + 0.05) / (L2 + 0.05) across normal text, large headings, and UI components.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="fg-hex-input" className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                      Foreground (Text / Icon) HEX
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHex(fgHex) ?? '#FFFFFF'}
                        onChange={(e) => setFgHex(e.target.value.toUpperCase())}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent"
                      />
                      <input
                        id="fg-hex-input"
                        type="text"
                        value={fgHex}
                        onChange={(e) => setFgHex(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 font-mono text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const temp = fgHex;
                        setFgHex(bgHex);
                        setBgHex(temp);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Swap Foreground & Background
                    </button>
                  </div>

                  <div>
                    <label htmlFor="bg-hex-input" className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                      Background Surface HEX
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHex(bgHex) ?? '#4338CA'}
                        onChange={(e) => setBgHex(e.target.value.toUpperCase())}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent"
                      />
                      <input
                        id="bg-hex-input"
                        type="text"
                        value={bgHex}
                        onChange={(e) => setBgHex(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 font-mono text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Ratio Score Card */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase text-zinc-400">
                      Contrast Ratio
                    </span>
                    <div
                      data-testid="contrast-ratio-value"
                      className="font-mono text-4xl font-bold text-white mt-1"
                    >
                      {contrastAudit.ratio}:1
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold ${
                      contrastAudit.levelBadge === 'AAA'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : contrastAudit.levelBadge === 'AA'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : contrastAudit.levelBadge === 'AA Large Only'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {contrastAudit.levelBadge}
                  </span>
                </div>
              </div>

              {/* Live Preview & Matrix */}
              <div className="lg:col-span-7 space-y-5">
                <div
                  style={{
                    backgroundColor: normalizeHex(bgHex) ?? '#4338CA',
                    color: normalizeHex(fgHex) ?? '#FFFFFF',
                  }}
                  className="rounded-2xl p-6 border border-zinc-700 space-y-3 shadow-inner transition-colors"
                >
                  <span className="text-xs font-mono uppercase tracking-widest opacity-80">
                    Live Typography & Component Preview
                  </span>
                  <h3 className="text-2xl font-bold">
                    Accessible interfaces empower every reader.
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Body copy requires a minimum contrast ratio of 4.5:1 for WCAG 2.1 Level AA compliance, and 7.0:1 for enhanced Level AAA legibility across desktop and mobile displays.
                  </p>
                  <div className="pt-2">
                    <span
                      style={{
                        borderColor: normalizeHex(fgHex) ?? '#FFFFFF',
                      }}
                      className="inline-block px-4 py-1.5 rounded-lg border-2 text-xs font-semibold"
                    >
                      Interactive UI Button (3.0:1 Min)
                    </span>
                  </div>
                </div>

                {/* Compliance Pass/Fail Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  {[
                    {
                      label: 'WCAG AA Normal Text (>= 4.5:1)',
                      pass: contrastAudit.aaNormal,
                    },
                    {
                      label: 'WCAG AA Large Text (>= 3.0:1)',
                      pass: contrastAudit.aaLarge,
                    },
                    {
                      label: 'WCAG AAA Normal Text (>= 7.0:1)',
                      pass: contrastAudit.aaaNormal,
                    },
                    {
                      label: 'WCAG AAA Large Text (>= 4.5:1)',
                      pass: contrastAudit.aaaLarge,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        item.pass
                          ? 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-800/70 text-rose-200'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.pass ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                          <XCircle className="w-4 h-4" /> FAIL
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: COLOUR CONVERTER & GRADIENT BUILDER */}
        {activeTab === 'converter' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bi-directional HEX / RGB / HSL Converter */}
            <section
              aria-labelledby="conv-heading"
              className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5"
            >
              <div>
                <h2 id="conv-heading" className="text-lg font-bold text-white">
                  HEX • RGB • HSL Colour Space Converter
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Inspect exact channel values and copy formatted CSS colour strings.
                </p>
              </div>

              <div
                style={{ backgroundColor: validConvHex }}
                className="h-24 rounded-xl border border-zinc-700 shadow-inner"
              />

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label htmlFor="conv-hex" className="block text-zinc-400 uppercase mb-1">
                    HEX Input
                  </label>
                  <input
                    id="conv-hex"
                    type="text"
                    value={convHexInput}
                    onChange={(e) => setConvHexInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['r', 'g', 'b'] as const).map((ch) => (
                    <div key={ch}>
                      <label htmlFor={`rgb-${ch}`} className="block text-zinc-400 uppercase mb-1">
                        {ch.toUpperCase()} (0-255)
                      </label>
                      <input
                        id={`rgb-${ch}`}
                        type="number"
                        min={0}
                        max={255}
                        value={convRgb[ch]}
                        onChange={(e) => {
                          const next = {
                            ...convRgb,
                            [ch]: Number(e.target.value) || 0,
                          };
                          setConvHexInput(rgbToHex(next));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">HEX:</span>
                    <span>{validConvHex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">RGB:</span>
                    <span>
                      rgb({convRgb.r}, {convRgb.g}, {convRgb.b})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">HSL:</span>
                    <span>
                      hsl({convHsl.h}, {convHsl.s}%, {convHsl.l}%)
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* CSS Gradient Studio */}
            <section
              aria-labelledby="grad-heading"
              className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="grad-heading" className="text-lg font-bold text-white">
                    3-Stop CSS Gradient Composer
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Design linear or radial multi-stop gradients and copy production CSS.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGradType('linear')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                      gradType === 'linear'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradType('radial')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                      gradType === 'radial'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    Radial
                  </button>
                </div>
              </div>

              <div
                style={{ background: gradientCss }}
                className="h-44 rounded-2xl border border-zinc-700 shadow-lg"
              />

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <label htmlFor="grad-start" className="block text-zinc-400 mb-1">
                    Stop 1 (0%)
                  </label>
                  <input
                    id="grad-start"
                    type="text"
                    value={gradStart}
                    onChange={(e) => setGradStart(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="grad-mid" className="block text-zinc-400 mb-1">
                    Stop 2 (50%)
                  </label>
                  <input
                    id="grad-mid"
                    type="text"
                    value={gradMid}
                    onChange={(e) => setGradMid(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="grad-end" className="block text-zinc-400 mb-1">
                    Stop 3 (100%)
                  </label>
                  <input
                    id="grad-end"
                    type="text"
                    value={gradEnd}
                    onChange={(e) => setGradEnd(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="grad-angle" className="block text-zinc-400 mb-1">
                    Angle ({gradAngle}°)
                  </label>
                  <input
                    id="grad-angle"
                    type="range"
                    min={0}
                    max={360}
                    step={15}
                    disabled={gradType === 'radial'}
                    value={gradAngle}
                    onChange={(e) => setGradAngle(Number(e.target.value))}
                    className="w-full accent-violet-500 mt-2"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 font-mono text-xs">
                <code className="text-violet-300 truncate">
                  background: {gradientCss};
                </code>
                <button
                  type="button"
                  onClick={() => copyText(`background: ${gradientCss};`, 'grad-copy')}
                  className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 shrink-0 cursor-pointer"
                >
                  {copiedId === 'grad-copy' ? 'Copied!' : 'Copy CSS'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/60 py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div>
            PixelPalette implements W3C WCAG 2.1 relative luminance and sRGB colour space math locally.
          </div>
          <div>PixelPalette v1.0 • MIT License</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
