import { useEffect } from 'react';
import { useApp, TabKey } from './state';
import { useT } from './i18n';
import { Sidebar } from './Sidebar';
import { TabSPlane } from './tabs/TabSPlane';
import { TabRepr } from './tabs/TabRepr';
import { TabPhase } from './tabs/TabPhase';
import { TabCoords } from './tabs/TabCoords';
import { TabResp } from './tabs/TabResp';
import { TabCO } from './tabs/TabCO';
import { GLYPHS, LabHeader, persistLang } from '@shared/LabChrome';
import logo from '@shared/logo-utfsm-die.jpg';

const TABS: TabKey[] = ['splane', 'repr', 'phase', 'coords', 'resp', 'co'];

export default function App() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  useEffect(() => persistLang(st.lang), [st.lang]);
  return (
    <div className="lab-app ss">
      <LabHeader
        logo={logo}
        glyph={GLYPHS['state-space']}
        lab="state-space"
        subtitle={t('app.subtitle')}
        lang={st.lang}
        onLang={(lang) => set({ lang })}
        tools={<span className="sysinfo" title={t('app.sysinfo')}>n = {sys.n} · m = {sys.m} · p = {sys.p}</span>}
      />
      <div className="lab-layout">
        <Sidebar />
        <main className="lab-main">
          <nav className="tabs ss-tabs">
            {TABS.map((k) => (
              <button key={k} className={st.tab === k ? 'on' : ''} onClick={() => set({ tab: k })}>
                {t(`tab.${k}` as never)}
              </button>
            ))}
          </nav>
          {st.tab === 'splane' && <TabSPlane />}
          {st.tab === 'repr' && <TabRepr />}
          {st.tab === 'phase' && <TabPhase />}
          {st.tab === 'coords' && <TabCoords />}
          {st.tab === 'resp' && <TabResp />}
          {st.tab === 'co' && <TabCO />}
        </main>
      </div>
    </div>
  );
}
