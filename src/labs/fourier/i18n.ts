import { createContext, useCallback, useContext } from 'react';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { it } from './locales/it';
import { pt } from './locales/pt';

export type Lang = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';
export type TKey = keyof typeof es;

/** Languages offered in the selector, with their native names. */
export const LANGS: [Lang, string][] = [
  ['es', 'Español'],
  ['en', 'English'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['it', 'Italiano'],
  ['pt', 'Português'],
];

const dicts: Record<Lang, Record<TKey, string>> = { es, en, fr, de, it, pt };

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && x in dicts;
}

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
  return s;
}

export const LangContext = createContext<Lang>('es');

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT() {
  const lang = useLang();
  return useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}
