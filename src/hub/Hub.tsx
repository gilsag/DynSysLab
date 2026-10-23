/* Home page of the suite: one card per lab registered in src/shared/suite.ts. */
import { useEffect, useState } from 'react';
import logo from '@shared/logo-utfsm-die.jpg';
import { AUTHOR, GLYPHS, initialLang, LAB_IDS, LabHeader, labHref, LICENSE, persistLang, SUITE_LABS, SUITE_NAME, type LabLang } from '@shared/LabChrome';

const T = {
  tagline: {
    es: 'Laboratorios virtuales de sistemas dinámicos',
    en: 'Virtual labs for dynamic systems',
    fr: 'Laboratoires virtuels de systèmes dynamiques',
    de: 'Virtuelle Labore für dynamische Systeme',
    it: 'Laboratori virtuali di sistemi dinamici',
    pt: 'Laboratórios virtuais de sistemas dinâmicos',
  },
  dept: {
    es: 'Departamento de Ingeniería Eléctrica · Universidad Técnica Federico Santa María',
    en: 'Department of Electrical Engineering · Universidad Técnica Federico Santa María',
    fr: 'Département de génie électrique · Universidad Técnica Federico Santa María',
    de: 'Institut für Elektrotechnik · Universidad Técnica Federico Santa María',
    it: 'Dipartimento di Ingegneria Elettrica · Universidad Técnica Federico Santa María',
    pt: 'Departamento de Engenharia Elétrica · Universidad Técnica Federico Santa María',
  },
  intro: {
    es: 'Aplicaciones interactivas para explorar señales y sistemas lineales: cada laboratorio permite mover parámetros, polos y ceros y ver al instante sus efectos en el tiempo y en la frecuencia.',
    en: 'Interactive applications to explore linear signals and systems: each lab lets you move parameters, poles and zeros and see their effect in time and frequency at once.',
    fr: 'Applications interactives pour explorer les signaux et systèmes linéaires : chaque laboratoire permet de modifier paramètres, pôles et zéros et d’en voir aussitôt l’effet en temps et en fréquence.',
    de: 'Interaktive Anwendungen zur Erkundung linearer Signale und Systeme: In jedem Labor lassen sich Parameter, Pole und Nullstellen verändern und ihre Wirkung in Zeit- und Frequenzbereich sofort beobachten.',
    it: 'Applicazioni interattive per esplorare segnali e sistemi lineari: ogni laboratorio permette di modificare parametri, poli e zeri e vederne subito l’effetto nel tempo e in frequenza.',
    pt: 'Aplicações interativas para explorar sinais e sistemas lineares: cada laboratório permite alterar parâmetros, polos e zeros e ver na hora seu efeito no tempo e na frequência.',
  },
  open: { es: 'Abrir', en: 'Open', fr: 'Ouvrir', de: 'Öffnen', it: 'Apri', pt: 'Abrir' },
  offline: {
    es: 'Descargar versión sin conexión',
    en: 'Download offline version',
    fr: 'Télécharger la version hors ligne',
    de: 'Offline-Version herunterladen',
    it: 'Scarica la versione offline',
    pt: 'Baixar versão offline',
  },
  offlineHint: {
    es: 'La versión sin conexión es un solo archivo HTML: se abre con doble clic, sin internet ni servidor.',
    en: 'The offline version is a single HTML file: open it with a double click, no internet or server needed.',
    fr: 'La version hors ligne est un seul fichier HTML : il s’ouvre d’un double clic, sans internet ni serveur.',
    de: 'Die Offline-Version ist eine einzelne HTML-Datei: per Doppelklick öffnen, ohne Internet oder Server.',
    it: 'La versione offline è un unico file HTML: si apre con un doppio clic, senza internet né server.',
    pt: 'A versão offline é um único arquivo HTML: abre com duplo clique, sem internet nem servidor.',
  },
  license: {
    es: 'Código, interfaz y documentación bajo licencia',
    en: 'Code, interface and documentation licensed under',
    fr: 'Code, interface et documentation sous licence',
    de: 'Code, Oberfläche und Dokumentation lizenziert unter',
    it: 'Codice, interfaccia e documentazione con licenza',
    pt: 'Código, interface e documentação sob a licença',
  },
} satisfies Record<string, Record<LabLang, string>>;

const HUB_GLYPH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12 C5 4.5 7 4.5 9 12 S13 19.5 15 12" />
    <path d="M15 12 H21" opacity="0.7" />
    <circle cx="18" cy="18" r="2.2" />
  </svg>
);

export default function Hub() {
  const [lang, setLang] = useState<LabLang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: keyof typeof T) => T[k][lang];
  return (
    <div className="lab-app hub">
      <LabHeader logo={logo} glyph={HUB_GLYPH} title={t('tagline')} subtitle={t('dept')} lang={lang} onLang={setLang} />
      <main className="hub-main">
        <section className="hub-intro">
          <p>{t('intro')}</p>
        </section>
        <section className="hub-grid">
          {LAB_IDS.map((id) => (
            <article key={id} className="card hub-card">
              <a className="hub-card-link" href={labHref(id)}>
                <span className="lab-glyph" aria-hidden="true">
                  {GLYPHS[id]}
                </span>
                <h3>{SUITE_LABS[id].title[lang]}</h3>
              </a>
              <p>{SUITE_LABS[id].summary[lang]}</p>
              <div className="hub-actions">
                <a className="hub-btn primary" href={labHref(id)}>
                  {t('open')}
                </a>
                {!import.meta.env.OFFLINE && (
                  <a className="hub-btn" href={`./offline/${id}.html`} download={`DynSysLab-${id}.html`}>
                    {t('offline')}
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
        {!import.meta.env.OFFLINE && <p className="hint">{t('offlineHint')}</p>}
        <footer className="hub-foot">
          © {AUTHOR.year} {AUTHOR.name} · {SUITE_NAME} · {t('license')}{' '}
          <a href={LICENSE.url} target="_blank" rel="noopener noreferrer">
            {LICENSE.name}
          </a>
        </footer>
      </main>
    </div>
  );
}
