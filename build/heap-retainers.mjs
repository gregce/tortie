#!/usr/bin/env node
/**
 * heap-retainers.mjs. Read a `.heapsnapshot` and print WHO is holding what
 * (Phase 220).
 *
 * ## Why this file exists
 *
 * The split profile of `build/probe-p167-scale.mjs` reported a renderer heap
 * that climbed about 5 MB and 1,020 DOM nodes a block while the elements
 * REACHABLE from the document stayed flat. A pair of totals like that says the
 * renderer is holding trees nobody can see, and it cannot say which trees or
 * what holds them. Phase 220's brief asks for the second question to be
 * answered from retaining paths rather than from the slope, so this is the tool
 * that answers it.
 *
 * It is a plain reader. It starts nothing, opens no socket, launches no
 * Electron and reads only the file it is given.
 *
 * ## What a V8 heap snapshot carries, and the two fields this uses
 *
 * `nodes` and `edges` are flat number arrays described by `snapshot.meta`.
 * Every node has `type`, `name`, `id`, `self_size`, `edge_count`,
 * `trace_node_id` and, since Chrome 87, `detachedness`: 0 unknown, 1 attached,
 * 2 DETACHED. That last field is the whole reason a detached DOM tree can be
 * named without guessing at class names, and it is what the devtools panel's
 * own "Detached" filter reads.
 *
 * Edges are stored consecutively, so node i's edges begin after the edges of
 * every node before it. A breadth first walk from the root gives every reachable
 * node its SHORTEST retaining path, which is the path devtools shows first.
 * `weak` edges are followed for reachability but never chosen as a retainer,
 * because a weak reference is by definition not what keeps an object alive.
 *
 * Usage:
 *   node build/heap-retainers.mjs <snapshot> [--detached] [--name <substring>]
 *                                            [--top N] [--depth N]
 *   node build/heap-retainers.mjs --self-test    builds two small snapshots by
 *                                                hand and launches nothing
 */

import { readFileSync } from 'node:fs';

/** Parse one snapshot file into the shape the walk below wants. */
export function readSnapshot(text) {
  const raw = typeof text === 'string' ? JSON.parse(text) : text;
  const meta = raw.snapshot.meta;
  const nodeFields = meta.node_fields;
  const edgeFields = meta.edge_fields;
  const nodeTypes = meta.node_types[0];
  const edgeTypes = meta.edge_types[0];
  const nf = nodeFields.length;
  const ef = edgeFields.length;
  const at = (name) => nodeFields.indexOf(name);
  const eat = (name) => edgeFields.indexOf(name);
  return {
    nodes: raw.nodes,
    edges: raw.edges,
    strings: raw.strings,
    nf,
    ef,
    nodeCount: raw.nodes.length / nf,
    idx: {
      type: at('type'),
      name: at('name'),
      id: at('id'),
      selfSize: at('self_size'),
      edgeCount: at('edge_count'),
      detachedness: at('detachedness')
    },
    eidx: { type: eat('type'), nameOrIndex: eat('name_or_index'), toNode: eat('to_node') },
    nodeTypes,
    edgeTypes
  };
}

/** The first edge index of every node, so an edge list can be sliced. */
export function edgeOffsets(s) {
  const offsets = new Uint32Array(s.nodeCount + 1);
  let total = 0;
  for (let i = 0; i < s.nodeCount; i += 1) {
    offsets[i] = total;
    total += s.nodes[i * s.nf + s.idx.edgeCount];
  }
  offsets[s.nodeCount] = total;
  return offsets;
}

/**
 * Breadth first from the root, so every reachable node gets its shortest
 * retaining path. `parent[i]` is the node that put i in the queue and
 * `viaEdge[i]` is the edge index it came in on. A `weak` edge never becomes a
 * parent, because a weak reference does not retain.
 */
export function walk(s, offsets) {
  const weakType = s.edgeTypes.indexOf('weak');
  const parent = new Int32Array(s.nodeCount).fill(-1);
  const viaEdge = new Int32Array(s.nodeCount).fill(-1);
  const seen = new Uint8Array(s.nodeCount);
  const queue = new Int32Array(s.nodeCount);
  let head = 0;
  let tail = 0;
  queue[tail] = 0;
  tail += 1;
  seen[0] = 1;
  // Two passes: strong edges first for every node at a given depth, so a weak
  // edge can never be the shortest path when a strong one exists.
  for (const strongOnly of [true, false]) {
    if (!strongOnly) {
      head = 0;
      tail = 0;
      queue[tail] = 0;
      tail += 1;
    }
    while (head < tail) {
      const node = queue[head];
      head += 1;
      const first = offsets[node];
      const last = offsets[node + 1];
      for (let e = first; e < last; e += 1) {
        const type = s.edges[e * s.ef + s.eidx.type];
        if (strongOnly && type === weakType) continue;
        const to = s.edges[e * s.ef + s.eidx.toNode] / s.nf;
        if (seen[to] === 1) continue;
        seen[to] = 1;
        parent[to] = node;
        viaEdge[to] = e;
        queue[tail] = to;
        tail += 1;
      }
    }
  }
  return { parent, viaEdge, seen };
}

const nodeName = (s, i) => s.strings[s.nodes[i * s.nf + s.idx.name]] ?? '';
const nodeType = (s, i) => s.nodeTypes[s.nodes[i * s.nf + s.idx.type]] ?? '';
const nodeSize = (s, i) => s.nodes[i * s.nf + s.idx.selfSize];
const detached = (s, i) =>
  s.idx.detachedness >= 0 && s.nodes[i * s.nf + s.idx.detachedness] === 2;

/** One edge, written the way a devtools retaining path writes it. */
function edgeLabel(s, e) {
  const type = s.edgeTypes[s.edges[e * s.ef + s.eidx.type]] ?? '';
  const raw = s.edges[e * s.ef + s.eidx.nameOrIndex];
  const name = type === 'element' || type === 'hidden' ? `[${String(raw)}]` : (s.strings[raw] ?? '');
  return `${type} ${name}`;
}

/** The shortest retaining path of one node, root last. */
export function pathOf(s, walked, node, depth) {
  const out = [];
  let at = node;
  for (let i = 0; i < depth && at >= 0; i += 1) {
    const via = walked.viaEdge[at];
    out.push(`${nodeType(s, at)} ${nodeName(s, at)}${via >= 0 ? `  <- ${edgeLabel(s, via)}` : ''}`);
    at = walked.parent[at];
    if (at === 0) {
      out.push('(root)');
      break;
    }
  }
  return out;
}

function main(argv) {
  const file = argv[0];
  const wantDetached = argv.includes('--detached');
  const nameAt = argv.indexOf('--name');
  const want = nameAt >= 0 ? argv[nameAt + 1] : null;
  const topAt = argv.indexOf('--top');
  const top = topAt >= 0 ? Number(argv[topAt + 1]) : 8;
  const depthAt = argv.indexOf('--depth');
  const depth = depthAt >= 0 ? Number(argv[depthAt + 1]) : 14;

  const s = readSnapshot(readFileSync(file, 'utf8'));
  const offsets = edgeOffsets(s);
  const walked = walk(s, offsets);

  const groups = new Map();
  const example = new Map();
  let matched = 0;
  let bytes = 0;
  for (let i = 1; i < s.nodeCount; i += 1) {
    if (wantDetached && !detached(s, i)) continue;
    const name = nodeName(s, i);
    if (want !== null && !name.includes(want)) continue;
    if (walked.seen[i] !== 1) continue;
    matched += 1;
    bytes += nodeSize(s, i);
    const key = `${nodeType(s, i)} ${name}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
    if (!example.has(key)) example.set(key, i);
  }
  process.stdout.write(
    `${file}: ${String(s.nodeCount)} nodes, ` +
      `${String(matched)} matched (${(bytes / 1024).toFixed(1)} KB of self size)\n`
  );
  const ordered = [...groups].sort((a, b) => b[1] - a[1]).slice(0, top);
  for (const [key, count] of ordered) {
    process.stdout.write(`\n${String(count).padStart(6)}  ${key}\n`);
    for (const line of pathOf(s, walked, example.get(key), depth)) {
      process.stdout.write(`        ${line}\n`);
    }
  }
}

/** A snapshot written by hand, so the walk can be watched getting it wrong. */
function fixture(shape) {
  const strings = ['', 'root', 'A', 'B', 'C', 'holder', 'weakref', 'x'];
  const meta = {
    node_fields: ['type', 'name', 'id', 'self_size', 'edge_count', 'detachedness'],
    node_types: [['hidden', 'object', 'native'], 'string', 'number', 'number', 'number', 'number'],
    edge_fields: ['type', 'name_or_index', 'to_node'],
    edge_types: [['context', 'element', 'property', 'internal', 'hidden', 'shortcut', 'weak'], 'string_or_number', 'node']
  };
  const nf = 6;
  const nodes = [];
  const edges = [];
  for (const n of shape.nodes) nodes.push(n.type, n.name, n.id, n.size, n.edges.length, n.detached ?? 0);
  for (const n of shape.nodes) for (const e of n.edges) edges.push(e.type, e.name, e.to * nf);
  return { snapshot: { meta, node_count: shape.nodes.length, edge_count: edges.length / 3 }, nodes, edges, strings };
}

function selfTest() {
  let bad = 0;
  const ok = (name, cond, saw) => {
    if (!cond) bad += 1;
    process.stdout.write(`self-test ${cond ? 'ok  ' : 'BAD '} ${name}${cond ? '' : ` (${saw})`}\n`);
  };
  // root -> holder(property "x") -> B, and root -> A -> B by a longer path.
  // The shortest retainer of B must be the holder.
  {
    const s = readSnapshot(
      fixture({
        nodes: [
          { type: 0, name: 1, id: 1, size: 0, edges: [{ type: 2, name: 5, to: 1 }, { type: 2, name: 2, to: 2 }] },
          { type: 1, name: 5, id: 2, size: 8, edges: [{ type: 2, name: 7, to: 3 }] },
          { type: 1, name: 2, id: 3, size: 8, edges: [{ type: 2, name: 4, to: 3 }] },
          { type: 1, name: 3, id: 4, size: 40, edges: [], detached: 2 }
        ]
      })
    );
    const offsets = edgeOffsets(s);
    const walked = walk(s, offsets);
    ok('the retainer is the shortest path', walked.parent[3] === 1, `parent ${String(walked.parent[3])}`);
    ok('a detached node is read as detached', detached(s, 3), 'not detached');
    ok('an attached node is not', !detached(s, 2), 'read as detached');
    const path = pathOf(s, walked, 3, 6);
    ok('the path names its edge', path[0].includes('property x'), path[0]);
  }
  // The same graph with the SHORT path made weak: the strong longer path wins.
  {
    const s = readSnapshot(
      fixture({
        nodes: [
          { type: 0, name: 1, id: 1, size: 0, edges: [{ type: 6, name: 5, to: 1 }, { type: 2, name: 2, to: 2 }] },
          { type: 1, name: 5, id: 2, size: 8, edges: [{ type: 6, name: 7, to: 3 }] },
          { type: 1, name: 2, id: 3, size: 8, edges: [{ type: 2, name: 4, to: 3 }] },
          { type: 1, name: 3, id: 4, size: 40, edges: [] }
        ]
      })
    );
    const walked = walk(s, edgeOffsets(s));
    ok('a weak edge is never the retainer', walked.parent[3] === 2, `parent ${String(walked.parent[3])}`);
  }
  if (bad > 0) {
    process.stdout.write(`self-test: ${String(bad)} fixture(s) misjudged\n`);
    process.exit(1);
  }
  process.stdout.write('self-test: the walk picks the shortest strong retainer and reads detachedness\n');
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();
else if (args.length === 0) {
  process.stderr.write('usage: node build/heap-retainers.mjs <snapshot> [--detached] [--name <s>] [--top N] [--depth N]\n');
  process.exit(2);
} else main(args);
