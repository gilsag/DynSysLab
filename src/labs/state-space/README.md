# Laboratorio virtual de variables de estado · DynSysLab DIE-USM

Parte de DynSysLab DIE-USM. Las instrucciones para ejecutar, compilar y generar la versión sin conexión están en el README de la raíz del repositorio; esta página se sirve como `state-space.html`.

Aplicación web interactiva (Vite + React + TypeScript) para un curso de sistemas dinámicos lineales: representación en variables de estado, polos y ceros, modos, diagramas de fase, cambio de coordenadas, controlabilidad y observabilidad. Interfaz en español, inglés, portugués, francés, italiano y alemán. Diseñada para computador (ancho mínimo 1100 px); el menú Apariencia agranda el texto para proyectar en clases.

## Contenido

Dos formas enlazadas de definir el sistema (panel lateral): polos y ceros de G(s) (hasta orden 8), o matrices A, B, C, D escritas a mano (hasta n = 8, m = 3, p = 3). Ambas formas describen el mismo sistema: al pasar de una a otra se traslada el sistema actual. Aparte, un circuito RLC de segundo orden (con lugar de los polos al variar un parámetro) puede usarse como ejemplo físico; tiene parámetros propios y sólo actúa como origen. La realización de trabajo (forma canónica controlable, observable, modal o la de la fuente) se usa en todas las pestañas.

| Pestaña | Qué muestra |
|---|---|
| Polos y ceros | Plano s editable (arrastrar, agregar pares, borrar, adherencia), matrices que se iluminan al cambiar, G(s), tabla de modos, respuesta a escalón |
| Representación | Cadena EDO de orden n → n EDO de primer orden → forma vectorial; las realizaciones disponibles; matriz T entre ellas; grafo de flujo de señales |
| Diagrama de fase | Campo vectorial, familia de trayectorias, direcciones propias, animación, comparación con coordenadas modales, plano traza-determinante, descomposición modal en el tiempo |
| Cambio de coordenadas | Base {t₁, t₂} arrastrable, A_z = T⁻¹AT, invariantes, transformación activa vs. cambio de base |
| Respuesta temporal | Respuesta libre con solución cerrada (incluye bloques de Jordan), escalón, impulso, sinusoide, Bode, e^{At} vs. serie truncada vs. exponencial por elementos |
| Controlabilidad y observabilidad | 𝒞, 𝒪, valores singulares, prueba PBH por modo, realización mínima, grafo modal, subespacio alcanzable y elipse del gramiano, "misma salida con estados distintos", barrido de un cero sobre el eje real |

Los rangos de controlabilidad y observabilidad se calculan con transformaciones ortogonales (forma escalonada) sobre el sistema balanceado, porque las matrices de Kalman se vuelven muy mal condicionadas en las formas canónicas de orden alto.

## Estructura

```
math/        álgebra lineal, polinomios, realizaciones, modos, 𝒞/𝒪, gramiano, simulación exacta
components/  plano s, plano de fase, grafo, gráficos, circuito, plano traza-determinante
tabs/        una pestaña por archivo
i18n.ts      todos los textos; cada clave tiene [es, en, pt, fr, it, de]. $…$ se renderiza con KaTeX
tests/           verificación numérica (bases modales, bloque real, 𝒞, 𝒪, cancelaciones, orden 8)
```

Para agregar un idioma: añadir el código a `Lang` (src/format.ts), a `LANGS` y `L` (i18n.ts) y una columna más a cada entrada del diccionario; TypeScript señala las que falten.

El idioma inicial es el del navegador (español si no está entre los seis disponibles) y se puede cambiar en la barra superior. Las preferencias (idioma, sistema, pestaña) se guardan en el navegador.
