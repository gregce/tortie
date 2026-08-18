/**
 * Putting a key on a machine, checked where it is pure.
 *
 * Everything below is composition, hashing and parsing. Nothing here starts a
 * process, opens a connection or writes a file. The live half is proven by
 * `build/probe-key-install.mjs`, which drives the real client against a scratch
 * sign in server on 127.0.0.1 and reads the real bytes back.
 *
 * The four properties this file exists to hold.
 *
 *  1. The public key reaches the other machine as ONE argv element, quoted by
 *     one call, and a string that is not a public key produces no argv at all.
 *  2. The script appends and never truncates, and it is safe to run twice.
 *  3. The install hash covers what the person read and nothing else, and it can
 *     never be that machine's execution hash.
 *  4. The password is replaced everywhere before any text leaves main.
 */

import { describe, expect, it } from 'vitest';
import { shellQuoteArgv } from '../../restore/command';
import { machineExecutionHash } from '../confirm';
import { machineOutcomeCopy } from '../errors';
import { isPublicKeyLine } from '../key-material';
import {
  AUTHORIZED_KEYS_SCRIPT,
  AUTHORIZED_KEYS_SCRIPT_NAME,
  HOST_KEY_UNKNOWN_PHRASE,
  KEY_INSTALL_AUTHENTICATIONS,
  MACHINE_KEY_HASH_ALGORITHM,
  MACHINE_KEY_NOTES,
  MACHINE_KEY_NOT_WRITTEN,
  MACHINE_KEY_PASSWORD_REDACTED,
  MACHINE_KEY_PASSWORD_REFUSED,
  MACHINE_KEY_UNKNOWN_MACHINE,
  MACHINE_KEY_WARNING,
  PASSWORD_PROMPT_RE,
  PASSWORD_PROMPT_SEEN_RE,
  REMOTE_AUTHORIZED_KEYS_DISPLAY,
  REMOTE_KEY_MARKER,
  SSH_PASSWORD_PROMPTS_MAX,
  canonicalKeyInstallText,
  classifyKeyInstallOutput,
  composeAuthorizedKeysCommand,
  composeKeyInstallArgv,
  composeKeyInstallCommandLine,
  composeKeyInstallCopy,
  describeKeyInstall,
  keyInstallHash,
  keyInstallRequiredOptions,
  parseKeyInstallAnswer,
  redactPassword
} from '../key-install';
import { KNOWN_HOSTS_OPTION, PINNED_SSH_PATH } from '../carriage';

/**
 * The two files a run checks a machine's identity against. Tortie's own path
 * carries a space, because the real one does on every Mac.
 */
const KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: '/Users/x/.ssh/known_hosts'
};

/** One line of the exact shape Tortie makes for itself. */
const KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB1cVQpLqRvXn7z8mKdT4wYuHsE2fGjNaPo9rXsUvWxYz ' +
  'tortie-0123456789ab';

const FULL = {
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux'
};

const BARE = {
  host: '127.0.0.1',
  user: null,
  port: null,
  remoteTmuxPath: null
};

const FACTS = {
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  localKeyPath:
    '/Users/x/Library/Application Support/Tortie/gmux/machines/keys/machine-3f2a91c04d7b'
};

/**
 * Five strings that must never reach a shell on another computer.
 *
 * They are the same five `build/conformance-machines.mjs` condition 32 drives,
 * held here as well so a change to either is caught by the cheap gate and by
 * the unit tests rather than by one of them.
 */
const HOSTILE = [
  `${KEY}\nrm -rf ~`,
  `${KEY}; rm -rf ~`,
  '`id`',
  '$(id)',
  "ssh-ed25519 AAAA' tortie-0123456789ab"
];

describe('the fixture', () => {
  it('is a line the product would install', () => {
    expect(isPublicKeyLine(KEY)).toBe(true);
  });
});

describe('the script the other machine runs', () => {
  it('never truncates, because there is no > in it that is not a >>', () => {
    // The promise not to overwrite an existing file is a property of this text
    // rather than of a guard around it. Every `>` in the script belongs to a
    // `>>`, so there is nothing to disable later.
    const singles = AUTHORIZED_KEYS_SCRIPT.replace(/>>/g, '');
    expect(singles).not.toContain('>');
  });

  it('names no program that could replace the file', () => {
    for (const verb of ['truncate', 'tee', 'dd ']) {
      expect(AUTHORIZED_KEYS_SCRIPT).not.toContain(verb);
    }
  });

  it('creates the file with touch rather than a redirect', () => {
    expect(AUTHORIZED_KEYS_SCRIPT).toContain('touch "$f"');
    expect(AUTHORIZED_KEYS_SCRIPT).not.toContain(': >');
  });

  it('carries no interpolation of any kind', () => {
    expect(AUTHORIZED_KEYS_SCRIPT).not.toContain('`');
    expect(AUTHORIZED_KEYS_SCRIPT).not.toContain('$(');
    expect(AUTHORIZED_KEYS_SCRIPT).not.toContain('${');
  });

  it('names the file it writes, and it is the one on the block', () => {
    expect(AUTHORIZED_KEYS_SCRIPT).toContain('authorized_keys');
    expect(REMOTE_AUTHORIZED_KEYS_DISPLAY).toBe('~/.ssh/authorized_keys');
  });

  it('reads the key as $1 rather than as script text', () => {
    expect(AUTHORIZED_KEYS_SCRIPT).toContain('"$1"');
    expect(AUTHORIZED_KEYS_SCRIPT).not.toContain('ssh-ed25519');
  });

  it('looks for the exact line before it appends one', () => {
    // This is what makes a second install add no second line.
    expect(AUTHORIZED_KEYS_SCRIPT).toContain('grep -qxF -- "$1" "$f"');
  });

  it('sets the mode only on what it creates', () => {
    expect(AUTHORIZED_KEYS_SCRIPT).toContain('if [ ! -d "$d" ]; then mkdir -p "$d"; chmod 700 "$d"; fi');
    expect(AUTHORIZED_KEYS_SCRIPT).toContain('if [ ! -f "$f" ]; then touch "$f"; chmod 600 "$f"; fi');
  });

  it('wraps its answer in the same marker pair the path probe uses', () => {
    expect(AUTHORIZED_KEYS_SCRIPT.split(REMOTE_KEY_MARKER)).toHaveLength(3);
    expect(REMOTE_KEY_MARKER).toBe('__TORTIE_KEY__');
  });
});

describe('the remote command', () => {
  it('is the output of ONE quoting call over an argv array', () => {
    expect(composeAuthorizedKeysCommand(KEY)).toBe(
      shellQuoteArgv([
        '/bin/sh',
        '-c',
        AUTHORIZED_KEYS_SCRIPT,
        AUTHORIZED_KEYS_SCRIPT_NAME,
        KEY
      ])
    );
  });

  it('puts the key last, and nowhere else', () => {
    const command = composeAuthorizedKeysCommand(KEY);
    expect(command.endsWith(shellQuoteArgv([KEY]))).toBe(true);
    expect(command.split(KEY)).toHaveLength(2);
  });

  it('runs the script under a name that says who it belongs to', () => {
    expect(AUTHORIZED_KEYS_SCRIPT_NAME).toBe('tortie-install-key');
  });

  it('refuses every hostile string, before an argv exists', () => {
    for (const line of HOSTILE) {
      expect(isPublicKeyLine(line)).toBe(false);
      expect(() => composeAuthorizedKeysCommand(line)).toThrow(
        /not one public key line/
      );
      expect(() => composeKeyInstallArgv(FULL, KEYS, line)).toThrow(
        /not one public key line/
      );
    }
  });
});

describe('the argv', () => {
  const argv = (): string[] => composeKeyInstallArgv(FULL, KEYS, KEY);

  it('carries every option that decides what this call can do', () => {
    for (const option of keyInstallRequiredOptions()) {
      expect(argv()).toContain(option);
    }
    expect(keyInstallRequiredOptions()).toEqual([
      'BatchMode=no',
      'StrictHostKeyChecking=yes',
      'NumberOfPasswordPrompts=1',
      'PubkeyAuthentication=no',
      'IdentitiesOnly=yes'
    ]);
  });

  it('carries BatchMode=no exactly once', () => {
    expect(argv().filter((a) => a === 'BatchMode=no')).toHaveLength(1);
  });

  it('answers the host key question with no rather than asking it', () => {
    // This call never makes first contact. First contact belongs to the one
    // visible test, where a person is watching and can read the question.
    expect(argv()).toContain('StrictHostKeyChecking=yes');
    expect(argv()).not.toContain('StrictHostKeyChecking=ask');
  });

  it('lets the client ask for a password once', () => {
    expect(SSH_PASSWORD_PROMPTS_MAX).toBe(1);
    expect(argv()).toContain('NumberOfPasswordPrompts=1');
  });

  it('offers a password and nothing else', () => {
    expect(argv()).toContain(KEY_INSTALL_AUTHENTICATIONS);
    expect(KEY_INSTALL_AUTHENTICATIONS).toBe(
      'PreferredAuthentications=password,keyboard-interactive'
    );
    expect(argv()).toContain('PubkeyAuthentication=no');
    expect(argv()).toContain('IdentitiesOnly=yes');
  });

  it('bounds how long the connection may take', () => {
    expect(argv()).toContain('ConnectTimeout=10');
  });

  it('names the record files itself, with Tortie’s own first and both quoted', () => {
    const option = argv().find((a) => a.startsWith(`${KNOWN_HOSTS_OPTION}=`)) ?? '';
    expect(option).toBe(`${KNOWN_HOSTS_OPTION}="${KEYS.tortie}" "${KEYS.user}"`);
    expect(
      argv().filter((a) => a.startsWith(`${KNOWN_HOSTS_OPTION}=`))
    ).toHaveLength(1);
  });

  it('passes -p and -l only when they were set', () => {
    expect(argv()).toContain('-p');
    expect(argv()).toContain('2222');
    expect(argv()).toContain('-l');
    expect(argv()).toContain('greg');
    const bare = composeKeyInstallArgv(BARE, KEYS, KEY);
    expect(bare).not.toContain('-p');
    expect(bare).not.toContain('-l');
  });

  it('puts the address after every option and the command last', () => {
    const list = argv();
    const hostAt = list.indexOf(FULL.host);
    expect(hostAt).toBeGreaterThan(list.indexOf('-p'));
    expect(hostAt).toBe(list.length - 2);
    expect(list[list.length - 1]).toBe(composeAuthorizedKeysCommand(KEY));
  });

  it('composes the same bytes the transcript header would show', () => {
    expect(composeKeyInstallCommandLine(PINNED_SSH_PATH, FULL, KEYS, KEY)).toBe(
      shellQuoteArgv([PINNED_SSH_PATH, ...argv()])
    );
  });

  it('is these bytes, and a change to any of them is a change to be read', () => {
    // The golden. It is written out rather than derived, so an edit to any
    // option, to their order or to the quoting shows up here as a diff a person
    // reads instead of as a test that still passes.
    expect(composeKeyInstallCommandLine(PINNED_SSH_PATH, BARE, KEYS, KEY)).toBe(
    "/usr/bin/ssh -o BatchMode=no -o StrictHostKeyChecking=yes -o Num" +
      "berOfPasswordPrompts=1 -o PubkeyAuthentication=no -o IdentitiesO" +
      "nly=yes -o ConnectTimeout=10 -o 'UserKnownHostsFile=\"/Users/x/L" +
      "ibrary/Application Support/Tortie/gmux/machines/known-machines\"" +
      " \"/Users/x/.ssh/known_hosts\"' -o PreferredAuthentications=pass" +
      "word,keyboard-interactive 127.0.0.1 '/bin/sh -c '\\''set -e\numa" +
      "sk 077\nd=\"$HOME/.ssh\"\nf=\"$d/authorized_keys\"\nif [ ! -d \"" +
      "$d\" ]; then mkdir -p \"$d\"; chmod 700 \"$d\"; fi\nif [ ! -f \"" +
      "$f\" ]; then touch \"$f\"; chmod 600 \"$f\"; fi\nif grep -qxF --" +
      " \"$1\" \"$f\"; then s=present; else printf '\\''\\'\\'''\\''%s" +
      "\\n'\\''\\'\\'''\\'' \"$1\" >> \"$f\"; s=added; fi\nprintf '\\''" +
      "\\'\\'''\\''__TORTIE_KEY__%s__TORTIE_KEY__\\n'\\''\\'\\'''\\'' " +
      "\"$s\"'\\'' tortie-install-key '\\''ssh-ed25519 AAAAC3NzaC1lZDI1" +
      "NTE5AAAAIB1cVQpLqRvXn7z8mKdT4wYuHsE2fGjNaPo9rXsUvWxYz tortie-012" +
      "3456789ab'\\'''"
    );
  });
});

describe('the answer the machine sends back', () => {
  const wrap = (word: string): string =>
    `Welcome to Pop OS\n${REMOTE_KEY_MARKER}${word}${REMOTE_KEY_MARKER}\n`;

  it('reads a line that was added', () => {
    expect(parseKeyInstallAnswer(wrap('added'))).toBe('added');
  });

  it('reads a line that was already there', () => {
    expect(parseKeyInstallAnswer(wrap('present'))).toBe('present');
  });

  it('ignores everything printed around the markers', () => {
    const text =
      'Last login: Tue\nadded is not the answer\n' +
      `${REMOTE_KEY_MARKER}present${REMOTE_KEY_MARKER}\nhave a nice day\n`;
    expect(parseKeyInstallAnswer(text)).toBe('present');
  });

  it('refuses a marker pair carrying anything else', () => {
    expect(parseKeyInstallAnswer(wrap('deleted'))).toBeNull();
    expect(parseKeyInstallAnswer(wrap(''))).toBeNull();
  });

  it('refuses output with no markers, and a single marker', () => {
    expect(parseKeyInstallAnswer('added\n')).toBeNull();
    expect(parseKeyInstallAnswer(`${REMOTE_KEY_MARKER}added\n`)).toBeNull();
  });
});

describe('the class one install is read as', () => {
  it('names a clean install, whatever the exit code says', () => {
    const text = `${REMOTE_KEY_MARKER}added${REMOTE_KEY_MARKER}\n`;
    expect(classifyKeyInstallOutput(text, 0)).toBe('key-installed');
    expect(classifyKeyInstallOutput(text, 255)).toBe('key-installed');
  });

  it('names a refused password', () => {
    expect(
      classifyKeyInstallOutput('greg@127.0.0.1: Permission denied (password).\n', 255)
    ).toBe('auth-refused');
  });

  it('names a refused connection', () => {
    expect(
      classifyKeyInstallOutput(
        'ssh: connect to host 127.0.0.1 port 22: Connection refused\n',
        255
      )
    ).toBe('refused');
  });

  it('keeps a changed identity alarming', () => {
    const text =
      'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!\n' +
      'Host key verification failed.\n';
    expect(classifyKeyInstallOutput(text, 255)).toBe('host-key-changed');
    expect(composeKeyInstallCopy({ cls: 'host-key-changed', text, exitCode: 255 }).alarm).toBe(
      true
    );
  });

  it('reads a first contact refusal as one it has its own sentence for', () => {
    const text = `${HOST_KEY_UNKNOWN_PHRASE}.\n`;
    expect(classifyKeyInstallOutput(text, 255)).toBe('unknown');
  });
});

describe('the sentences one install ends on', () => {
  it('says the key is on the machine, and that the test is next', () => {
    const copy = composeKeyInstallCopy({
      cls: 'key-installed',
      text: `${REMOTE_KEY_MARKER}added${REMOTE_KEY_MARKER}\n`,
      exitCode: 0
    });
    expect(copy).toEqual(machineOutcomeCopy('key-installed'));
    expect(copy.headline).toBe('The key is on that machine.');
    expect(copy.detail).toContain('testing the connection now');
    expect(copy.alarm).toBe(false);
  });

  it('says the password was refused, and that nothing was tried twice', () => {
    const copy = composeKeyInstallCopy({
      cls: 'auth-refused',
      text: 'Permission denied, please try again.\n',
      exitCode: 255
    });
    expect(copy.detail).toBe(MACHINE_KEY_PASSWORD_REFUSED);
    expect(copy.detail).toContain('did not try again');
    expect(copy.detail).toContain('kept no copy');
    expect(copy.alarm).toBe(false);
  });

  it('says no password was sent to a machine it has not met', () => {
    const copy = composeKeyInstallCopy({
      cls: 'unknown',
      text: `${HOST_KEY_UNKNOWN_PHRASE}.\n`,
      exitCode: 255
    });
    expect(copy.detail).toBe(MACHINE_KEY_UNKNOWN_MACHINE);
    expect(copy.headline).toBe('Tortie did not send a password.');
  });

  it('says so when the machine let Tortie in and reported nothing', () => {
    const copy = composeKeyInstallCopy({
      cls: 'unknown',
      text: 'some login banner and nothing else\n',
      exitCode: 0
    });
    expect(copy.detail).toBe(MACHINE_KEY_NOT_WRITTEN);
    expect(copy.detail).toContain('Nothing about this Mac changed.');
  });

  it('falls back to the class the table has for anything else', () => {
    const copy = composeKeyInstallCopy({
      cls: 'unreachable',
      text: 'ssh: connect to host box port 22: No route to host\n',
      exitCode: 255
    });
    expect(copy).toEqual(machineOutcomeCopy('unreachable'));
  });

  it('uses no em dash and no en dash in anything a person reads', () => {
    const strings = [
      MACHINE_KEY_WARNING,
      ...MACHINE_KEY_NOTES,
      MACHINE_KEY_PASSWORD_REFUSED,
      MACHINE_KEY_UNKNOWN_MACHINE,
      MACHINE_KEY_NOT_WRITTEN,
      MACHINE_KEY_PASSWORD_REDACTED
    ];
    for (const text of strings) {
      expect(text).not.toContain('—');
      expect(text).not.toContain('–');
    }
  });
});

describe('the password', () => {
  it('recognises the question the client asks', () => {
    expect(PASSWORD_PROMPT_RE.test("greg@127.0.0.1's password: ")).toBe(true);
    expect(PASSWORD_PROMPT_RE.test('Password:')).toBe(true);
    expect(PASSWORD_PROMPT_RE.test('some banner\ngreg@box password: ')).toBe(true);
  });

  it('does not read a sentence about a password as the question', () => {
    expect(PASSWORD_PROMPT_RE.test('Permission denied, please try again.\n')).toBe(
      false
    );
    expect(PASSWORD_PROMPT_RE.test('your password: is wrong')).toBe(false);
  });

  it('has a second matcher for a question that is no longer the last line', () => {
    // PHASE 79.1 FIX ROUND. The anchored matcher above answers "is the client
    // waiting right now", which is what the two live runners ask. A finished
    // transcript asks a different question, and `classifyProbeOutput` asks
    // this one.
    expect(PASSWORD_PROMPT_SEEN_RE.test("greg@127.0.0.1's password: ")).toBe(true);
    expect(PASSWORD_PROMPT_SEEN_RE.test("greg@box's password: \nmore\n")).toBe(
      true
    );
    expect(PASSWORD_PROMPT_SEEN_RE.test("greg@box's password: \r\nmore\n")).toBe(
      true
    );
    expect(PASSWORD_PROMPT_SEEN_RE.test('your password: is wrong\n')).toBe(false);
    expect(PASSWORD_PROMPT_SEEN_RE.test('Permission denied.\n')).toBe(false);
    // The anchored one cannot answer the same question, which is why both exist.
    expect(PASSWORD_PROMPT_RE.test("greg@box's password: \nmore\n")).toBe(false);
  });

  it('replaces every occurrence and leaves everything else byte for byte', () => {
    const text = 'one hunter2 two\nhunter2\nthree';
    expect(redactPassword(text, 'hunter2')).toBe(
      `one ${MACHINE_KEY_PASSWORD_REDACTED} two\n${MACHINE_KEY_PASSWORD_REDACTED}\nthree`
    );
    expect(redactPassword(text, 'hunter2')).not.toContain('hunter2');
  });

  it('leaves text with no password in it exactly as it was', () => {
    const text = 'Permission denied, please try again.\n';
    expect(redactPassword(text, 'hunter2')).toBe(text);
  });

  it('returns the text unchanged for an empty password', () => {
    // Replacing an empty string would rewrite every position in the text.
    expect(redactPassword('abc', '')).toBe('abc');
  });
});

describe('the hash the agreement is bound to', () => {
  it('names its own algorithm, and it is not the machine one', () => {
    expect(canonicalKeyInstallText('pop-os', FACTS).startsWith(
      `${MACHINE_KEY_HASH_ALGORITHM}\n`
    )).toBe(true);
    expect(MACHINE_KEY_HASH_ALGORITHM).toBe('sha256-machine-key-v1');
  });

  it('gives one answer for one machine, twice', () => {
    expect(keyInstallHash('pop-os', FACTS)).toBe(keyInstallHash('pop-os', FACTS));
  });

  it('moves when the machine id moves', () => {
    expect(keyInstallHash('pop-os', FACTS)).not.toBe(
      keyInstallHash('pop-os-2', FACTS)
    );
  });

  it('moves for the address, the account, the port and the key path', () => {
    const base = keyInstallHash('pop-os', FACTS);
    expect(keyInstallHash('pop-os', { ...FACTS, host: '10.0.0.4' })).not.toBe(base);
    expect(keyInstallHash('pop-os', { ...FACTS, user: 'root' })).not.toBe(base);
    expect(keyInstallHash('pop-os', { ...FACTS, user: null })).not.toBe(base);
    expect(keyInstallHash('pop-os', { ...FACTS, port: 22 })).not.toBe(base);
    expect(keyInstallHash('pop-os', { ...FACTS, port: null })).not.toBe(base);
    expect(
      keyInstallHash('pop-os', { ...FACTS, localKeyPath: '/tmp/elsewhere' })
    ).not.toBe(base);
  });

  it('moves for the file it will write on that machine', () => {
    expect(keyInstallHash('pop-os', FACTS, '~/.ssh/other_keys')).not.toBe(
      keyInstallHash('pop-os', FACTS)
    );
  });

  it('can never be that machine’s execution hash', () => {
    // The algorithm name is the first line of both canonical texts, and the two
    // names are different, so one agreement can never be read as the other.
    expect(keyInstallHash('pop-os', FACTS)).not.toBe(
      machineExecutionHash('pop-os', {
        host: FACTS.host,
        user: FACTS.user,
        port: FACTS.port,
        remoteTmuxPath: '/usr/bin/tmux'
      })
    );
  });

  it('covers the file it writes and the file it keeps', () => {
    const text = canonicalKeyInstallText('pop-os', FACTS);
    expect(text).toContain(REMOTE_AUTHORIZED_KEYS_DISPLAY);
    expect(text).toContain(FACTS.localKeyPath);
  });
});

describe('the block a person reads', () => {
  it('shows exactly the hashed facts, in order', () => {
    const block = describeKeyInstall('pop-os', FACTS);
    expect(block.lines).toEqual([
      'Machine: pop-os.tail1a2b.ts.net',
      'Signs in as: greg',
      'Port: 2222',
      'Writes this file on that machine: ~/.ssh/authorized_keys',
      'Keeps the private half of the key on this Mac, at: ' +
        '/Users/x/Library/Application Support/Tortie/gmux/machines/keys/machine-3f2a91c04d7b'
    ]);
    expect(block.hash).toBe(keyInstallHash('pop-os', FACTS));
  });

  it('leaves out an account name and a port nobody chose', () => {
    const block = describeKeyInstall('pop-os', {
      host: '127.0.0.1',
      user: null,
      port: null,
      localKeyPath: '/tmp/k'
    });
    expect(block.lines).toEqual([
      'Machine: 127.0.0.1',
      'Writes this file on that machine: ~/.ssh/authorized_keys',
      'Keeps the private half of the key on this Mac, at: /tmp/k'
    ]);
  });

  it('carries what Tortie is about to do, and the five things it says next', () => {
    const block = describeKeyInstall('pop-os', FACTS);
    expect(block.warning).toBe(MACHINE_KEY_WARNING);
    expect(block.warning).toContain('private half stays on this Mac');
    expect(block.notes).toHaveLength(5);
    expect(block.notes[0]).toContain('Remote Login');
    expect(block.notes[1]).toContain('no passphrase');
    expect(block.notes[2]).toContain('keeps no copy');
    expect(block.notes[3]).toContain('adds one line');
    expect(block.notes[4]).toContain('tests the connection again');
  });

  it('says nothing on the block that the hash does not cover', () => {
    // The warning and the notes are shown beside the lines and are deliberately
    // not in them, because the lines are what the person agreed to.
    const block = describeKeyInstall('pop-os', FACTS);
    const text = canonicalKeyInstallText('pop-os', FACTS);
    for (const line of block.lines) {
      const value = line.slice(line.indexOf(': ') + 2);
      expect(text).toContain(value);
    }
  });
});
