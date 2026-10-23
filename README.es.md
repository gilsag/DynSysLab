# DynSysLab DIE-USM

[English](README.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Português](README.pt.md)

Laboratorios virtuales interactivos de sistemas dinámicos, desarrollados en el Departamento de Ingeniería Eléctrica de la Universidad Técnica Federico Santa María (Chile).

**Abrir los laboratorios:** https://gilsag.github.io/DynSysLab/

| Laboratorio | Página | Contenido |
|---|---|---|
| Series de Taylor y linealización | `taylor.html` | Sumas parciales y radio de convergencia, recta tangente, cota del residuo y rango de validez, equilibrios, jacobiano, clasificación y diagrama de fase de sistemas no lineales de segundo orden |
| Convolución | `convolution.html` | Receta gráfica (reflejar, desplazar, integrar) con cambios de tramo, primera y segunda integral de Duhamel, conexiones en cascada y en paralelo |
| Aproximación de funciones | `approximation.html` | Señales básicas, error cuadrático, ecuaciones normales y matriz de Gram, ortogonalidad; pulsos, escalones, base trigonométrica, monomios y polinomios de Legendre |
| Variables de estado | `state-space.html` | Sistema definido desde matrices, polos y ceros o un circuito de ejemplo; realizaciones, modos, diagramas de fase, cambio de coordenadas, respuesta temporal, controlabilidad y observabilidad |
| Series de Fourier | `fourier.html` | Descomposición armónica, aproximación con N términos, fenómeno de Gibbs, espectro, fasores, filtrado LTI, sonido |
| Respuesta en frecuencia | `frequency.html` | Polos y ceros en el plano s, diagramas de Bode con asíntotas y márgenes, Nyquist, respuesta temporal, desafíos de identificación |

En los laboratorios de Taylor, aproximación y convolución los estudiantes pueden escribir sus propias funciones; derivadas, coeficientes de Taylor y jacobianos se calculan de forma exacta a partir de la fórmula. En el de convolución sólo la entrada u(t) admite fórmulas libres: las respuestas a impulso se limitan a las de sistemas lineales (primer y segundo orden, integrador, una EDO general Q(D) y = P(D) u y ganancia con retardo puro).

La página de inicio (`index.html`) reúne todos los laboratorios. Cada uno funciona en el navegador, en español, inglés, francés, alemán, italiano y portugués (por defecto el idioma del navegador), con tema claro y oscuro, cuatro paletas (Azul, USM, Papel, Alto contraste) y tamaño de texto ajustable para proyectar. También funcionan en tablets y teléfonos; en un teléfono los controles se abren con un botón en la parte inferior de la pantalla.

## Uso

```bash
npm install
npm run dev            # http://localhost:5173 (página de inicio; cada laboratorio en /<lab>.html)
npm test               # pruebas numéricas
npm run build          # sitio estático en dist/ (requiere un servidor web)
npm run build:offline  # un archivo HTML autocontenido por página en dist/offline/ (se abre sin conexión, con doble clic)
npm run build:all      # ambos
```

Los archivos sin conexión se enlazan entre sí, de modo que la carpeta `dist/offline/` puede copiarse a un pendrive o subirse a una plataforma de aprendizaje.

## Publicación en GitHub Pages

El flujo `.github/workflows/deploy.yml` ejecuta las pruebas, compila el sitio y los archivos sin conexión, y los publica en cada push a `main`. Configuración única: en el repositorio, Settings → Pages → Build and deployment → Source: **GitHub Actions**. El sitio queda en `https://<usuario>.github.io/<repositorio>/`, y la página de inicio ofrece descargar el archivo sin conexión de cada laboratorio.

## Estructura

```
index.html, <lab>.html   una página por laboratorio (compilación multipágina de Vite); index.html es la página de inicio
src/shared/              común a todos los laboratorios: tema (lab-theme.css), encabezado, Acerca de y menú de
                         visualización (LabChrome.tsx), registro de laboratorios (suite.ts), componentes (ui.tsx),
                         gráfico en canvas (Plot.tsx), motor de fórmulas (expr.ts) y su campo (ExprInput.tsx),
                         formato de números (format.ts), logo
src/hub/                 página de inicio
src/labs/<lab>/          una carpeta por laboratorio (App.tsx, main.tsx, i18n.ts, styles.css y sus componentes)
src/labs/_template/      punto de partida para nuevos laboratorios (se verifica con el resto, no se publica)
scripts/                 compilación sin conexión y ayuda para crear laboratorios
DESIGN.md                guía de diseño que sigue cada laboratorio
```

El código común está en `src/shared/` y se importa como `@shared/…`; un cambio allí llega a todos los laboratorios en la siguiente compilación.

## Agregar un laboratorio

```bash
npm run new-lab -- root-locus    # crea src/labs/root-locus/ y root-locus.html a partir de la plantilla
```

Construya el laboratorio siguiendo `DESIGN.md`. Cuando esté listo, regístrelo en `src/shared/suite.ts` (título y resumen en seis idiomas; el orden de las entradas es el que ven los usuarios) y agregue su glifo a `GLYPHS` en `src/shared/LabChrome.tsx`; así aparece en la página de inicio y en el diálogo Acerca de de cada laboratorio.

## Licencia

Copyright (c) 2026 Esteban Gil. El código fuente, la interfaz, la documentación y los recursos del proyecto se distribuyen bajo [Creative Commons Atribución-NoComercial 4.0 Internacional](https://creativecommons.org/licenses/by-nc/4.0/deed.es). Los gráficos, imágenes, resultados y demás productos que genere con los laboratorios son suyos para cualquier uso. Vea [LICENSE](LICENSE).

## Autor

Esteban Gil, [Departamento de Ingeniería Eléctrica](https://eli.usm.cl/), Universidad Técnica Federico Santa María · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)
