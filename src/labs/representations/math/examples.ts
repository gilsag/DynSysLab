// Block-diagram reduction examples: stages drawn as chains with loops, and the numeric result.
import { feedback, radd, rat, rmul, type Rational } from '@shared/poly';
import type { Chain } from '../components/Diagrams';

export type Rule = 'original' | 'parallel' | 'series' | 'feedback' | 'movePick';
export interface Stage {
  rule: Rule;
  chain: Chain;
  /** TeX of the block that has just been formed (or of the whole system at the end) */
  tex?: string;
}
export interface Example {
  id: 'seriesParallel' | 'feedback' | 'nested' | 'moving';
  stages: Stage[];
  /** numeric blocks used to evaluate the result */
  values: [string, Rational][];
  result: (v: Record<string, Rational>) => Rational;
  /** TeX of the final equivalent transfer function */
  final: string;
}

const inv = (r: Rational): Rational => ({ num: r.den, den: r.num });

export const EXAMPLES: Example[] = [
  {
    id: 'seriesParallel',
    stages: [
      { rule: 'original', chain: { nodes: [{ k: 'pick', id: 'p' }, { k: 'block', label: 'G₁' }, { k: 'sum', id: 'S' }, { k: 'block', label: 'G₂' }], loops: [{ from: 'p', to: 'S', label: 'G₃', side: 'above', level: 1, sign: '+' }] } },
      { rule: 'parallel', chain: { nodes: [{ k: 'block', label: 'G₁ + G₃', hl: true }, { k: 'block', label: 'G₂' }], loops: [] }, tex: 'G_1 + G_3' },
      { rule: 'series', chain: { nodes: [{ k: 'block', label: '(G₁ + G₃) G₂', hl: true }], loops: [] }, tex: '(G_1 + G_3)\\,G_2' },
    ],
    values: [['G_1', rat([1], [1, 1])], ['G_2', rat([2], [2, 1])], ['G_3', rat([1])]],
    result: (v) => rmul(radd(v.G_1, v.G_3), v.G_2),
    final: '\\frac{Y(s)}{R(s)} = (G_1 + G_3)\\,G_2',
  },
  {
    id: 'feedback',
    stages: [
      { rule: 'original', chain: { nodes: [{ k: 'sum', id: 'S' }, { k: 'block', label: 'G' }, { k: 'pick', id: 'p' }], loops: [{ from: 'p', to: 'S', label: 'H', side: 'below', level: 1, sign: '−' }] } },
      { rule: 'feedback', chain: { nodes: [{ k: 'block', label: 'G / (1 + G H)', hl: true }], loops: [] }, tex: '\\frac{G}{1 + G H}' },
    ],
    values: [['G', rat([4], [0, 2, 1])], ['H', rat([1])]],
    result: (v) => feedback(v.G, v.H),
    final: '\\frac{Y(s)}{R(s)} = \\frac{G}{1 + G H}',
  },
  {
    id: 'nested',
    stages: [
      {
        rule: 'original',
        chain: {
          nodes: [{ k: 'sum', id: 'S1' }, { k: 'block', label: 'G₁' }, { k: 'sum', id: 'S2' }, { k: 'block', label: 'G₂' }, { k: 'pick', id: 'p2' }, { k: 'block', label: 'G₃' }, { k: 'pick', id: 'p1' }],
          loops: [{ from: 'p2', to: 'S2', label: 'H₁', side: 'below', level: 1, sign: '−' }, { from: 'p1', to: 'S1', label: 'H₂', side: 'below', level: 2, sign: '−' }],
        },
      },
      {
        rule: 'feedback',
        chain: {
          nodes: [{ k: 'sum', id: 'S1' }, { k: 'block', label: 'G₁' }, { k: 'block', label: 'G₂ / (1 + G₂H₁)', hl: true }, { k: 'block', label: 'G₃' }, { k: 'pick', id: 'p1' }],
          loops: [{ from: 'p1', to: 'S1', label: 'H₂', side: 'below', level: 1, sign: '−' }],
        },
        tex: '\\frac{G_2}{1 + G_2 H_1}',
      },
      {
        rule: 'series',
        chain: { nodes: [{ k: 'sum', id: 'S1' }, { k: 'block', label: 'G₁G₂G₃ / (1 + G₂H₁)', hl: true }, { k: 'pick', id: 'p1' }], loops: [{ from: 'p1', to: 'S1', label: 'H₂', side: 'below', level: 1, sign: '−' }] },
        tex: '\\frac{G_1 G_2 G_3}{1 + G_2 H_1}',
      },
      { rule: 'feedback', chain: { nodes: [{ k: 'block', label: 'G₁G₂G₃ / (1 + G₂H₁ + G₁G₂G₃H₂)', hl: true }], loops: [] }, tex: '\\frac{G_1 G_2 G_3}{1 + G_2 H_1 + G_1 G_2 G_3 H_2}' },
    ],
    values: [['G_1', rat([2])], ['G_2', rat([1], [1, 1])], ['G_3', rat([1], [0, 1])], ['H_1', rat([1])], ['H_2', rat([1])]],
    result: (v) => feedback(rmul(rmul(v.G_1, feedback(v.G_2, v.H_1)), v.G_3), v.H_2),
    final: '\\frac{Y(s)}{R(s)} = \\frac{G_1 G_2 G_3}{1 + G_2 H_1 + G_1 G_2 G_3 H_2}',
  },
  {
    id: 'moving',
    stages: [
      {
        rule: 'original',
        chain: {
          nodes: [{ k: 'sum', id: 'S1' }, { k: 'block', label: 'G₁' }, { k: 'sum', id: 'S2' }, { k: 'block', label: 'G₂' }, { k: 'pick', id: 'a' }, { k: 'block', label: 'G₃' }, { k: 'pick', id: 'b' }],
          loops: [{ from: 'b', to: 'S2', label: 'H₂', side: 'below', level: 1, sign: '−' }, { from: 'a', to: 'S1', label: 'H₁', side: 'below', level: 2, sign: '−' }],
        },
      },
      {
        rule: 'movePick',
        chain: {
          nodes: [{ k: 'sum', id: 'S1' }, { k: 'block', label: 'G₁' }, { k: 'sum', id: 'S2' }, { k: 'block', label: 'G₂' }, { k: 'block', label: 'G₃' }, { k: 'pick', id: 'b' }],
          loops: [{ from: 'b', to: 'S2', label: 'H₂', side: 'below', level: 1, sign: '−' }, { from: 'b', to: 'S1', label: 'H₁ / G₃', side: 'below', level: 2, sign: '−', hl: true }],
        },
        tex: '\\frac{H_1}{G_3}',
      },
      {
        rule: 'feedback',
        chain: { nodes: [{ k: 'sum', id: 'S1' }, { k: 'block', label: 'G₁' }, { k: 'block', label: 'G₂G₃ / (1 + G₂G₃H₂)', hl: true }, { k: 'pick', id: 'b' }], loops: [{ from: 'b', to: 'S1', label: 'H₁ / G₃', side: 'below', level: 1, sign: '−' }] },
        tex: '\\frac{G_2 G_3}{1 + G_2 G_3 H_2}',
      },
      { rule: 'feedback', chain: { nodes: [{ k: 'block', label: 'G₁G₂G₃ / (1 + G₂G₃H₂ + G₁G₂H₁)', hl: true }], loops: [] }, tex: '\\frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2 + G_1 G_2 H_1}' },
    ],
    values: [['G_1', rat([1], [1, 1])], ['G_2', rat([2], [0, 1])], ['G_3', rat([1], [2, 1])], ['H_1', rat([1])], ['H_2', rat([0.5])]],
    result: (v) => feedback(rmul(v.G_1, feedback(rmul(v.G_2, v.G_3), v.H_2)), rmul(v.H_1, inv(v.G_3))),
    final: '\\frac{Y(s)}{R(s)} = \\frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2 + G_1 G_2 H_1}',
  },
];
