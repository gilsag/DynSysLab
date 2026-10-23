import type { Root, SystemDef } from '../math/types';
import { newId } from '../math/types';
import type { BodeData } from '../math/tf';
import { tr, fmt, type Lang } from '../i18n';

export type Difficulty = 'easy' | 'medium' | 'hard';

const CORNERS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function randomSystem(d: Difficulty): SystemDef {
  const used = new Set<number>();
  const corner = () => {
    let c = pick(CORNERS);
    for (let i = 0; i < 20 && used.has(c); i++) c = pick(CORNERS);
    used.add(c);
    return c;
  };
  const roots: Root[] = [];
  const P = (re: number, im = 0) => roots.push({ id: newId(), kind: 'pole', re, im });
  const Z = (re: number, im = 0) => roots.push({ id: newId(), kind: 'zero', re, im });
  if (d === 'easy') {
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) P(-corner());
    if (Math.random() < 0.3) P(0);
  } else if (d === 'medium') {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) P(-corner());
    if (Math.random() < 0.7) Z(-corner());
    else Z(0);
    if (Math.random() < 0.25) P(0);
  } else {
    const wn = corner();
    const z = pick([0.1, 0.2, 0.3, 0.5]);
    P(+(-z * wn).toPrecision(4), +(wn * Math.sqrt(1 - z * z)).toPrecision(4));
    if (Math.random() < 0.7) P(-corner());
    const zr = Math.random();
    if (zr < 0.3) Z(corner());
    else if (zr < 0.8) Z(-corner());
    if (Math.random() < 0.3) P(0);
  }
  const gainDb = pick([-20, -10, -6, 0, 6, 10, 20]);
  return { roots, gainMode: 'bode', gainDb, gainNeg: false, delay: 0 };
}

export function score(cur: BodeData, target: BodeData) {
  let em = 0;
  let ep = 0;
  const n = cur.w.length;
  for (let i = 0; i < n; i++) {
    const dm = Math.max(-60, Math.min(60, cur.mag[i] - target.mag[i]));
    let dp = cur.ph[i] - target.ph[i];
    dp = ((((dp + 180) % 360) + 360) % 360) - 180;
    em += isFinite(dm) ? dm * dm : 3600;
    ep += isFinite(dp) ? dp * dp : 8100;
  }
  em = Math.sqrt(em / n);
  ep = Math.sqrt(ep / n);
  const match = 100 * Math.exp(-(em / 4 + ep / 25));
  return { em, ep, match, solved: em < 1 && ep < 5 };
}

interface Props {
  active: boolean;
  revealed: boolean;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  onReveal: () => void;
  onEnd: () => void;
  result: ReturnType<typeof score> | null;
  lang: Lang;
}

export default function ChallengePanel(p: Props) {
  const t = tr(p.lang);
  return (
    <div>
      <p className="small">{t('challengeIntro')}</p>
      <div className="row gap wrap">
        <span className="small">{t('difficulty')}</span>
        <div className="seg">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button key={d} className={p.difficulty === d ? 'on' : ''} onClick={() => p.setDifficulty(d)}>
              {t(d)}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={p.onStart}>
          {p.active ? t('newChallenge') : t('startChallenge')}
        </button>
        {p.active && (
          <>
            <button className="btn" onClick={p.onReveal} disabled={p.revealed}>
              {t('reveal')}
            </button>
            <button className="btn" onClick={p.onEnd}>
              {t('endChallenge')}
            </button>
          </>
        )}
      </div>
      {p.active && p.result && (
        <div className="score">
          <div className="bar">
            <div className={`fill ${p.result.solved ? 'solved' : ''}`} style={{ width: `${p.result.match.toFixed(1)}%` }} />
          </div>
          <div className="metrics">
            <div>
              <span>{t('match')}</span>
              <b className="mono">{p.result.match < 1 ? '< 1' : Math.round(p.result.match)} %</b>
            </div>
            <div>
              <span>{t('errMag')}</span>
              <b className="mono">{fmt(p.result.em, p.lang)} dB</b>
            </div>
            <div>
              <span>{t('errPh')}</span>
              <b className="mono">{fmt(p.result.ep, p.lang)}°</b>
            </div>
          </div>
          {p.result.solved && <p className="solved-msg">{t('solved')}</p>}
        </div>
      )}
      <p className="note small">
        {t('challengeHint')}
      </p>
    </div>
  );
}
