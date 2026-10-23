/* Text field for a formula, with live validation and translated error messages. */
import { useEffect, useId, useState } from 'react';
import { tryFormula, type ExprErrorCode, type Formula } from './expr';
import type { LabLang } from './suite';
import { InfoTip, Tex } from './ui';

type S6 = Record<LabLang, string>;
const MSG: Record<ExprErrorCode | 'help', S6> = {
  empty: { es: 'Escriba una fórmula.', en: 'Type a formula.', fr: 'Saisissez une formule.', de: 'Geben Sie eine Formel ein.', it: 'Scrivete una formula.', pt: 'Digite uma fórmula.' },
  unexpected: { es: 'Símbolo inesperado', en: 'Unexpected symbol', fr: 'Symbole inattendu', de: 'Unerwartetes Zeichen', it: 'Simbolo inatteso', pt: 'Símbolo inesperado' },
  unknownName: { es: 'Nombre desconocido', en: 'Unknown name', fr: 'Nom inconnu', de: 'Unbekannter Name', it: 'Nome sconosciuto', pt: 'Nome desconhecido' },
  unclosed: { es: 'Falta cerrar un paréntesis', en: 'A parenthesis is not closed', fr: 'Une parenthèse n’est pas fermée', de: 'Eine Klammer ist nicht geschlossen', it: 'Manca una parentesi di chiusura', pt: 'Falta fechar um parêntese' },
  missingArg: { es: 'Falta un término', en: 'A term is missing', fr: 'Il manque un terme', de: 'Ein Term fehlt', it: 'Manca un termine', pt: 'Falta um termo' },
  trailing: { es: 'Sobra algo al final', en: 'Something is left over at the end', fr: 'Il reste quelque chose à la fin', de: 'Am Ende steht etwas zu viel', it: 'Avanza qualcosa alla fine', pt: 'Sobra algo no final' },
  help: {
    es: 'Operaciones + − * / ^, productos implícitos (2x), coma o punto decimal. Funciones: sin (sen), cos, tan, exp, ln, sqrt, atan, asin, acos, sinh, cosh, tanh, abs, sign, mu (escalón unitario μ). Constantes: pi, e.',
    en: 'Operations + − * / ^, implicit products (2x), decimal point or comma. Functions: sin, cos, tan, exp, ln, sqrt, atan, asin, acos, sinh, cosh, tanh, abs, sign, mu (unit step μ). Constants: pi, e.',
    fr: 'Opérations + − * / ^, produits implicites (2x), point ou virgule décimale. Fonctions : sin, cos, tan, exp, ln, sqrt, atan, asin, acos, sinh, cosh, tanh, abs, sign, mu (échelon unité μ). Constantes : pi, e.',
    de: 'Operationen + − * / ^, implizite Produkte (2x), Dezimalpunkt oder -komma. Funktionen: sin, cos, tan, exp, ln, sqrt, atan, asin, acos, sinh, cosh, tanh, abs, sign, mu (Einheitssprung μ). Konstanten: pi, e.',
    it: 'Operazioni + − * / ^, prodotti impliciti (2x), punto o virgola decimale. Funzioni: sin, cos, tan, exp, ln, sqrt, atan, asin, acos, sinh, cosh, tanh, abs, sign, mu (gradino unitario μ). Costanti: pi, e.',
    pt: 'Operações + − * / ^, produtos implícitos (2x), ponto ou vírgula decimal. Funções: sin (sen), cos, tan, exp, ln, sqrt, atan, asin, acos, sinh, cosh, tanh, abs, sign, mu (degrau unitário μ). Constantes: pi, e.',
  },
};
const VARS: S6 = { es: 'Variables', en: 'Variables', fr: 'Variables', de: 'Variablen', it: 'Variabili', pt: 'Variáveis' };

/**
 * Formula field. `value` is the last valid source; edits that do not parse stay local
 * (with an error message) until they become valid, then `onChange` is called.
 */
export function ExprInput({
  label,
  value,
  vars,
  lang,
  onChange,
}: {
  /** TeX for the left-hand side, e.g. "f(x) =" */
  label: string;
  value: string;
  vars: string[];
  lang: LabLang;
  onChange: (src: string, formula: Formula) => void;
}) {
  const [text, setText] = useState(value);
  const id = useId();
  useEffect(() => setText(value), [value]);
  const r = tryFormula(text, vars);
  const err = r.ok ? null : r.error;
  return (
    <div className="expr-input">
      <label htmlFor={id} className="expr-label">
        <Tex tex={label} />
      </label>
      <input
        id={id}
        type="text"
        className={'expr-field' + (err ? ' bad' : '')}
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          const s = e.target.value;
          setText(s);
          const q = tryFormula(s, vars);
          if (q.ok) onChange(s, q.formula);
        }}
        aria-invalid={!!err}
      />
      <InfoTip text={`${MSG.help[lang]} ${VARS[lang]}: ${vars.join(', ')}.`} />
      {err && (
        <p className="expr-error">
          {MSG[err.code][lang]}
          {err.token && err.code !== 'empty' ? `: «${err.token}»` : ''}
          {err.code !== 'empty' && err.code !== 'missingArg' && (
            <span className="mono">
              {' '}
              {text.slice(0, err.pos)}
              <mark>{text.slice(err.pos, err.pos + Math.max(1, err.token.length)) || ' '}</mark>
              {text.slice(err.pos + Math.max(1, err.token.length))}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
