/* ==========================================================================
   LabChrome · shared header, language selector and display preferences
   for the UTFSM DIE dynamic-systems labs. Keep identical in every app.

   - Language: remembered choice, otherwise the browser language, otherwise
     Spanish. The choice is stored under one key, so labs served from the
     same site share it.
   - Display: theme (auto / light / dark), palette and text size, applied to
     <html> as data-theme, data-palette and --fs before the first paint.
   - Suite identity (from suite.ts): umbrella name, lab titles, About dialog.
   ========================================================================== */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { AUTHOR, LAB_IDS, LAB_LANGS, LICENSE, SUITE_LABS, SUITE_NAME, labHref, type LabId, type LabLang } from './suite';
export { AUTHOR, LAB_IDS, LAB_LANGS, LICENSE, SUITE_LABS, SUITE_NAME, labHref, type LabId, type LabLang };
const LANG_KEY = 'utfsm-lab.lang';
const PREFS_KEY = 'utfsm-lab.display';

const isLabLang = (x: unknown): x is LabLang => typeof x === 'string' && LAB_LANGS.some(([c]) => c === x);

function storeGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function storeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable (private window, file:// in some browsers) */
  }
}

/** Remembered language → browser languages → Spanish. `legacy` are older per-app keys. */
export function initialLang(legacy: string[] = []): LabLang {
  for (const k of [LANG_KEY, ...legacy]) {
    const v = storeGet(k);
    if (isLabLang(v)) return v;
  }
  try {
    const list = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const l of list) {
      const c = (l || '').slice(0, 2).toLowerCase();
      if (isLabLang(c)) return c;
    }
  } catch {
    /* no navigator */
  }
  return 'es';
}

/** Store the language and mark the document; call whenever it changes. */
export function persistLang(lang: LabLang) {
  storeSet(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

/** Language state for apps that do not keep it elsewhere. */
export function useLabLang(legacy: string[] = []): [LabLang, (l: LabLang) => void] {
  const [lang, setLang] = useState<LabLang>(() => initialLang(legacy));
  useEffect(() => persistLang(lang), [lang]);
  return [lang, setLang];
}


/* ---------------------------------------------------------------- display prefs */
export type ThemeMode = 'auto' | 'light' | 'dark';
export type Palette = 'default' | 'usm' | 'warm' | 'contrast';
export interface DisplayPrefs {
  mode: ThemeMode;
  palette: Palette;
  scale: number;
}
export const SCALES = [0.85, 0.9, 1, 1.1, 1.2, 1.3, 1.45, 1.6];
const PALETTES: Palette[] = ['default', 'usm', 'warm', 'contrast'];
/** Swatch colours shown in the menu: background, panel, accent, second series colour. */
const SWATCH: Record<Palette, string[]> = {
  default: ['#f4f5f7', '#ffffff', '#2864d8', '#e0691f'],
  usm: ['#004b85', '#d60019', '#008452', '#f7ae00'],
  warm: ['#f4f2ee', '#fffdf9', '#1f5bd8', '#c26a00'],
  contrast: ['#ffffff', '#000000', '#0038b8', '#b0002a'],
};

function readPrefs(): DisplayPrefs {
  const d: DisplayPrefs = { mode: 'auto', palette: 'default', scale: 1 };
  try {
    const raw = storeGet(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<DisplayPrefs>;
      if (p.mode === 'auto' || p.mode === 'light' || p.mode === 'dark') d.mode = p.mode;
      if (PALETTES.includes(p.palette as Palette)) d.palette = p.palette as Palette;
      if (typeof p.scale === 'number' && p.scale >= 0.8 && p.scale <= 1.7) d.scale = p.scale;
      return d;
    }
  } catch {
    /* ignore malformed */
  }
  // a host page (e.g. an LMS embedding the lab) may preset the theme
  const host = document.documentElement.getAttribute('data-theme');
  if (host === 'light' || host === 'dark') d.mode = host;
  return d;
}

const darkMQ = () => (typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null);

function applyPrefs(p: DisplayPrefs) {
  const root = document.documentElement;
  const dark = p.mode === 'dark' || (p.mode === 'auto' && !!darkMQ()?.matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-palette', p.palette);
  root.style.setProperty('--fs', String(p.scale));
}

// apply before React renders so the first paint already has the right colours
let current = readPrefs();
applyPrefs(current);

/** Display preferences, applied to <html> and remembered. */
export function useDisplayPrefs(): [DisplayPrefs, (p: Partial<DisplayPrefs>) => void] {
  const [prefs, setPrefs] = useState<DisplayPrefs>(current);
  useEffect(() => {
    current = prefs;
    applyPrefs(prefs);
    storeSet(PREFS_KEY, JSON.stringify(prefs));
    if (prefs.mode !== 'auto') return;
    const mq = darkMQ();
    if (!mq) return;
    const h = () => applyPrefs(prefs);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [prefs]);
  return [prefs, (p) => setPrefs((s) => ({ ...s, ...p }))];
}

/** Counter that changes whenever theme, palette or text size change (for canvas redraws). */
export function useThemeVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setV((x) => x + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette', 'style'] });
    return () => mo.disconnect();
  }, []);
  return v;
}

/** Current text scale (1 = 100 %), for text drawn on canvas. */
export function textScale(): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs'));
  return v > 0 ? v : 1;
}

/** Resolves a CSS custom property name ('--accent') to its current colour. */
export function cssVar(name: string, fallback = '#888'): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* ---------------------------------------------------------------- strings */
type S6 = Record<LabLang, string>;
const T = {
  controls: { es: 'Controles', en: 'Controls', fr: 'Commandes', de: 'Steuerung', it: 'Controlli', pt: 'Controles' },
  language: { es: 'Idioma', en: 'Language', fr: 'Langue', de: 'Sprache', it: 'Lingua', pt: 'Idioma' },
  display: { es: 'Apariencia', en: 'Display', fr: 'Affichage', de: 'Darstellung', it: 'Aspetto', pt: 'Aparência' },
  theme: { es: 'Tema', en: 'Theme', fr: 'Thème', de: 'Modus', it: 'Tema', pt: 'Tema' },
  auto: { es: 'Automático', en: 'Auto', fr: 'Auto', de: 'Auto', it: 'Auto', pt: 'Automático' },
  light: { es: 'Claro', en: 'Light', fr: 'Clair', de: 'Hell', it: 'Chiaro', pt: 'Claro' },
  dark: { es: 'Oscuro', en: 'Dark', fr: 'Sombre', de: 'Dunkel', it: 'Scuro', pt: 'Escuro' },
  palette: { es: 'Paleta', en: 'Palette', fr: 'Palette', de: 'Farbschema', it: 'Tavolozza', pt: 'Paleta' },
  p_default: { es: 'Azul', en: 'Blue', fr: 'Bleu', de: 'Blau', it: 'Blu', pt: 'Azul' },
  p_usm: { es: 'USM', en: 'USM', fr: 'USM', de: 'USM', it: 'USM', pt: 'USM' },
  p_warm: { es: 'Papel', en: 'Paper', fr: 'Papier', de: 'Papier', it: 'Carta', pt: 'Papel' },
  p_contrast: { es: 'Alto contraste', en: 'High contrast', fr: 'Contraste élevé', de: 'Hoher Kontrast', it: 'Alto contrasto', pt: 'Alto contraste' },
  textSize: { es: 'Tamaño del texto', en: 'Text size', fr: 'Taille du texte', de: 'Textgröße', it: 'Dimensione del testo', pt: 'Tamanho do texto' },
  smaller: { es: 'Texto más pequeño', en: 'Smaller text', fr: 'Texte plus petit', de: 'Kleinerer Text', it: 'Testo più piccolo', pt: 'Texto menor' },
  larger: { es: 'Texto más grande (para proyectar)', en: 'Larger text (for projection)', fr: 'Texte plus grand (pour projeter)', de: 'Größerer Text (für Projektion)', it: 'Testo più grande (per proiettare)', pt: 'Texto maior (para projetar)' },
  reset: { es: 'Restablecer', en: 'Reset', fr: 'Réinitialiser', de: 'Zurücksetzen', it: 'Ripristina', pt: 'Restaurar' },
  about: { es: 'Acerca de', en: 'About', fr: 'À propos', de: 'Über', it: 'Informazioni', pt: 'Sobre' },
  close: { es: 'Cerrar', en: 'Close', fr: 'Fermer', de: 'Schließen', it: 'Chiudi', pt: 'Fechar' },
  suiteDesc: {
    es: 'Laboratorios virtuales interactivos para la enseñanza de sistemas dinámicos lineales, Departamento de Ingeniería Eléctrica, Universidad Técnica Federico Santa María.',
    en: 'Interactive virtual labs for teaching linear dynamic systems, Department of Electrical Engineering, Universidad Técnica Federico Santa María.',
    fr: 'Laboratoires virtuels interactifs pour l’enseignement des systèmes dynamiques linéaires, Département de génie électrique, Universidad Técnica Federico Santa María.',
    de: 'Interaktive virtuelle Labore für die Lehre linearer dynamischer Systeme, Institut für Elektrotechnik, Universidad Técnica Federico Santa María.',
    it: 'Laboratori virtuali interattivi per l’insegnamento dei sistemi dinamici lineari, Dipartimento di Ingegneria Elettrica, Universidad Técnica Federico Santa María.',
    pt: 'Laboratórios virtuais interativos para o ensino de sistemas dinâmicos lineares, Departamento de Engenharia Elétrica, Universidad Técnica Federico Santa María.',
  },
  labsInSuite: { es: 'Laboratorios del conjunto', en: 'Labs in the suite', fr: 'Laboratoires de l’ensemble', de: 'Labore der Reihe', it: 'Laboratori della raccolta', pt: 'Laboratórios do conjunto' },
  allLabs: { es: 'Todos los laboratorios', en: 'All labs', fr: 'Tous les laboratoires', de: 'Alle Labore', it: 'Tutti i laboratori', pt: 'Todos os laboratórios' },
  thisLab: { es: 'este', en: 'this one', fr: 'celui-ci', de: 'dieses', it: 'questo', pt: 'este' },
  author: { es: 'Autor', en: 'Author', fr: 'Auteur', de: 'Autor', it: 'Autore', pt: 'Autor' },
} satisfies Record<string, S6>;
export const labText = (lang: LabLang, k: keyof typeof T) => T[k][lang];

/* ---------------------------------------------------------------- components */
function PaletteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 2.5 A7.5 7.5 0 0 1 10 17.5 Z" fill="currentColor" />
    </svg>
  );
}

export function DisplayMenu({ lang }: { lang: LabLang }) {
  const [prefs, setPrefs] = useDisplayPrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const t = (k: keyof typeof T) => T[k][lang];
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const i = SCALES.indexOf(prefs.scale);
  const idx = i < 0 ? SCALES.indexOf(1) : i;
  const [popTop, setPopTop] = useState(0);
  return (
    <div className="lab-menu" ref={ref} style={{ ['--pop-top' as string]: `${popTop}px` }}>
      <button
        type="button"
        className={'lab-menu-btn toggle' + (open ? ' on' : '')}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t('display')}
        onClick={(e) => {
          setPopTop(e.currentTarget.getBoundingClientRect().bottom + 6);
          setOpen(!open);
        }}
      >
        <PaletteIcon />
        <span className="lab-menu-label">{t('display')}</span>
      </button>
      {open && (
        <div className="lab-menu-pop" role="dialog" aria-label={t('display')}>
          <div>
            <h4>{t('theme')}</h4>
            <div className="seg">
              {(['auto', 'light', 'dark'] as ThemeMode[]).map((m) => (
                <button key={m} type="button" className={prefs.mode === m ? 'on' : ''} onClick={() => setPrefs({ mode: m })}>
                  {t(m)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>{t('palette')}</h4>
            <div className="lab-swatches">
              {PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={'lab-swatch' + (prefs.palette === p ? ' on' : '')}
                  aria-pressed={prefs.palette === p}
                  onClick={() => setPrefs({ palette: p })}
                >
                  <i>
                    {SWATCH[p].map((c, k) => (
                      <b key={k} style={{ background: c }} />
                    ))}
                  </i>
                  {t(`p_${p}` as keyof typeof T)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>{t('textSize')}</h4>
            <div className="lab-scale">
              <button type="button" className="sq" title={t('smaller')} disabled={idx <= 0} onClick={() => setPrefs({ scale: SCALES[idx - 1] })}>
                A−
              </button>
              <span>{Math.round(prefs.scale * 100)} %</span>
              <button
                type="button"
                className="sq"
                title={t('larger')}
                disabled={idx >= SCALES.length - 1}
                onClick={() => setPrefs({ scale: SCALES[idx + 1] })}
              >
                A+
              </button>
              <button type="button" className="tiny" disabled={prefs.scale === 1} onClick={() => setPrefs({ scale: 1 })}>
                {t('reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LangSelect({ lang, onChange }: { lang: LabLang; onChange: (l: LabLang) => void }) {
  return (
    <label className="lab-lang">
      <span>{T.language[lang]}</span>
      <select value={lang} onChange={(e) => onChange(e.target.value as LabLang)}>
        {LAB_LANGS.map(([code, name]) => (
          <option key={code} value={code} lang={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9 V14 M10 6.2 V6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** "About" button and dialog: suite, labs in the suite and author. */
export function AboutButton({ lang, lab }: { lang: LabLang; lab?: LabId }) {
  const [open, setOpen] = useState(false);
  const t = (k: keyof typeof T) => T[k][lang];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" className="lab-menu-btn" title={t('about')} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <InfoIcon />
        <span className="lab-menu-label">{t('about')}</span>
      </button>
      {open && (
        <div className="lab-about-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="lab-about" role="dialog" aria-modal="true" aria-label={t('about')}>
            <div className="lab-about-head">
              <div>
                <div className="lab-eyebrow">{SUITE_NAME}</div>
                <h2>{lab ? SUITE_LABS[lab].title[lang] : SUITE_NAME}</h2>
              </div>
              <button type="button" className="sq" aria-label={t('close')} title={t('close')} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <p>{t('suiteDesc')}</p>
            <h4>{t('labsInSuite')}</h4>
            <ul className="lab-about-labs">
              {(Object.keys(SUITE_LABS) as LabId[]).map((id) => (
                <li key={id} className={id === lab ? 'on' : ''}>
                  {id === lab ? SUITE_LABS[id].title[lang] : <a href={labHref(id)}>{SUITE_LABS[id].title[lang]}</a>}
                  {id === lab && <span className="badge">{t('thisLab')}</span>}
                </li>
              ))}
            </ul>
            <h4>{t('author')}</h4>
            <address className="lab-signature">
              <b>{AUTHOR.name}</b>
              <span>--</span>
              {AUTHOR.lines.map((line, i) => (
                <span key={i}>
                  {line.map((seg, j) =>
                    seg.href ? (
                      <a key={j} href={seg.href} target="_blank" rel="noopener noreferrer">
                        {seg.t}
                      </a>
                    ) : (
                      <span key={j}>{seg.t}</span>
                    ),
                  )}
                </span>
              ))}
            </address>
            <p className="lab-about-foot">
              © {AUTHOR.year} {AUTHOR.name} · {SUITE_NAME} ·{' '}
              <a href={LICENSE.url} target="_blank" rel="noopener noreferrer">
                {LICENSE.name}
              </a>{' '}
              · <a href={labHref()}>{t('allLabs')}</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

const DIE_URL = 'https://eli.usm.cl/';

/**
 * On phones the sidebar becomes a sheet at the bottom of the screen, opened and closed with a floating button.
 * Rendered only when the page has a .lab-sidebar; the CSS shows it only on narrow screens.
 */
function SidebarToggle({ lang }: { lang: LabLang }) {
  const [has, setHas] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setHas(!!document.querySelector('.lab-sidebar')), []);
  useEffect(() => {
    document.documentElement.classList.toggle('sheet-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (!has) return null;
  return (
    <button type="button" className={'lab-fab' + (open ? ' on' : '')} aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
      )}
      <span>{T[open ? 'close' : 'controls'][lang]}</span>
    </button>
  );
}

/** Common header: institutional logo · app glyph · suite name and lab title, then app tools, About, Display and language. */
export function LabHeader({
  logo,
  glyph,
  lab,
  title,
  subtitle,
  lang,
  onLang,
  tools,
}: {
  logo: string;
  glyph: ReactNode;
  /** Lab of the suite (src/shared/suite.ts): gives the title in every language. */
  lab?: LabId;
  /** Only for the home page or a lab not yet listed in SUITE_LABS. */
  title?: string;
  subtitle?: ReactNode;
  lang: LabLang;
  onLang: (l: LabLang) => void;
  tools?: ReactNode;
}) {
  const name = lab ? SUITE_LABS[lab].title[lang] : (title ?? '');
  useEffect(() => {
    document.title = name && name !== SUITE_NAME ? `${name} · ${SUITE_NAME}` : SUITE_NAME;
  }, [name]);
  return (
    <header className="lab-topbar">
      <div className="lab-brand">
        <a className="lab-logo-link" href={DIE_URL} target="_blank" rel="noopener noreferrer" title="Departamento de Ingeniería Eléctrica · UTFSM">
          <img className="lab-logo" src={logo} alt="Universidad Técnica Federico Santa María · Departamento de Ingeniería Eléctrica" />
        </a>
        <span className="lab-brand-sep" aria-hidden="true" />
        <span className="lab-glyph" aria-hidden="true">
          {glyph}
        </span>
        <div>
          <a className="lab-eyebrow" href={labHref()} title={T.allLabs[lang]}>
            {SUITE_NAME}
          </a>
          <h1 className="lab-title">{name}</h1>
          {subtitle && <p className="lab-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="lab-tools">
        {tools}
        <AboutButton lang={lang} lab={lab} />
        <DisplayMenu lang={lang} />
        <LangSelect lang={lang} onChange={onLang} />
      </div>
      <SidebarToggle lang={lang} />
    </header>
  );
}

/* App glyphs: the same drawings are used in each app's favicon (white on the default accent). */
export const GLYPHS: Record<LabId, ReactNode> = {
  taylor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 C8 19 11 15 13 11 S18 4 21 3.5" />
      <path d="M4 15.5 L21 6.5" opacity="0.65" />
      <circle cx="12.2" cy="11.4" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  approximation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 C6 8 10 6 13 9 S18 15 21 7" opacity="0.65" />
      <path d="M3 20 V13 H7.5 V8 H12 V10 H16.5 V12 H21 V20" />
    </svg>
  ),
  convolution: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 18 H5 V8 H11 V18 H13" />
      <path d="M9 18 C11 8 13 8 14 8 C16 8 18 14 21.5 18" opacity="0.65" />
    </svg>
  ),
  fourier: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 C5 4.5 7 4.5 9 12 S13 19.5 15 12 S19 4.5 21 12" />
    </svg>
  ),
  representations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="7" height="8" rx="1" />
      <circle cx="16" cy="12" r="2.6" />
      <path d="M10 12h3.4 M18.6 12H22 M16 14.6V19H6.5v-3" />
    </svg>
  ),
  properties: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 19h4V10h6v9h3" />
      <path d="M14.5 6.5l2.3 2.3 4.7-4.7" opacity="0.7" />
    </svg>
  ),
  'block-diagrams': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="8" r="2.4" />
      <rect x="10" y="5" width="7" height="6" rx="1" />
      <path d="M7.4 8H10 M17 8h5 M19.5 8v9H5v-6.6" opacity="0.7" />
    </svg>
  ),
  ode: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 C6 20 7 6 11 6 C14 6 15 14 21 14" />
      <path d="M3 14 H21" opacity="0.45" />
      <path d="M3 20 C7 18 10 15 21 14" opacity="0.65" />
    </svg>
  ),
  laplace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h3l1.5-3 3 6 3-6 3 6 1.5-3H22" />
      <path d="M4 20 C7 20 8 13 11 13 S15 18 21 18" opacity="0.65" />
    </svg>
  ),
  'second-order': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 H5 C7 20 8 4 11 5 C13 6 14 13 16 12 C17.5 11.3 18.5 10.5 21 10.5" />
      <path d="M5 10.5 H21" opacity="0.5" />
    </svg>
  ),
  frequency: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7 H10 L21 18" />
      <path d="M3 17.5 C9 17.5 11 17 12.5 12 S16 6.5 21 6.5" opacity="0.65" />
    </svg>
  ),
  'state-space': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20 L9.5 14.5 M9.5 20 L4 14.5" />
      <circle cx="16.5" cy="7.5" r="4" />
    </svg>
  ),
};
