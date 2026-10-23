import type { SystemDef } from '../math/types';
import type { Factor, Margins } from '../math/tf';
import { counts, closedLoopPoles, isProper } from '../math/tf';
import { fmt, tr, type L5, type Lang } from '../i18n';

interface Props {
  sys: SystemDef;
  factors: Factor[];
  margins: Margins;
  nEnc: number | null;
  lang: Lang;
  freqUnit: (w: number) => string;
}

type Tone = 'info' | 'warn' | 'good' | 'bad';

export default function Insights({ sys, factors, margins, nEnc, lang, freqUnit }: Props) {
  const t = tr(lang);
  const L = (o: L5) => o[lang];
  const f = (x: number, d = 3) => fmt(x, lang, d);
  const items: { tone: Tone; text: string }[] = [];
  const c = counts(sys);
  const proper = isProper(sys);
  const gainF = factors[0];
  const kNeg = gainF.ph(1) !== 0;

  // low and high frequency behaviour
  const type = c.z0 - c.p0;
  const ph0 = (kNeg ? -180 : 0) + 90 * type;
  const s0 = f(20 * type);
  items.push({
    tone: 'info',
    text: L({
      es: `Baja frecuencia: pendiente ${s0} dB/dec y fase ${f(ph0)}° (${c.p0} polo(s) y ${c.z0} cero(s) en el origen).`,
      en: `Low frequency: slope ${s0} dB/dec and phase ${f(ph0)}° (${c.p0} pole(s) and ${c.z0} zero(s) at the origin).`,
      pt: `Baixa frequência: inclinação ${s0} dB/déc e fase ${f(ph0)}° (${c.p0} polo(s) e ${c.z0} zero(s) na origem).`,
      fr: `Basse fréquence : pente ${s0} dB/déc et phase ${f(ph0)}° (${c.p0} pôle(s) et ${c.z0} zéro(s) à l’origine).`,
      it: `Bassa frequenza: pendenza ${s0} dB/dec e fase ${f(ph0)}° (${c.p0} polo/i e ${c.z0} zero/i nell’origine).`,
      de: `Tiefe Frequenzen: Steigung ${s0} dB/Dek und Phase ${f(ph0)}° (${c.p0} Pol(e) und ${c.z0} Nullstelle(n) im Ursprung).`,
    }),
  });
  const rel = c.np - c.nz;
  const phInf = factors.filter((x) => x.type !== 'delay').reduce((s, x) => s + x.aph(1e9), 0);
  const s1 = f(-20 * rel);
  const pInf = f(phInf);
  const delayTail =
    sys.delay > 0
      ? L({
          es: ' más el retardo, que la hace caer sin límite.',
          en: ' plus the delay, which makes it fall without bound.',
          pt: ' mais o atraso, que a faz cair sem limite.',
          fr: ', plus le retard, qui la fait chuter sans limite.',
          it: ' più il ritardo, che la fa scendere senza limite.',
          de: ' zuzüglich der Totzeit, die sie unbegrenzt fallen lässt.',
        })
      : '.';
  items.push({
    tone: 'info',
    text:
      L({
        es: `Alta frecuencia: grado relativo n − m = ${rel}, pendiente ${s1} dB/dec, fase tiende a ${pInf}°`,
        en: `High frequency: relative degree n − m = ${rel}, slope ${s1} dB/dec, phase tends to ${pInf}°`,
        pt: `Alta frequência: grau relativo n − m = ${rel}, inclinação ${s1} dB/déc, a fase tende a ${pInf}°`,
        fr: `Haute fréquence : degré relatif n − m = ${rel}, pente ${s1} dB/déc, la phase tend vers ${pInf}°`,
        it: `Alta frequenza: grado relativo n − m = ${rel}, pendenza ${s1} dB/dec, la fase tende a ${pInf}°`,
        de: `Hohe Frequenzen: Relativgrad n − m = ${rel}, Steigung ${s1} dB/Dek, Phase strebt gegen ${pInf}°`,
      }) + delayTail,
  });

  // corner frequencies
  const corners = factors
    .filter((x) => x.type === 'real' || x.type === 'pair')
    .sort((a, b) => a.wc! - b.wc!)
    .map((x) => {
      const r = x.root!;
      const kind = (r.kind === 'pole' ? t('pole') : t('zero')).toLowerCase();
      const extra = x.type === 'pair' ? ` (${t('pair')}, ζ = ${f(x.zeta!)})` : '';
      return `${freqUnit(x.wc!)} ${lang === 'de' ? (r.kind === 'pole' ? 'Pol' : 'Nullstelle') : kind}${extra}`;
    });
  if (corners.length)
    items.push({
      tone: 'info',
      text:
        L({
          es: 'Frecuencias de quiebre: ',
          en: 'Corner frequencies: ',
          pt: 'Frequências de corte: ',
          fr: 'Fréquences de cassure : ',
          it: 'Frequenze di rottura: ',
          de: 'Knickfrequenzen: ',
        }) +
        corners.join('; ') +
        '.',
    });

  // resonances / anti-resonances
  for (const x of factors) {
    if (x.type !== 'pair') continue;
    const z = Math.abs(x.zeta!);
    const wn = x.wc!;
    if (x.kind === 'pole' && z > 0 && z < 0.65) {
      const mr = f(20 * Math.log10(1 / (2 * z * Math.sqrt(1 - z * z))));
      const wr = freqUnit(wn * Math.sqrt(1 - 2 * z * z));
      const zz = f(z);
      const lim = f(0.707);
      items.push({
        tone: 'info',
        text: L({
          es: `Par de polos con ζ = ${zz} < ${lim}: pico de resonancia de ${mr} dB sobre la asíntota en ωr = ωn√(1 − 2ζ²) = ${wr}.`,
          en: `Pole pair with ζ = ${zz} < ${lim}: resonant peak of ${mr} dB above the asymptote at ωr = ωn√(1 − 2ζ²) = ${wr}.`,
          pt: `Par de polos com ζ = ${zz} < ${lim}: pico de ressonância de ${mr} dB acima da assíntota em ωr = ωn√(1 − 2ζ²) = ${wr}.`,
          fr: `Paire de pôles avec ζ = ${zz} < ${lim} : pic de résonance de ${mr} dB au-dessus de l’asymptote en ωr = ωn√(1 − 2ζ²) = ${wr}.`,
          it: `Coppia di poli con ζ = ${zz} < ${lim}: picco di risonanza di ${mr} dB sopra l’asintoto in ωr = ωn√(1 − 2ζ²) = ${wr}.`,
          de: `Polpaar mit ζ = ${zz} < ${lim}: Resonanzüberhöhung von ${mr} dB über der Asymptote bei ωr = ωn√(1 − 2ζ²) = ${wr}.`,
        }),
      });
    }
    if (x.kind === 'pole' && z === 0) {
      const w = freqUnit(wn);
      items.push({
        tone: 'warn',
        text: L({
          es: `Par de polos sobre el eje imaginario (ζ = 0): magnitud infinita y salto de fase de −180° en ω = ${w}. Oscilación sostenida.`,
          en: `Pole pair on the imaginary axis (ζ = 0): infinite magnitude and a −180° phase jump at ω = ${w}. Sustained oscillation.`,
          pt: `Par de polos sobre o eixo imaginário (ζ = 0): magnitude infinita e salto de fase de −180° em ω = ${w}. Oscilação sustentada.`,
          fr: `Paire de pôles sur l’axe imaginaire (ζ = 0) : module infini et saut de phase de −180° en ω = ${w}. Oscillation entretenue.`,
          it: `Coppia di poli sull’asse immaginario (ζ = 0): modulo infinito e salto di fase di −180° in ω = ${w}. Oscillazione persistente.`,
          de: `Polpaar auf der imaginären Achse (ζ = 0): unendlicher Betrag und Phasensprung von −180° bei ω = ${w}. Dauerschwingung.`,
        }),
      });
    }
    if (x.kind === 'zero' && z < 0.3) {
      const w = freqUnit(wn);
      const zz = f(z);
      const d = f(20 * Math.log10(Math.max(2 * z, 1e-12)));
      items.push({
        tone: 'info',
        text: L({
          es: `Par de ceros con ζ = ${zz}: muesca en ω = ${w}, el factor vale 2ζ = ${d} dB ahí.`,
          en: `Zero pair with ζ = ${zz}: notch at ω = ${w}, where the factor equals 2ζ = ${d} dB.`,
          pt: `Par de zeros com ζ = ${zz}: notch em ω = ${w}, onde o fator vale 2ζ = ${d} dB.`,
          fr: `Paire de zéros avec ζ = ${zz} : réjection en ω = ${w}, où le facteur vaut 2ζ = ${d} dB.`,
          it: `Coppia di zeri con ζ = ${zz}: notch in ω = ${w}, dove il fattore vale 2ζ = ${d} dB.`,
          de: `Nullstellenpaar mit ζ = ${zz}: Kerbe bei ω = ${w}, dort beträgt der Faktor 2ζ = ${d} dB.`,
        }),
      });
    }
  }

  // near cancellations
  const ps = sys.roots.filter((r) => r.kind === 'pole');
  const zs = sys.roots.filter((r) => r.kind === 'zero');
  for (const p of ps)
    for (const z of zs) {
      const d = Math.hypot(p.re - z.re, p.im - z.im);
      const m = Math.max(Math.hypot(p.re, p.im), 1e-9);
      if ((p.im > 0) === (z.im > 0) && d / m < 0.05 && m > 1e-9) {
        const loc = `${f(p.re)}${p.im ? ` ± j${f(p.im)}` : ''}`;
        items.push({
          tone: p.re > 0 ? 'bad' : 'info',
          text:
            L({
              es: `Polo y cero casi coincidentes cerca de ${loc}: se cancelan en Bode.`,
              en: `Pole and zero nearly coincide near ${loc}: they cancel in the Bode plot.`,
              pt: `Polo e zero quase coincidentes perto de ${loc}: cancelam-se no Bode.`,
              fr: `Pôle et zéro presque confondus près de ${loc} : ils se compensent dans le diagramme de Bode.`,
              it: `Polo e zero quasi coincidenti vicino a ${loc}: si cancellano nel diagramma di Bode.`,
              de: `Pol und Nullstelle fallen bei ${loc} fast zusammen: Sie heben sich im Bode-Diagramm auf.`,
            }) +
            (p.re > 0
              ? L({
                  es: ' Pero el polo es inestable: cancelarlo con un cero no estabiliza el sistema (modo interno inestable).',
                  en: ' But the pole is unstable: cancelling it with a zero does not stabilise the system (unstable hidden mode).',
                  pt: ' Mas o polo é instável: cancelá-lo com um zero não estabiliza o sistema (modo interno instável).',
                  fr: ' Mais le pôle est instable : le compenser par un zéro ne stabilise pas le système (mode interne instable).',
                  it: ' Ma il polo è instabile: cancellarlo con uno zero non stabilizza il sistema (modo interno instabile).',
                  de: ' Der Pol ist aber instabil: Eine Kompensation durch eine Nullstelle stabilisiert das System nicht (instabiler verdeckter Mode).',
                })
              : ''),
        });
      }
    }

  if (c.rhpZ)
    items.push({
      tone: 'warn',
      text: L({
        es: `Fase no mínima: ${c.rhpZ} cero(s) en el semiplano derecho. Aportan la misma magnitud que su reflejo en el SPI, pero restan fase en vez de sumarla, y producen respuesta inversa.`,
        en: `Non-minimum phase: ${c.rhpZ} zero(s) in the right half-plane. They contribute the same magnitude as their LHP mirror image, but subtract phase instead of adding it, and cause inverse response.`,
        pt: `Fase não mínima: ${c.rhpZ} zero(s) no semiplano direito. Contribuem com a mesma magnitude que seu reflexo no SPE, mas subtraem fase em vez de somá-la e produzem resposta inversa.`,
        fr: `Déphasage non minimal : ${c.rhpZ} zéro(s) dans le demi-plan droit. Ils apportent le même module que leur symétrique dans le DPG, mais retirent de la phase au lieu d’en ajouter, et provoquent une réponse inverse.`,
        it: `Fase non minima: ${c.rhpZ} zero/i nel semipiano destro. Danno lo stesso modulo della loro immagine speculare nel semipiano sinistro, ma sottraggono fase invece di aggiungerla e producono una risposta inversa.`,
        de: `Nichtminimalphasig: ${c.rhpZ} Nullstelle(n) in der rechten Halbebene. Sie liefern denselben Betrag wie ihr Spiegelbild links, ziehen aber Phase ab statt sie hinzuzufügen und verursachen eine inverse Antwort.`,
      }),
    });
  if (c.rhpP)
    items.push({
      tone: 'bad',
      text: L({
        es: `Inestable en lazo abierto: ${c.rhpP} polo(s) en el semiplano derecho. Los márgenes de Bode no bastan para juzgar el lazo cerrado; usa Nyquist.`,
        en: `Open-loop unstable: ${c.rhpP} pole(s) in the right half-plane. Bode margins are not enough to judge the closed loop; use Nyquist.`,
        pt: `Instável em malha aberta: ${c.rhpP} polo(s) no semiplano direito. As margens de Bode não bastam para julgar a malha fechada; use Nyquist.`,
        fr: `Instable en boucle ouverte : ${c.rhpP} pôle(s) dans le demi-plan droit. Les marges de Bode ne suffisent pas pour juger la boucle fermée ; utilisez Nyquist.`,
        it: `Instabile ad anello aperto: ${c.rhpP} polo/i nel semipiano destro. I margini di Bode non bastano per giudicare l’anello chiuso; usa Nyquist.`,
        de: `Offener Kreis instabil: ${c.rhpP} Pol(e) in der rechten Halbebene. Die Bode-Reserven reichen zur Beurteilung des geschlossenen Kreises nicht aus; Nyquist verwenden.`,
      }),
    });
  if (!proper)
    items.push({
      tone: 'warn',
      text: L({
        es: 'Impropio: hay más ceros que polos, la magnitud crece sin límite en alta frecuencia.',
        en: 'Improper: more zeros than poles, the magnitude grows without bound at high frequency.',
        pt: 'Impróprio: há mais zeros que polos, a magnitude cresce sem limite em alta frequência.',
        fr: 'Impropre : plus de zéros que de pôles, le module croît sans limite en haute fréquence.',
        it: 'Improprio: ci sono più zeri che poli, il modulo cresce senza limite in alta frequenza.',
        de: 'Nicht proper: mehr Nullstellen als Pole, der Betrag wächst bei hohen Frequenzen unbegrenzt.',
      }),
    });
  if (sys.delay > 0) {
    const T = f(sys.delay);
    const w = freqUnit(1 / sys.delay);
    const deg = f(-57.3);
    items.push({
      tone: 'info',
      text: L({
        es: `Retardo T = ${T} s: fase −ωT, que es ${deg}° en ω = 1/T = ${w} y crece linealmente con ω (curva exponencial en escala log).`,
        en: `Delay T = ${T} s: phase −ωT, which is ${deg}° at ω = 1/T = ${w} and grows linearly with ω (an exponential curve on a log scale).`,
        pt: `Atraso T = ${T} s: fase −ωT, que vale ${deg}° em ω = 1/T = ${w} e cresce linearmente com ω (curva exponencial em escala log).`,
        fr: `Retard T = ${T} s : phase −ωT, qui vaut ${deg}° en ω = 1/T = ${w} et croît linéairement avec ω (courbe exponentielle en échelle log).`,
        it: `Ritardo T = ${T} s: fase −ωT, che vale ${deg}° in ω = 1/T = ${w} e cresce linearmente con ω (curva esponenziale in scala logaritmica).`,
        de: `Totzeit T = ${T} s: Phase −ωT, das sind ${deg}° bei ω = 1/T = ${w}, linear wachsend mit ω (exponentielle Kurve im log-Maßstab).`,
      }),
    });
  }

  // margins and closed loop
  if (margins.pm !== null || margins.gm !== null) {
    const parts: string[] = [];
    if (margins.pm !== null) parts.push(`${t('pm')} = ${f(margins.pm)}° @ ${freqUnit(margins.pmW!)}`);
    if (margins.gm !== null) parts.push(`${t('gm')} = ${f(margins.gm)} dB @ ${freqUnit(margins.gmW!)}`);
    items.push({ tone: (margins.pm ?? 1) > 0 && (margins.gm ?? 1) > 0 ? 'good' : 'bad', text: parts.join(' · ') });
  }
  if (proper && c.np > 0) {
    let stable: boolean | null = null;
    let how = '';
    if (nEnc !== null) {
      const Z = nEnc + c.rhpP;
      stable = Z === 0;
      how = `Nyquist: N = ${nEnc}, P = ${c.rhpP} ⇒ Z = ${Z}`;
    } else if (sys.delay === 0) {
      const cl = closedLoopPoles(sys);
      stable = cl.every((p) => p.re < -1e-9);
      how = L({
        es: 'raíces de 1 + H(s) = 0',
        en: 'roots of 1 + H(s) = 0',
        pt: 'raízes de 1 + H(s) = 0',
        fr: 'racines de 1 + H(s) = 0',
        it: 'radici di 1 + H(s) = 0',
        de: 'Wurzeln von 1 + H(s) = 0',
      });
    }
    if (stable !== null) {
      const st = stable
        ? L({ es: 'estable', en: 'stable', pt: 'estável', fr: 'stable', it: 'stabile', de: 'stabil' })
        : t('unstable');
      items.push({
        tone: stable ? 'good' : 'bad',
        text: L({
          es: `Lazo cerrado con realimentación unitaria negativa: ${st} (${how}).`,
          en: `Closed loop with unity negative feedback: ${st} (${how}).`,
          pt: `Malha fechada com realimentação unitária negativa: ${st} (${how}).`,
          fr: `Boucle fermée avec retour unitaire négatif : ${st} (${how}).`,
          it: `Anello chiuso con retroazione unitaria negativa: ${st} (${how}).`,
          de: `Geschlossener Kreis mit negativer Einheitsrückführung: ${st} (${how}).`,
        }),
      });
    }
  }

  return (
    <ul className="insights">
      {items.map((it, i) => (
        <li key={i} className={it.tone}>
          {it.text}
        </li>
      ))}
    </ul>
  );
}
