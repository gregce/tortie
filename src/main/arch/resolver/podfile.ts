/**
 * What the repository's CocoaPods and Carthage files literally declare, for
 * the Objective-C arm (Phase 180).
 *
 * A `Podfile` is Ruby source and a `Cartfile` is close to one; neither is run,
 * ever. The reader takes only the literal `pod 'Name'` and
 * `github "owner/Name"` shapes, because those are the lines a person wrote and
 * the only ones knowable without executing anything. A pod added by code is
 * not seen, and an import only it could explain answers `unresolved`, which is
 * grey and safe. Nothing here spawns anything and no value reaches an argv.
 */

import { readTextOrNull } from './paths';
import { walkForFiles } from './tree-walk';

/** What the dependency files said, reduced to the names the arm compares. */
export interface ObjcManifest {
  /** Declared pod and Carthage dependency names, subspecs cut at the slash. */
  pods: Set<string>;
  /** True when a Podfile or Cartfile was found at all. */
  present: boolean;
}

export function emptyObjcManifest(): ObjcManifest {
  return { pods: new Set(), present: false };
}

/** `pod 'Name'` or `pod "Name/Subspec"`, the literal form only. */
const POD_LINE = /^\s*pod\s+['"]([A-Za-z0-9_+\-]+)(?:\/[A-Za-z0-9_+\-/]+)?['"]/;

/** `github "owner/Name"` or `git "...Name.git"` in a Cartfile. */
const CARTHAGE_LINE = /^\s*(?:github|git|binary)\s+"[^"]*?([A-Za-z0-9_+\-]+?)(?:\.git|\.json)?"/;

/** Read the declared pod names out of one repository. */
export function readObjcManifest(repoPath: string): ObjcManifest {
  const out = emptyObjcManifest();
  const files = walkForFiles(
    repoPath,
    (name) => name === 'Podfile' || name === 'Cartfile'
  );
  for (const relPath of files) {
    const text = readTextOrNull(`${repoPath}/${relPath}`);
    if (text === null) continue;
    out.present = true;
    for (const line of text.split('\n')) {
      const pod = POD_LINE.exec(line);
      if (pod !== null) out.pods.add(pod[1] ?? '');
      const cart = CARTHAGE_LINE.exec(line);
      if (cart !== null) {
        const tail = (cart[1] ?? '').split('/').pop() ?? '';
        if (tail.length > 0) out.pods.add(tail);
      }
    }
  }
  return out;
}
