'use strict';
// Research 63. Three of the mapper lanes wrote their fixture as a DESCRIPTION of the store's
// rows rather than as the store itself, because a SQLite file is not reviewable and a fixture
// nobody can read is not a fixture. This adapter turns those descriptions back into a real
// file so the SAME reader runs against them. Temp files are deleted by the caller.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function tmp(name) { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'r63-fx-')), name); }

// copilotide: the fixture wraps the real chat document under `document`.
function copilotide(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = tmp('chatsession.json');
  fs.writeFileSync(out, JSON.stringify(d.document));
  return { file: out, dir: path.dirname(out) };
}

function cursor(file) {
  const { DatabaseSync } = require('node:sqlite');
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = tmp('store.db');
  const db = new DatabaseSync(out);
  db.exec('create table blobs (id TEXT PRIMARY KEY, data BLOB); create table meta (key TEXT PRIMARY KEY, value TEXT);');
  const ib = db.prepare('insert into blobs (id,data) values (?,?)');
  ib.run(d.root_blob_id, new Uint8Array(Buffer.from(d.root_blob_hex, "hex")));
  for (const [id, body] of Object.entries(d.blobs)) {
    if (id === d.root_blob_id) continue;
    ib.run(id, new Uint8Array(Buffer.from(typeof body === "string" ? body : JSON.stringify(body), "utf8")));
  }
  const im = db.prepare('insert into meta (key,value) values (?,?)');
  const rows = Array.isArray(d.meta_table) ? d.meta_table : Object.entries(d.meta_table).map(([key, value]) => ({ key, value }));
  for (const r of rows) im.run(r.key, r.value_hex !== undefined ? r.value_hex : r.value);
  db.close();
  return { file: out, dir: path.dirname(out) };
}

function cursoride(file) {
  const { DatabaseSync } = require('node:sqlite');
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = tmp('state.vscdb');
  const db = new DatabaseSync(out);
  db.exec('create table cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB); create table composerHeaders (composerId TEXT PRIMARY KEY, workspaceId TEXT, createdAt INTEGER, lastUpdatedAt INTEGER, isArchived INTEGER, isSubagent INTEGER, recency INTEGER, checkpointAt INTEGER, value TEXT);');
  const ins = db.prepare('insert into cursorDiskKV (key,value) values (?,?)');
  let composerId = null;
  for (const [k, v] of Object.entries(d.cursorDiskKV)) {
    if (k.startsWith('composerData:')) composerId = k.slice('composerData:'.length);
    ins.run(k, v === null ? null : (typeof v === 'string' ? v : JSON.stringify(v)));
  }
  const h = d.composerHeaders_row;
  db.prepare('insert into composerHeaders (composerId,workspaceId,createdAt,lastUpdatedAt,isArchived,isSubagent,recency,checkpointAt,value) values (?,?,?,?,?,?,?,?,?)')
    .run(h.composerId, h.workspaceId ?? null, h.createdAt ?? null, h.lastUpdatedAt ?? null, Number(h.isArchived ?? 0), Number(h.isSubagent ?? 0), h.recency ?? null, h.checkpointAt ?? null, typeof h.value === 'string' ? h.value : JSON.stringify(h.value ?? null));
  db.close();
  return { file: out, dir: path.dirname(out), sessionId: composerId || h.composerId };
}

module.exports = { copilotide, cursor, cursoride };
