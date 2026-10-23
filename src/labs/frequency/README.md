# Laboratorio virtual de respuesta en frecuencia · DynSysLab DIE-USM

Parte de DynSysLab DIE-USM / part of DynSysLab DIE-USM. Las instrucciones para ejecutar y compilar están en el README de la raíz del repositorio / run and build instructions are in the root README. Página / page: `frequency.html`.

Interactive pole-zero / Bode laboratory for a dynamic systems course. Multilingual (ES/EN/FR/DE/IT/PT), React + TypeScript + Vite, no runtime dependencies beyond React.

Laboratorio interactivo polos-ceros / Bode para un curso de sistemas dinámicos. Multilingüe (ES/EN/FR/DE/IT/PT), React + TypeScript + Vite, sin dependencias en tiempo de ejecución aparte de React.


## Funciones / Features

**Plano s / s-plane**
- Arrastrar polos (×) y ceros (○); clic para agregar (fuera del eje real se agrega un par conjugado); modo borrar.
- Un par complejo que toca el eje real se separa en dos raíces reales; dos raíces reales cercanas, sacadas del eje, se fusionan en un par (preserva el orden del sistema, como el punto de ruptura del lugar de la raíz).
- Vectores desde cada raíz hasta jω (ω elegida en el Bode): interpretación geométrica de |H| y ∠H.
- Polos de lazo cerrado (realimentación unitaria negativa) y lugar de la raíz.
- Rueda = zoom, arrastrar el fondo = desplazar, ajuste a grilla, encuadre automático.

**Bode**
- Curvas exactas, asíntotas (rectas de Bode, transición de fase de pares con ancho 10^±ζ), aporte individual de cada factor.
- Márgenes de ganancia y fase marcados sobre el diagrama.
- "Congelar curva" para comparar antes/después (también en respuesta temporal, Nyquist y plano s).
- Ganancia en forma de Bode (K_B fija: el nivel de baja frecuencia no cambia al mover raíces) o forma polo-cero (K fija, como en el lugar de la raíz).
- Retardo puro e^(−sT). Unidades rad/s o Hz. Rango automático o manual.

**Pestañas / Tabs**
- Respuesta al escalón e impulso con sobrepaso, tiempo de subida y de asentamiento (discretización exacta por exponencial matricial).
- Entrada sinusoidal: simulación exacta del transitorio más régimen permanente, comparada con |H(jω)| y ∠H(jω).
- Nyquist con compresión logarítmica, rama de ω < 0, conteo de vueltas y Z = N + P.
- Tabla de aportes de cada factor a ω (dB, grados, distancias y ángulos de los vectores).
- Desafío: un sistema oculto aparece como curva objetivo; los estudiantes deben reconstruirlo (tres niveles).

**Otros / Other**
- Panel de observaciones automáticas: pendientes, quiebres, resonancias, fase no mínima, cancelaciones polo-cero, inestabilidad, márgenes.
- Ejemplos predefinidos con explicación (primer orden, integrador, segundo orden, adelanto, atraso, muesca, pasa banda, pasa todo, cero en el SPD, PID, lazo con retardo).
- Deshacer/rehacer (Ctrl+Z / Ctrl+Y), atajos P/Z/M/D/Supr/Esc, enlace compartible (el sistema queda codificado en la URL), tema claro/oscuro.

## Pantalla / Screen

Diseñada para computador o proyector, con el diseño común de DynSysLab: panel lateral (plano s, ganancia, raíces, H(s)) y columna principal. Desde 1500 px de ancho el análisis queda a la derecha del Bode; en pantallas más angostas, debajo.

Designed for a computer or projector, with the common DynSysLab layout: sidebar (s-plane, gain, roots, H(s)) and main column. From 1500 px wide the analysis sits to the right of the Bode diagram; on narrower screens, below it.

## Estructura / Layout

```
math/      tf.ts (factores, Bode, márgenes, Nyquist), poly.ts (raíces Aberth), sim.ts (expm, simulación), presets.ts
components SPlane, BodePlot, LinePlot, Panels (tiempo/seno/Nyquist/aportes), Challenge, RootTable, TFDisplay, Insights
i18n.ts    textos ES/EN/FR/DE/IT/PT (diccionario `dict`; agregar un idioma = añadir su código a `LANGS` y una entrada en cada texto)
```

Para agregar un ejemplo, añade una entrada en `math/presets.ts`. To add an example, add an entry to `math/presets.ts`.
