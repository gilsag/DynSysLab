# DynSysLab DIE-USM

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · **Português**

Laboratórios virtuais interativos de sistemas dinâmicos, desenvolvidos no Departamento de Engenharia Elétrica da Universidad Técnica Federico Santa María (Chile).

**Abrir os laboratórios:** https://gilsag.github.io/DynSysLab/

| Laboratório | Página | Conteúdo |
|---|---|---|
| Sinais e propriedades de sistemas | `properties.html` | Sinais básicos (incluindo rampas vezes exponenciais e senoides, os modos de raízes repetidas), deslocamento, escalonamento e reflexão, partes par e ímpar, energia e potência, amostragem e periodicidade discreta; linearidade, invariância, causalidade, memória e estabilidade BIBO testadas por experimentos com um catálogo de sistemas ou uma fórmula própria |
| Séries de Taylor e linearização | `taylor.html` | Somas parciais e raio de convergência, reta tangente, limitante do resto e faixa de validade, equilíbrios, jacobiano, classificação e diagrama de fase de sistemas não lineares de segunda ordem |
| Representações equivalentes | `representations.html` | Um mesmo sistema como equação diferencial, função de transferência, variáveis de estado e diagrama de blocos; formas canônicas controlável e observável, realizações não mínimas, respostas ao degrau e ao impulso |
| Redução de diagramas de blocos | `block-diagrams.html` | Regras de série, paralelo e realimentação, mover derivações e somadores quando os laços se cruzam, passo a passo em seis exemplos; resultado com valores dos blocos editáveis, polos e resposta ao degrau |
| Equações diferenciais lineares | `ode.html` | Modos naturais e forçados, ganho complexo e ressonância, resposta homogênea e particular, a entrada zero e a estado zero, transitória e permanente |
| Aproximação de funções | `approximation.html` | Sinais básicos, erro quadrático, equações normais e matriz de Gram, ortogonalidade; pulsos, degraus, base trigonométrica, monômios e polinômios de Legendre |
| Convolução | `convolution.html` | Receita gráfica (refletir, deslocar, integrar) com mudanças de trecho, primeira e segunda integrais de Duhamel, conexões em cascata e em paralelo |
| Variáveis de estado | `state-space.html` | Sistema definido por matrizes, polos e zeros ou um circuito de exemplo; realizações, modos, diagramas de fase, mudança de coordenadas, resposta temporal, controlabilidade e observabilidade |
| Séries de Fourier | `fourier.html` | Decomposição harmônica, aproximação com N termos, fenômeno de Gibbs, espectro, fasores, filtragem LTI, som |
| Circuitos no domínio de Laplace | `laplace.html` | Impedância generalizada e fontes de condição inicial (em série ou em paralelo), equações de nós e de malhas em s (simbólicas e numéricas), resposta a estado zero e a entrada zero, frações parciais com polos múltiplos, teoremas do valor inicial e final |
| Sistema canônico de segunda ordem | `second-order.html` | Polos em função de ζ e ωn (arrastáveis), resposta ao degrau e ao impulso, sobressinal e tempos de subida, pico e acomodação medidos frente às fórmulas, pico de ressonância e largura de banda, equivalência com o RLC série |
| Resposta em frequência | `frequency.html` | Polos e zeros no plano s, diagramas de Bode com assíntotas e margens, Nyquist, resposta temporal, desafios de identificação |

Nos laboratórios de Taylor, aproximação e convolução os estudantes podem digitar suas próprias funções; derivadas, coeficientes de Taylor e jacobianos são calculados de forma exata a partir da fórmula. No de convolução só a entrada u(t) aceita fórmulas livres: as respostas ao impulso se limitam às de sistemas lineares (primeira e segunda ordem, integrador, EDO geral Q(D) y = P(D) u e ganho com atraso puro). No de propriedades é possível digitar um sinal x(t), uma entrada de teste u(t) ou um sistema sem memória y = f(u, t), cujas propriedades são decididas por testes numéricos.

A página inicial (`index.html`) reúne todos os laboratórios. Cada um funciona no navegador, em espanhol, inglês, francês, alemão, italiano e português (por padrão o idioma do navegador), com tema claro e escuro, quatro paletas (Azul, USM, Papel, Alto contraste) e tamanho de texto ajustável para projeção. Também funcionam em tablets e celulares; no celular os controles se abrem com um botão na parte inferior da tela.

## Uso

```bash
npm install
npm run dev            # http://localhost:5173 (página inicial; cada laboratório em /<lab>.html)
npm test               # testes numéricos
npm run build          # site estático em dist/ (requer um servidor web)
npm run build:offline  # um arquivo HTML autocontido por página em dist/offline/ (abre sem conexão, com duplo clique)
npm run build:all      # ambos
```

Os arquivos sem conexão se ligam entre si, de modo que a pasta `dist/offline/` pode ser copiada para um pendrive ou enviada a uma plataforma de aprendizagem.

## Publicação no GitHub Pages

O fluxo `.github/workflows/deploy.yml` executa os testes, compila o site e os arquivos sem conexão e os publica a cada push em `main`. Configuração única: no repositório, Settings → Pages → Build and deployment → Source: **GitHub Actions**. O site fica em `https://<usuário>.github.io/<repositório>/`, e a página inicial oferece o arquivo sem conexão de cada laboratório.

## Estrutura

```
index.html, <lab>.html   uma página por laboratório (compilação multipágina do Vite); index.html é a página inicial
src/shared/              comum a todos os laboratórios: tema (lab-theme.css), cabeçalho, Sobre e menu de
                         exibição (LabChrome.tsx), registro dos laboratórios (suite.ts), componentes (ui.tsx),
                         gráfico em canvas (Plot.tsx), motor de fórmulas (expr.ts) e seu campo (ExprInput.tsx),
                         formato de números (format.ts), logo
src/hub/                 página inicial
src/labs/<lab>/          uma pasta por laboratório (App.tsx, main.tsx, i18n.ts, styles.css e seus componentes)
src/labs/_template/      ponto de partida para novos laboratórios (verificado com o resto, não publicado)
scripts/                 compilação sem conexão e ajuda para criar laboratórios
DESIGN.md                guia de design seguido por cada laboratório
```

O código comum fica em `src/shared/` e é importado como `@shared/…`; uma mudança ali chega a todos os laboratórios na compilação seguinte.

## Adicionar um laboratório

```bash
npm run new-lab -- root-locus    # cria src/labs/root-locus/ e root-locus.html a partir do modelo
```

Construa o laboratório seguindo `DESIGN.md`. Quando estiver pronto, registre-o em `src/shared/suite.ts` (título e resumo em seis idiomas; a ordem das entradas é a que os usuários veem) e adicione seu glifo a `GLYPHS` em `src/shared/LabChrome.tsx`; ele passa a aparecer na página inicial e no diálogo Sobre de cada laboratório.

## Licença

Copyright (c) 2026 Esteban Gil. O código-fonte, a interface, a documentação e os recursos do projeto são distribuídos sob a licença [Creative Commons Atribuição-NãoComercial 4.0 Internacional](https://creativecommons.org/licenses/by-nc/4.0/deed.pt_BR). Gráficos, imagens, resultados e demais produtos que você gerar com os laboratórios são seus para qualquer uso. Veja [LICENSE](LICENSE).

## Autor

Esteban Gil, [Departamento de Engenharia Elétrica](https://eli.usm.cl/), Universidad Técnica Federico Santa María · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)
