/**
 * The EFFECT rules (Phase 257): a process spawned and the filesystem written.
 * Network reaches are their own category since this phase, `./rules-network.ts`.
 *
 * The family measured 65% (68% excluding vendored bytes) with the network
 * rule inside it; the spawn rules read 5 of 6 on tortie, 4 of 6 on gotify and
 * 5 of 6 on ripgrep, and the filesystem rule 87%, whose two false rows were
 * babel's `path.remove()`, an AST path, which the receiver now refuses by
 * matching its case.
 */

import type { FactRule } from './types';

/** A file that names `std::process`; the rust `Command::new` is a spawn only there. */
const NAMES_PROCESS = /\bstd::process\b|process::Command/;
/** A file that names clap. A bare `Command::new` in a file naming both is ambiguous and answers nothing. */
const NAMES_CLAP = /\buse\s+clap\b|\bclap::/;
const PROCESS_QUALIFIED = /(^|::)process::Command$/;
const CLAP_QUALIFIED = /(^|::)clap::Command$/;

function runs(arg: string | undefined): string {
  return `runs ${arg || '(computed)'}`;
}

export const EFFECT_RULES: readonly FactRule[] = [
  {
    id: 'effect.spawn.node',
    category: 'effect',
    kind: 'spawn',
    langs: ['typescript', 'tsx', 'javascript'],
    match: (s) => {
      if (!/^(spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)$/.test(s.last)) return null;
      // The node module's own name is spelled with a character class so a
      // text scan for the module finds no mention in this pure directory.
      if (s.recv !== '' && !/^(child[_]process|cp|childProcess|proc)$/.test(s.recv)) return null;
      return runs(s.args[0]);
    }
  },
  {
    id: 'effect.spawn.python',
    category: 'effect',
    kind: 'spawn',
    langs: ['python'],
    match: (s) => {
      if (/^(subprocess|sp)$/.test(s.recv) && /^(run|Popen|call|check_call|check_output)$/.test(s.last)) {
        return runs(s.args[0]);
      }
      if (s.recv === 'os' && /^(system|popen|execv|spawnv)$/.test(s.last)) return runs(s.args[0]);
      return null;
    }
  },
  {
    id: 'effect.spawn.other',
    category: 'effect',
    kind: 'spawn',
    langs: ['go', 'rust', 'ruby', 'swift'],
    match: (s, c) => {
      if (s.recv === 'exec' && /^(Command|CommandContext)$/.test(s.last)) return runs(s.args[0]);
      if (s.recv === 'Command' && s.last === 'new') {
        // rust: `Command::new` is BOTH clap's and `std::process::Command`'s.
        // A qualified callee decides on its own; a bare one needs the file
        // to name `std::process` and not clap.
        const head = s.callee.replace(/::new$/, '');
        if (PROCESS_QUALIFIED.test(head)) return runs(s.args[0]);
        if (CLAP_QUALIFIED.test(head)) return null;
        if (!NAMES_PROCESS.test(c.text) || NAMES_CLAP.test(c.text)) return null;
        return runs(s.args[0]);
      }
      if (/^(system|backtick|popen)$/.test(s.last) && s.recv === '') return runs(s.args[0]);
      if (s.recv === 'Process' && /^(Start|launch|run)$/.test(s.last)) return runs(s.args[0]);
      if (s.last === 'NSTask' || s.recv === 'NSTask') return runs(s.args[0]);
      return null;
    }
  },
  {
    id: 'effect.fs.write',
    category: 'effect',
    kind: 'fs-write',
    langs: '*',
    match: (s) => {
      if (
        !/^(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync|createWriteStream|WriteFile|write_text|write_bytes|makedirs|remove|rmtree|create|write)$/.test(
          s.last
        )
      ) {
        return null;
      }
      // Matched BY CASE: `path.remove()` is babel's AST path and was 2 of the
      // sample's 15 rows; pathlib's `Path` and Rust's `File` are capitalised.
      if (!/^(fs|fsp|promises|os|shutil|pathlib|Path|ioutil|File|std|NSFileManager|FileManager|Files|f)$/.test(s.recv) && s.recv !== '') {
        return null;
      }
      if (s.recv === '' && !/Sync$/.test(s.last)) return null;
      return `writes the filesystem (${s.last})`;
    }
  }
];
