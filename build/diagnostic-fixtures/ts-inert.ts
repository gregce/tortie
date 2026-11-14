// A fixture for build/conformance-diagnostic.mjs (Phase 364): rule D3.c,
// proved before it reads the tree. Every line marked @red is a top-level
// statement that runs code when its module is imported, which rollup keeps in
// the normal bundle even when nothing the module exports is called; no other
// line runs anything. It is never compiled.
import { join } from 'node:path';
import './side-effect'; // @red
import type { Stats } from 'node:fs';

export const NAME = 'diagnostic';
export const LIMIT = 1023;
export const NEGATIVE = -1;
export const LIST = ['watcher', 'terminal', 'door'] as const;
export const SHAPE = { a: 1, b: 'two', c: [3], d: { e: true } };
export const ARROW = (x: number): number => x + 1;
export const FN = function named(): void {};
const ALIAS = NAME;
declare const __FIXTURE__: boolean;
export const FLAG: boolean = __FIXTURE__;
export const GUARDED: boolean = typeof __FIXTURE__ === 'boolean' && __FIXTURE__;
export const CALLED = typeof __FIXTURE__ === 'boolean' && String(__FIXTURE__) === 'true'; // @red
export const JOINED = join('a', 'b'); // @red
export const MADE = new Map<string, number>(); // @red
export const TEMPLATE = `${NAME}-x`; // @red
export enum Kind { A, B } // @red
export const enum Fixed { A, B }
export function later(): void {
  void ALIAS;
}
export interface Shape {
  a: number;
}
export type Alias = Stats;
console.log('loaded'); // @red
export class Holder { static made = new Map(); } // @red
export class Plain {
  value = 1;
  method(): number {
    return this.value;
  }
}
