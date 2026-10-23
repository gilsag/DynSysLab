import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Lang, setFormatLang } from './format';
import { initialLang } from '@shared/LabChrome';
import { build, Built, CircuitState, defaultCircuit, MatrixState, matrixFromPreset, matrixPresets, newRoot, PZState, pzFromPreset, pzPresets, Realization, SourceKind } from './model';
import { VecNorm } from './math/ss';
import { restoreCircuit } from './circuits';
import type { PZTool } from './components/SPlane';

export type TabKey = 'splane' | 'repr' | 'phase' | 'coords' | 'resp' | 'co';

export interface UIState {
  lang: Lang;
  fontScale: number;
  tab: TabKey;
  source: SourceKind;
  pz: PZState;
  circuit: CircuitState;
  matrix: MatrixState;
  realization: Realization;
  vecNorm: VecNorm;
  x0: number[];
  tool: PZTool;
  snap: number;
  showDamping: boolean;
  fitKey: number;
}

const STORE = 'lab-variables-estado-v3';

/** Idioma inicial: el elegido antes (común a los laboratorios), si no el del navegador, si no español. */
function detectLang(): Lang {
  return initialLang();
}

const defaultX0 = (n: number) => Array.from({ length: n }, (_, i) => (i < 2 ? 1 : 0));

function initial(): UIState {
  const base: UIState = {
    lang: detectLang(), fontScale: 1, tab: 'splane', source: 'pz', pz: pzFromPreset(pzPresets[0]), circuit: defaultCircuit,
    matrix: matrixFromPreset(matrixPresets[0]), realization: 'ccf', vecNorm: 'last', x0: [1, 1], tool: 'move', snap: 0.1, showDamping: false, fitKey: 0,
  };
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const s = JSON.parse(raw) as Partial<UIState>;
      const merged = { ...base, ...s };
      // the language chosen in any of the labs takes precedence over the one saved with this lab's state
      let shared = false;
      try { shared = !!localStorage.getItem('utfsm-lab.lang'); } catch { /* */ }
      if (shared || !s.lang) merged.lang = base.lang;
      merged.circuit = restoreCircuit(s.circuit);
      merged.pz = { ...merged.pz, poles: merged.pz.poles.map((r) => newRoot(r.re, r.im)), zeros: merged.pz.zeros.map((r) => newRoot(r.re, r.im)) };
      return merged;
    }
  } catch { /* sin almacenamiento */ }
  return base;
}

interface Ctx { st: UIState; set: (p: Partial<UIState> | ((s: UIState) => Partial<UIState>)) => void; sys: Built }
const C = createContext<Ctx>(null as unknown as Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<UIState>(initial);
  const set: Ctx['set'] = (p) => setSt((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
  setFormatLang(st.lang);
  const sys = useMemo(() => build(st.source, st.pz, st.circuit, st.matrix, st.realization, st.vecNorm), [st.source, st.pz, st.circuit, st.matrix, st.realization, st.vecNorm, st.lang]);
  // condición inicial coherente con el orden
  useEffect(() => {
    if (st.x0.length !== sys.n) set({ x0: defaultX0(sys.n) });
  }, [sys.n]);
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ ...st, fitKey: 0 })); } catch { /* */ }
  }, [st]);
  useEffect(() => { document.documentElement.lang = st.lang; }, [st.lang]);
  const x0 = st.x0.length === sys.n ? st.x0 : defaultX0(sys.n);
  return <C.Provider value={{ st: { ...st, x0 }, set, sys }}>{children}</C.Provider>;
}

export const useApp = () => useContext(C);
