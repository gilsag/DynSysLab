# DynSysLab DIE-USM

[English](README.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Português](README.pt.md)

Laboratoires virtuels interactifs de systèmes dynamiques, développés au Département de génie électrique de l’Universidad Técnica Federico Santa María (Chili).

**Ouvrir les laboratoires :** https://gilsag.github.io/DynSysLab/

| Laboratoire | Page | Contenu |
|---|---|---|
| Séries de Taylor et linéarisation | `taylor.html` | Sommes partielles et rayon de convergence, tangente, borne du reste et domaine de validité, équilibres, jacobienne, classification et portrait de phase de systèmes non linéaires du second ordre |
| Convolution | `convolution.html` | Recette graphique (retourner, décaler, intégrer) avec changements de segment, première et seconde intégrales de Duhamel, connexions en cascade et en parallèle |
| Approximation de fonctions | `approximation.html` | Signaux de base, erreur quadratique, équations normales et matrice de Gram, orthogonalité ; impulsions, échelons, base trigonométrique, monômes et polynômes de Legendre |
| Représentation d’état | `state-space.html` | Système défini par des matrices, des pôles et zéros ou un circuit d’exemple ; réalisations, modes, portraits de phase, changement de coordonnées, réponse temporelle, commandabilité et observabilité |
| Séries de Fourier | `fourier.html` | Décomposition harmonique, approximation à N termes, phénomène de Gibbs, spectre, phaseurs, filtrage LTI, son |
| Réponse fréquentielle | `frequency.html` | Pôles et zéros dans le plan s, diagrammes de Bode avec asymptotes et marges, Nyquist, réponse temporelle, défis d’identification |

Dans les laboratoires de Taylor, d’approximation et de convolution, les étudiants peuvent saisir leurs propres fonctions ; dérivées, coefficients de Taylor et jacobiennes sont calculés exactement à partir de la formule. Dans celui de convolution, seule l’entrée u(t) accepte des formules libres : les réponses impulsionnelles sont limitées à celles de systèmes linéaires (premier et second ordre, intégrateur, EDO générale Q(D) y = P(D) u et gain avec retard pur).

La page d’accueil (`index.html`) rassemble tous les laboratoires. Chacun fonctionne dans le navigateur, en espagnol, anglais, français, allemand, italien et portugais (langue du navigateur par défaut), avec thèmes clair et sombre, quatre palettes (Bleu, USM, Papier, Contraste élevé) et taille de texte réglable pour la projection. Ils fonctionnent aussi sur tablette et téléphone ; sur un téléphone, les commandes s’ouvrent avec un bouton en bas de l’écran.

## Utilisation

```bash
npm install
npm run dev            # http://localhost:5173 (page d’accueil ; chaque laboratoire sur /<lab>.html)
npm test               # tests numériques
npm run build          # site statique dans dist/ (nécessite un serveur web)
npm run build:offline  # un fichier HTML autonome par page dans dist/offline/ (s’ouvre hors ligne, double-clic)
npm run build:all      # les deux
```

Les fichiers hors ligne sont liés entre eux : le dossier `dist/offline/` peut être copié sur une clé USB ou déposé sur une plateforme d’apprentissage.

## Publication sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` lance les tests, construit le site et les fichiers hors ligne, et les publie à chaque push sur `main`. Configuration unique : dans le dépôt, Settings → Pages → Build and deployment → Source : **GitHub Actions**. Le site est alors à `https://<utilisateur>.github.io/<dépôt>/`, et la page d’accueil propose le fichier hors ligne de chaque laboratoire.

## Structure

```
index.html, <lab>.html   une page par laboratoire (construction multipage Vite) ; index.html est la page d’accueil
src/shared/              commun à tous les laboratoires : thème (lab-theme.css), en-tête, À propos et menu
                         d’affichage (LabChrome.tsx), registre des laboratoires (suite.ts), composants (ui.tsx),
                         graphique canvas (Plot.tsx), moteur de formules (expr.ts) et son champ (ExprInput.tsx),
                         format des nombres (format.ts), logo
src/hub/                 page d’accueil
src/labs/<lab>/          un dossier par laboratoire (App.tsx, main.tsx, i18n.ts, styles.css et ses composants)
src/labs/_template/      point de départ des nouveaux laboratoires (vérifié avec le reste, non publié)
scripts/                 construction hors ligne et aide à la création de laboratoires
DESIGN.md                guide de conception suivi par chaque laboratoire
```

Le code commun est dans `src/shared/` et s’importe comme `@shared/…` ; une modification y atteint tous les laboratoires à la construction suivante.

## Ajouter un laboratoire

```bash
npm run new-lab -- root-locus    # crée src/labs/root-locus/ et root-locus.html à partir du modèle
```

Construisez le laboratoire en suivant `DESIGN.md`. Une fois prêt, enregistrez-le dans `src/shared/suite.ts` (titre et résumé en six langues ; l’ordre des entrées est celui que voient les utilisateurs) et ajoutez son glyphe à `GLYPHS` dans `src/shared/LabChrome.tsx` ; il apparaît alors sur la page d’accueil et dans la fenêtre À propos de chaque laboratoire.

## Licence

Copyright (c) 2026 Esteban Gil. Le code source, l’interface, la documentation et les ressources du projet sont distribués sous licence [Creative Commons Attribution - Pas d’Utilisation Commerciale 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/deed.fr). Les graphiques, images, résultats et autres productions que vous générez avec les laboratoires vous appartiennent pour tout usage. Voir [LICENSE](LICENSE).

## Auteur

Esteban Gil, [Département de génie électrique](https://eli.usm.cl/), Universidad Técnica Federico Santa María · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)
