/**
 * Version parsing, the compat band and the spawn environment.
 *
 * These are the parts of resolution that decide whether a copy of the CLI is
 * allowed to write to the user's agent directories, so they are tested without
 * a filesystem or a subprocess anywhere near them.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundledSkillsEntry,
  bundledSkillsMeta,
  parseSkillsVersionOutput,
  skillsEnv,
  withinCompatBand,
  type SkillsCompatBand
} from '../resolve';

const BAND: SkillsCompatBand = { min: '1.5.22', belowMajor: 2 };

describe('the version probe is strict, because a changed output shape is a failure', () => {
  it('reads the bare version the CLI prints', () => {
    expect(parseSkillsVersionOutput('1.5.22\n')).toBe('1.5.22');
    expect(parseSkillsVersionOutput('  1.5.22  ')).toBe('1.5.22');
    expect(parseSkillsVersionOutput('v1.5.22')).toBe('1.5.22');
    expect(parseSkillsVersionOutput('1.6.0-snapshot.2')).toBe('1.6.0-snapshot.2');
  });

  it('returns null for anything that is not a version on its own line', () => {
    for (const output of ['', 'skills', 'Unknown command: --version', '1.5', 'v1']) {
      expect(parseSkillsVersionOutput(output)).toBeNull();
    }
  });
});

describe('the compat band decides which copies may write', () => {
  it('accepts the pinned version and anything above it below the next major', () => {
    expect(withinCompatBand('1.5.22', BAND)).toBe(true);
    expect(withinCompatBand('1.5.23', BAND)).toBe(true);
    expect(withinCompatBand('1.9.0', BAND)).toBe(true);
  });

  it('refuses anything below the pin', () => {
    expect(withinCompatBand('1.5.21', BAND)).toBe(false);
    expect(withinCompatBand('1.4.0', BAND)).toBe(false);
    expect(withinCompatBand('0.9.0', BAND)).toBe(false);
  });

  it('refuses the next major, whose output Tortie has never parsed', () => {
    expect(withinCompatBand('2.0.0', BAND)).toBe(false);
    expect(withinCompatBand('3.1.4', BAND)).toBe(false);
  });

  it('refuses a string that is not a version at all', () => {
    expect(withinCompatBand('latest', BAND)).toBe(false);
  });
});

describe('the bundled sidecar', () => {
  it('names the version the pin names, and the same lock versions', () => {
    const meta = bundledSkillsMeta();
    // Absent only when nobody has run `npm run vendor:skills` in this tree.
    if (meta === null) {
      expect(bundledSkillsEntry()).toMatch(/build\/vendor\/skills\//);
      return;
    }
    const pin = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', '..', 'build', 'skills-release.json'), 'utf8')
    ) as {
      version: string;
      compatBand: SkillsCompatBand;
      lockVersions: { global: number; project: number };
    };
    expect(meta.version).toBe(pin.version);
    expect(meta.compatBand).toEqual(pin.compatBand);
    expect(meta.lockVersions).toEqual(pin.lockVersions);
  });

  it('points at a directory literally named node_modules', () => {
    // dist/cli.mjs imports `yaml` and `tar` by bare name, and Node walks up
    // looking for that exact directory name. Renaming it fails at run time and
    // passes every check at pack time, so the expectation is written down here.
    expect(bundledSkillsEntry()).toContain('/node_modules/skills/bin/cli.mjs');
  });

  it('looks for the entry point the pin names, and not some other path', () => {
    const pin = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', '..', 'build', 'skills-release.json'), 'utf8')
    ) as { entry: string };
    // The build vendors `entry` and the resolver looks for it. Two files, one
    // path, and this is what stops them drifting apart on a version bump.
    expect(bundledSkillsEntry().endsWith(`/${pin.entry}`)).toBe(true);
  });
});

describe('the spawn environment', () => {
  it('adds DO_NOT_TRACK only when the usage-data switch is off', async () => {
    const base = { HOME: '/home/u' };
    expect((await skillsEnv({ base }))['DO_NOT_TRACK']).toBeUndefined();
    expect((await skillsEnv({ base, sendUsageData: true }))['DO_NOT_TRACK']).toBeUndefined();
    expect((await skillsEnv({ base, sendUsageData: false }))['DO_NOT_TRACK']).toBe('1');
  });

  it('passes the relocating variables through untouched', async () => {
    const base = {
      HOME: '/home/u',
      CLAUDE_CONFIG_DIR: '/elsewhere/claude',
      XDG_STATE_HOME: '/elsewhere/state',
      GH_TOKEN: 'secret',
      CODEX_HOME: '/elsewhere/codex'
    };
    const env = await skillsEnv({ base });
    expect(env['CLAUDE_CONFIG_DIR']).toBe('/elsewhere/claude');
    expect(env['XDG_STATE_HOME']).toBe('/elsewhere/state');
    expect(env['CODEX_HOME']).toBe('/elsewhere/codex');
    expect(env['GH_TOKEN']).toBe('secret');
    expect(env['HOME']).toBe('/home/u');
  });

  it('sets the source overrides only when the user configured one', async () => {
    const base = { HOME: '/home/u' };
    const plain = await skillsEnv({ base });
    expect(plain['SKILLS_API_URL']).toBeUndefined();
    expect(plain['SKILLS_DOWNLOAD_URL']).toBeUndefined();
    const custom = await skillsEnv({
      base,
      apiUrl: 'https://skills.internal',
      downloadUrl: 'https://dl.internal'
    });
    expect(custom['SKILLS_API_URL']).toBe('https://skills.internal');
    expect(custom['SKILLS_DOWNLOAD_URL']).toBe('https://dl.internal');
  });

  it('always sets a PATH, because a GUI launch inherits launchd’s minimal one', async () => {
    const env = await skillsEnv({ base: { HOME: '/home/u' } });
    expect(typeof env['PATH']).toBe('string');
    expect((env['PATH'] as string).length).toBeGreaterThan(0);
  });
});
