/**
 * Phase 340's fix round: whether a machine is already on record, read the way
 * ssh reads the two record files the visible test names
 * (`../host-record.ts`). Tortie's own first-seen question is raised only for a
 * machine on neither, because only then can ssh be asking; on a machine on
 * record a login file printing ssh's words drew Tortie's question over a
 * fingerprint of its own choosing (the verifiers' finding).
 *
 * The hashed lines below were made by the real `ssh-keygen -H` (OpenSSH 9.9p2)
 * over a scratch file, and `ssh-keygen -F` found `[127.0.0.1]:2222` and
 * `studio.tail-net.ts.net` in it and did not find `127.0.0.1`, so the hashing
 * is checked against the program's own and not against a copy of the rule.
 * Every file this test writes is under one temporary folder it removes.
 *
 * THE RULED ROUND adds ssh's global record. The tests of the two named files
 * hand an empty global list, so nothing in `/etc` on the machine running them
 * can change their answer; the global files are driven through scratch copies
 * handed in the same way, and the default list is asked of this machine's own
 * ssh with `ssh -G -F none`, which reads no settings file and contacts nothing.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  HOST_RECORD_READ_MAX_BYTES,
  SSH_GLOBAL_HOST_RECORD_FILES,
  hostKeyRecorded,
  hostRecordFiles,
  hostRecordName,
  hostRecordedIn
} from '../host-record';

const KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';

/** `ssh-keygen -H` over `[127.0.0.1]:2222` and `studio.tail-net.ts.net`, in that order. */
const HASHED_LOOP = `|1|lbrgVvtUcarwTHsyJ351OvYO4Dk=|MPtYcqGzZQ+INNBHEXVgdmGlqqI= ${KEY}`;
const HASHED_STUDIO = `|1|KXachty1wjrSY3rYBZzpOvLXBak=|pf+wUQGd7iD7qh0ie0beobc9RIs= ${KEY}`;

describe('the name ssh looks a machine up by', () => {
  it('is the host on port 22 or none, and [host]:port otherwise, lowercased', () => {
    expect(hostRecordName('studio.tail-net.ts.net', null)).toBe('studio.tail-net.ts.net');
    expect(hostRecordName('Studio', 22)).toBe('studio');
    expect(hostRecordName('127.0.0.1', 2222)).toBe('[127.0.0.1]:2222');
  });
});

describe('one record file’s text', () => {
  it('finds a plain name, a comma list and a [host]:port line', () => {
    expect(hostRecordedIn(`studio ${KEY}\n`, 'studio')).toBe(true);
    expect(hostRecordedIn(`macpro,studio,10.0.0.5 ${KEY}\n`, 'studio')).toBe(true);
    expect(hostRecordedIn(`[127.0.0.1]:2222 ${KEY}\n`, '[127.0.0.1]:2222')).toBe(true);
    // The same address on another port is another name.
    expect(hostRecordedIn(`[127.0.0.1]:2222 ${KEY}\n`, '127.0.0.1')).toBe(false);
    expect(hostRecordedIn(`127.0.0.1 ${KEY}\n`, '[127.0.0.1]:2222')).toBe(false);
  });

  it('matches the hashed lines the real ssh-keygen wrote, and only for their own names', () => {
    expect(hostRecordedIn(HASHED_LOOP, '[127.0.0.1]:2222')).toBe(true);
    expect(hostRecordedIn(HASHED_LOOP, '127.0.0.1')).toBe(false);
    expect(hostRecordedIn(HASHED_STUDIO, 'studio.tail-net.ts.net')).toBe(true);
    expect(hostRecordedIn(HASHED_STUDIO, 'macpro.tail-net.ts.net')).toBe(false);
  });

  it('reads `*` and `?` as ssh does, and a negated match takes the line away', () => {
    expect(hostRecordedIn(`*.tail-net.ts.net ${KEY}`, 'studio.tail-net.ts.net')).toBe(true);
    expect(hostRecordedIn(`studi? ${KEY}`, 'studio')).toBe(true);
    expect(hostRecordedIn(`*.tail-net.ts.net,!studio.tail-net.ts.net ${KEY}`, 'studio.tail-net.ts.net')).toBe(false);
    // `.` and `[` are plain characters, never a pattern of their own.
    expect(hostRecordedIn(`studio.tail ${KEY}`, 'studioxtail')).toBe(false);
  });

  it('counts a matching certificate authority as on record and a revoked key as nothing', () => {
    expect(hostRecordedIn(`@cert-authority *.tail-net.ts.net ${KEY}`, 'studio.tail-net.ts.net')).toBe(true);
    expect(hostRecordedIn(`@revoked studio ${KEY}`, 'studio')).toBe(false);
  });

  it('skips comments and blank lines', () => {
    expect(hostRecordedIn(`# studio ${KEY}\n\n   \n`, 'studio')).toBe(false);
  });
});

describe('the two files the test names', () => {
  let root = '';
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'tortie-p340-hostrec-'));
  });
  afterAll(() => {
    if (root.length > 0) rmSync(root, { recursive: true, force: true });
  });

  it('reads Tortie’s own file and the person’s, either one being enough', () => {
    const tortie = join(root, 'tortie-a');
    const user = join(root, 'user-a');
    writeFileSync(tortie, `${HASHED_LOOP}\n`);
    writeFileSync(user, `studio ${KEY}\n`);
    expect(hostKeyRecorded({ tortie, user }, '127.0.0.1', 2222, [])).toBe(true);
    expect(hostKeyRecorded({ tortie, user }, 'studio', null, [])).toBe(true);
    expect(hostKeyRecorded({ tortie, user }, 'macpro', null, [])).toBe(false);
  });

  it('a missing file holds nothing, because ssh cannot read it either and asks', () => {
    expect(
      hostKeyRecorded({ tortie: join(root, 'absent-1'), user: join(root, 'absent-2') }, 'studio', null, [])
    ).toBe(false);
  });

  it('a file too large to read here counts as on record, the safe direction', () => {
    const big = join(root, 'big');
    writeFileSync(big, Buffer.alloc(HOST_RECORD_READ_MAX_BYTES + 1, 0x20));
    expect(hostKeyRecorded({ tortie: big, user: join(root, 'absent-3') }, 'studio', null, [])).toBe(true);
  });
});

describe('ssh’s global record, read too (the ruled round)', () => {
  let root = '';
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'tortie-p340-hostrec-global-'));
  });
  afterAll(() => {
    if (root.length > 0) rmSync(root, { recursive: true, force: true });
  });

  it('reads the two named files first and then ssh’s own global ones, by default', () => {
    const files = { tortie: '/t/known-machines', user: '/u/known_hosts' };
    expect(SSH_GLOBAL_HOST_RECORD_FILES).toEqual([
      '/etc/ssh/ssh_known_hosts',
      '/etc/ssh/ssh_known_hosts2'
    ]);
    expect(hostRecordFiles(files)).toEqual([
      '/t/known-machines',
      '/u/known_hosts',
      '/etc/ssh/ssh_known_hosts',
      '/etc/ssh/ssh_known_hosts2'
    ]);
    expect(hostRecordFiles(files, ['/g/one'])).toEqual(['/t/known-machines', '/u/known_hosts', '/g/one']);
  });

  it('a machine on record only in a global file is on record; without that file it is not', () => {
    // The reverify's shape: ssh knew the machine from its global record and
    // asked nothing, and a login file printed ssh's words with a fingerprint
    // of its own. The two named files hold nothing for it.
    const named = { tortie: join(root, 'absent-t'), user: join(root, 'absent-u') };
    const one = join(root, 'ssh_known_hosts');
    const two = join(root, 'ssh_known_hosts2');
    writeFileSync(one, `# the system's record\n`);
    writeFileSync(two, `[127.0.0.1]:2222 ${KEY}\n${HASHED_STUDIO}\n`);
    expect(hostKeyRecorded(named, '127.0.0.1', 2222, [one, two])).toBe(true);
    expect(hostKeyRecorded(named, 'studio.tail-net.ts.net', null, [one, two])).toBe(true);
    // Without the global files the same machine is new, which is the old reading.
    expect(hostKeyRecorded(named, '127.0.0.1', 2222, [])).toBe(false);
    // Another port is another machine in the global file too.
    expect(hostKeyRecorded(named, '127.0.0.1', 2223, [one, two])).toBe(false);
  });

  it('a revoked key in the global record makes nothing known; a certificate authority there does', () => {
    const named = { tortie: join(root, 'absent-t2'), user: join(root, 'absent-u2') };
    const revoked = join(root, 'revoked');
    writeFileSync(revoked, `@revoked [127.0.0.1]:2222 ${KEY}\n`);
    expect(hostKeyRecorded(named, '127.0.0.1', 2222, [revoked])).toBe(false);
    const ca = join(root, 'ca');
    writeFileSync(ca, `@cert-authority *.tail-net.ts.net ${KEY}\n`);
    expect(hostKeyRecorded(named, 'studio.tail-net.ts.net', null, [ca])).toBe(true);
  });

  it('a global file too large to read here counts as on record; a missing one holds nothing', () => {
    const named = { tortie: join(root, 'absent-t3'), user: join(root, 'absent-u3') };
    const big = join(root, 'big-global');
    writeFileSync(big, Buffer.alloc(HOST_RECORD_READ_MAX_BYTES + 1, 0x20));
    expect(hostKeyRecorded(named, 'studio', null, [big])).toBe(true);
    expect(hostKeyRecorded(named, 'studio', null, [join(root, 'absent-g')])).toBe(false);
  });

  it('the default list is what this machine’s own ssh names as its global record', () => {
    // `-G` prints the configuration ssh would use and exits; `-F none` reads
    // no settings file; the name is a reserved `.invalid` one. Nothing is
    // contacted. A machine with no ssh at the pinned path has nothing to ask.
    const ssh = '/usr/bin/ssh';
    if (!existsSync(ssh)) return;
    const out = spawnSync(ssh, ['-G', '-F', 'none', 'tortie-check.invalid'], {
      encoding: 'utf8',
      env: { PATH: '/usr/bin:/bin', HOME: root },
      timeout: 10_000
    });
    expect(out.status).toBe(0);
    const line = String(out.stdout)
      .split('\n')
      .find((one) => one.startsWith('globalknownhostsfile '));
    expect(line?.slice('globalknownhostsfile '.length).trim().split(/\s+/)).toEqual([
      ...SSH_GLOBAL_HOST_RECORD_FILES
    ]);
  });
});
