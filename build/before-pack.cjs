/**
 * before-pack.cjs — make sure the bundled binaries exist before electron-
 * builder copies `extraResources`.
 *
 * Phase 15. `electron-builder.yml` has an `extraResources` entry pointing at
 * `build/vendor/specstory/bin`, and that directory is gitignored (41 MB Mach-O
 * — see build/fetch-specstory.cjs). Without this hook a fresh clone would
 * package an app with no specstory in it and only find out at runtime, which
 * is exactly the class of packaging bug docs/research/19-search.md §7.2 warns
 * about: `out/` passes, the .app is broken.
 *
 * So the vendoring is part of packaging, not a step someone must remember.
 * It is idempotent and network-free once the pinned hash is already on disk.
 *
 * macOS only, because the bundle is arm64-mac only.
 *
 * Phase 22 adds a second tree on the same terms: the pinned `skills` CLI, which
 * `electron-builder.yml` copies from `build/vendor/skills` and which
 * `build/fetch-skills.cjs` materialises from `build/skills-release.json`. Same
 * reasoning, same gitignored directory, same "the .app is the only place a
 * mistake shows up".
 */

const { ensureSpecstoryBinary } = require('./fetch-specstory.cjs');
const { ensureSkillsCli } = require('./fetch-skills.cjs');

exports.default = async function beforePack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const log = (line) => console.log(line.replace(/^ {2}• /, '  • before-pack: '));
  await ensureSpecstoryBinary({ log });
  await ensureSkillsCli({ log });
};
