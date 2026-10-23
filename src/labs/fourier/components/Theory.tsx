import { useT } from '../i18n';
import { Tex } from '@shared/ui';

export function Theory() {
  const t = useT();
  return (
    <div className="theory">
      <h4>{t('thTrig')}</h4>
      <p>{t('thTrigText')}</p>
      <Tex block tex="x(t)=a_0+\sum_{k=1}^{\infty}\big[a_k\cos(k\omega_0 t)+b_k\sin(k\omega_0 t)\big],\qquad \omega_0=\frac{2\pi}{T}" />
      <Tex
        block
        tex="a_0=\frac{1}{T}\int_T x(t)\,dt,\qquad a_k=\frac{2}{T}\int_T x(t)\cos(k\omega_0 t)\,dt,\qquad b_k=\frac{2}{T}\int_T x(t)\sin(k\omega_0 t)\,dt"
      />

      <h4>{t('thAmpPhase')}</h4>
      <Tex
        block
        tex="x(t)=a_0+\sum_{k=1}^{\infty}A_k\cos(k\omega_0 t+\varphi_k),\qquad A_k=\sqrt{a_k^2+b_k^2},\quad \varphi_k=\operatorname{atan2}(-b_k,\,a_k)"
      />

      <h4>{t('thComplex')}</h4>
      <Tex
        block
        tex="x(t)=\sum_{k=-\infty}^{\infty}c_k\,e^{jk\omega_0 t},\qquad c_k=\frac{1}{T}\int_T x(t)\,e^{-jk\omega_0 t}\,dt,\qquad c_k=\frac{a_k-jb_k}{2},\;\; c_{-k}=c_k^{*}"
      />

      <h4>{t('thParseval')}</h4>
      <p>{t('thParsevalText')}</p>
      <Tex
        block
        tex="P=\frac{1}{T}\int_T x^2(t)\,dt=a_0^2+\frac{1}{2}\sum_{k=1}^{\infty}A_k^2=\sum_{k=-\infty}^{\infty}|c_k|^2,\qquad \frac{1}{T}\int_T \big(x-x_N\big)^2dt=\frac{1}{2}\sum_{k>N}A_k^2"
      />

      <h4>{t('thSymmetry')}</h4>
      <p>{t('thSymText')}</p>

      <h4>{t('thGibbs')}</h4>
      <p>{t('thGibbsText')}</p>
      <Tex
        block
        tex="x_N^{\sigma}(t)=a_0+\sum_{k=1}^{N}\sigma_k A_k\cos(k\omega_0 t+\varphi_k),\qquad \sigma_k^{\text{Fejér}}=1-\frac{k}{N+1},\qquad \sigma_k^{\text{Lanczos}}=\operatorname{sinc}\frac{k}{N+1}"
      />

      <h4>{t('thDecay')}</h4>
      <p>{t('thDecayText')}</p>

      <h4>{t('thLti')}</h4>
      <p>{t('thLtiText')}</p>
      <Tex
        block
        tex="x(t)=\sum_k c_k e^{jk\omega_0 t}\;\longrightarrow\;\boxed{H(s)}\;\longrightarrow\;y(t)=\sum_k H(jk\omega_0)\,c_k\,e^{jk\omega_0 t}"
      />

      <h4>{t('thMusic')}</h4>
      <p>{t('thMusicText')}</p>
      <Tex block tex="f_k=k\,f_0,\qquad \Delta=1200\log_2 k\ \text{cents},\qquad f(\text{n})=440\cdot 2^{(n-69)/12}\ \text{Hz (MIDI n)}" />
      <p className="hint">{t('thConventions')}</p>
    </div>
  );
}
