/**
 * Whether a machine's identity is already on record, read the way ssh reads
 * the record files of the visible test: the two its command line names and
 * ssh's global ones (Phase 340's fix round, from the verifiers' finding against
 * D9 and §Attack R8; the global files from the ruled round).
 *
 * ## Why the check needs to know
 *
 * The check draws Tortie's own first-seen question, "Tortie has not met this
 * machine before" with a fingerprint and Trust it, when the buffer ends on ssh's
 * own words. D9 raised it only before the check's first marker, because ssh
 * always asks before the far side prints anything. That holds only when ssh
 * DOES ask. On a machine already on record ssh asks nothing, so the far side's
 * login files are the first bytes, and the verifiers measured one printing
 * ssh's words with a fingerprint of its own choosing: Tortie drew its question
 * over that fingerprint and Trust it sent `yes` to the login file.
 *
 * ssh can be asking first-seen only about a name no record file holds. So
 * the test asks this module once, before it starts, and a machine on record
 * never gets Tortie's own question: whatever such a machine prints that ends
 * in a question is quoted as the program's own line by the quiet rule, the way
 * every other unrecognised prompt is.
 *
 * ## What it reads, and the direction it errs in
 *
 * The two files the test names, Tortie's own and the person's, by the paths the
 * caller hands it, which are the paths the command line carries. Then ssh's own
 * global record, {@link SSH_GLOBAL_HOST_RECORD_FILES} (the ruled round, from
 * the reverify): the test's command line names only the person's record, so ssh
 * also reads the system's two files, as `ssh -G` names them, and a machine on
 * record there is one ssh asks nothing about. It writes nothing. It reads each
 * line the way ssh's own matcher for those files does: an optional
 * `@cert-authority` or `@revoked` marker, then a comma list of patterns with
 * `*`, `?` and `!`, or one hashed name (`|1|salt|hash`, an HMAC-SHA1 of the
 * name). The name is the host as typed, lowercased, or `[host]:port` off port
 * 22, which is what ssh looks up.
 *
 * Every doubt answers "on record", because that is the safe direction: a
 * machine wrongly read as on record loses only Tortie's Trust it button and is
 * asked through the quiet rule instead, as every machine was before this phase,
 * while a machine wrongly read as new is the spoof. So a `@cert-authority` line
 * that matches counts as on record, and a file too large to read here counts
 * as on record. A `@revoked` line does not, because a revoked key makes nothing
 * known. A file that is missing or cannot be read counts as holding nothing,
 * because ssh cannot read it either and asks.
 *
 * ## Why the global files are read rather than pinned away (the ruled round)
 *
 * The other way to make this module and ssh agree was to pin
 * `GlobalKnownHostsFile` to Tortie's own files on the test's command line. It
 * was not taken, because then the check's ssh would no longer be the ssh every
 * session runs: a machine the system record holds would be asked about as if
 * new, a key that record REVOKES would be offered as Trust it, and a machine
 * whose key changed against that record would lose ssh's changed-key alarm and
 * meet Tortie's first-seen question over the new key instead, which is the
 * spoof this module exists to stop, made worse. Reading the files leaves ssh
 * exactly as it is and errs only in the safe direction.
 *
 * ## What it cannot see, stated
 *
 * ssh also reads the person's own connection settings, and a `HostName`,
 * `Port` or `HostKeyAlias` there changes the name ssh looks up, and a
 * `GlobalKnownHostsFile` there, or in the system's own settings file, changes
 * which global files it reads. This module reads neither settings file (Tortie
 * never reads them), so on a machine whose name or record the settings
 * rewrite, what is looked up here can differ from what ssh looks up, and such
 * a machine keeps the class D9 had: a login file there can still draw Tortie's
 * first-seen question, Trust it sends `yes` to that file, and nothing is
 * recorded.
 */

import { createHmac } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import type { MachineHostKeyFiles } from './carriage';

/** A record file larger than this is not read here, and counts as on record. */
export const HOST_RECORD_READ_MAX_BYTES = 8 * 1024 * 1024;

/**
 * ssh's own global record files, OpenSSH's compiled default. Measured on this
 * Mac (OpenSSH_9.9p2) with `ssh -G -F none tortie-check.invalid`, which reads
 * no settings file and contacts nothing: `globalknownhostsfile
 * /etc/ssh/ssh_known_hosts /etc/ssh/ssh_known_hosts2`. Neither settings file
 * on this Mac names another. `p340-host-record.test.ts` asks the same question
 * of the ssh on the machine that runs it, so a change of default is a red test
 * rather than a silent disagreement.
 */
export const SSH_GLOBAL_HOST_RECORD_FILES: readonly string[] = [
  '/etc/ssh/ssh_known_hosts',
  '/etc/ssh/ssh_known_hosts2'
];

/** The name ssh looks a machine up by: the host, or `[host]:port` off port 22. */
export function hostRecordName(host: string, port: number | null): string {
  const name = host.toLowerCase();
  return port === null || port === 22 ? name : `[${name}]:${String(port)}`;
}

/** ssh's own pattern rule: `*` any run, `?` one character, nothing else special. */
function patternMatches(pattern: string, name: string): boolean {
  const source = pattern
    .toLowerCase()
    .split('')
    .map((ch) => (ch === '*' ? '.*' : ch === '?' ? '.' : ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${source}$`).test(name);
}

/** One hashed name, `|1|<salt>|<hash>`, against the name. */
function hashedMatches(field: string, name: string): boolean {
  const parts = field.split('|');
  // ['', '1', salt, hash]
  if (parts.length !== 4 || parts[1] !== '1') return false;
  const salt = Buffer.from(parts[2] ?? '', 'base64');
  const want = parts[3] ?? '';
  if (salt.length === 0 || want.length === 0) return false;
  const got = createHmac('sha1', salt).update(name).digest('base64');
  return got === want;
}

/** Whether one hosts field names the name, by ssh's rule for a pattern list. */
function hostsFieldMatches(field: string, name: string): boolean {
  if (field.startsWith('|')) return hashedMatches(field, name);
  let positive = false;
  for (const raw of field.split(',')) {
    if (raw.length === 0) continue;
    const negated = raw.startsWith('!');
    const pattern = negated ? raw.slice(1) : raw;
    if (!patternMatches(pattern, name)) continue;
    // A negated match takes the whole line away, whatever else it names.
    if (negated) return false;
    positive = true;
  }
  return positive;
}

/**
 * Whether one record file's text holds a line for the name. Pure.
 *
 * `name` is {@link hostRecordName}'s answer.
 */
export function hostRecordedIn(text: string, name: string): boolean {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    let at = 0;
    const marker = fields[0]?.startsWith('@') === true ? fields[0] : null;
    if (marker !== null) at = 1;
    // A revoked key makes nothing known; ssh asks about any other key.
    if (marker === '@revoked') continue;
    const hosts = fields[at];
    if (hosts === undefined || hosts.length === 0) continue;
    if (hostsFieldMatches(hosts, name)) return true;
  }
  return false;
}

/**
 * Every record file ssh reads for the test, in the order it reads them: the two
 * the command line names, then ssh's global ones. Pure.
 *
 * `globals` is {@link SSH_GLOBAL_HOST_RECORD_FILES} in Tortie. A test, or a
 * drive that cannot write `/etc` and names a scratch global record through
 * ssh's own `GlobalKnownHostsFile` option instead, hands the same files here.
 */
export function hostRecordFiles(
  files: MachineHostKeyFiles,
  globals: readonly string[] = SSH_GLOBAL_HOST_RECORD_FILES
): string[] {
  return [files.tortie, files.user, ...globals];
}

/**
 * Whether any record file ssh reads for the test already holds this machine:
 * the two the test names, and ssh's global ones (the ruled round).
 *
 * Reads the files once, at the start of a test. A missing or unreadable file
 * holds nothing; a file too large to read here counts as holding it.
 */
export function hostKeyRecorded(
  files: MachineHostKeyFiles,
  host: string,
  port: number | null,
  globals: readonly string[] = SSH_GLOBAL_HOST_RECORD_FILES
): boolean {
  const name = hostRecordName(host, port);
  for (const path of hostRecordFiles(files, globals)) {
    let text: string;
    try {
      const st = statSync(path);
      if (!st.isFile()) continue;
      if (st.size > HOST_RECORD_READ_MAX_BYTES) return true;
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    if (hostRecordedIn(text, name)) return true;
  }
  return false;
}
