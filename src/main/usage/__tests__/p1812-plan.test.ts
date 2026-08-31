/**
 * The card names the account, and main is where that word is decided
 * (Phase 181.2).
 *
 * TWO PROVIDERS, TWO SOURCES, measured in docs/research/72 section 8: Claude
 * names `subscriptionType` on the login item and names no plan in its usage
 * body at all, and Codex names `plan_type` on the usage body and names no
 * plan in its file. So this file drives both routes end to end and, more
 * importantly, drives what must NEVER come out of either: the Codex body
 * carries an address, a user id and an account id at its top level, and a
 * uuid on `plan_type` would be an identifier arriving through the one field
 * that is now read.
 *
 * Every value here is invented for this file. No token, no address and no
 * real plan from anybody's account is in this tree.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import { parseClaudeUsage, parseCodexUsage } from '../parse';
import { readClaudeCredential, readCodexCredential } from '../credentials';
import type { CredentialDeps } from '../credentials';
import { createUsageService } from '../service';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);

const A_UUID = '11111111-2222-3333-4444-555555555555';

function codexBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'SENTINEL_EMAIL',
    user_id: 'SENTINEL_USER',
    account_id: 'SENTINEL_ACCOUNT',
    plan_type: 'pro',
    rate_limit: {
      primary_window: {
        limit_window_seconds: 604800,
        reset_after_seconds: 10,
        used_percent: 7
      },
      secondary_window: null
    },
    ...over
  };
}

describe('the plan word out of the Codex body', () => {
  it('is the plain word the vendor states', () => {
    expect(parseCodexUsage(codexBody(), NOW).plan).toBe('pro');
  });

  it('is null when the body states none', () => {
    const body = codexBody();
    delete body['plan_type'];
    expect(parseCodexUsage(body, NOW).plan).toBeNull();
  });

  it('is null rather than an identifier, whatever the field holds', () => {
    for (const hostile of [
      A_UUID,
      'SENTINEL_ACCOUNT_11111111_2222_3333_4444',
      'someone@example.com',
      42,
      null,
      { plan: 'pro' }
    ]) {
      expect(parseCodexUsage(codexBody({ plan_type: hostile }), NOW).plan).toBeNull();
    }
  });

  it('survives a body with no rate limit at all', () => {
    const body = codexBody();
    delete body['rate_limit'];
    const out = parseCodexUsage(body, NOW);
    expect(out.plan).toBe('pro');
    expect(out.fiveHour).toBeNull();
    expect(out.sevenDay).toBeNull();
  });
});

describe('the plan word out of the Claude login', () => {
  function deps(payload: unknown): CredentialDeps {
    return {
      keychain: async () => JSON.stringify(payload),
      readText: async () => null,
      env: {},
      home: '/Users/example'
    };
  }

  it('is the plain word the item states', async () => {
    const out = await readClaudeCredential(
      deps({ claudeAiOauth: { accessToken: 'ACCESS', subscriptionType: 'max' } })
    );
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: null,
      plan: 'max'
    });
  });

  it('is null when the item states none, and the login still works', async () => {
    const out = await readClaudeCredential(
      deps({ claudeAiOauth: { accessToken: 'ACCESS' } })
    );
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: null,
      plan: null
    });
  });

  it('never draws the tier, which is not a plan a person recognises', async () => {
    const out = await readClaudeCredential(
      deps({
        claudeAiOauth: {
          accessToken: 'ACCESS',
          rateLimitTier: 'SENTINEL_TIER'
        }
      })
    );
    expect(JSON.stringify(out)).not.toContain('SENTINEL_TIER');
  });

  it('names no plan for Codex, whose file states none', async () => {
    const out = await readCodexCredential({
      keychain: async () => null,
      readText: async () =>
        JSON.stringify({
          auth_mode: 'chatgpt',
          OPENAI_API_KEY: null,
          tokens: { access_token: 'ACCESS', account_id: 'ACCOUNT' }
        }),
      env: {},
      home: '/Users/example'
    });
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: 'ACCOUNT',
      // `auth_mode` is a login method rather than a plan, so nothing is drawn.
      plan: null
    });
  });
});

describe('the Claude usage body names no plan of its own', () => {
  it('so the parse leaves the field null and the login decides', () => {
    expect(
      parseClaudeUsage({ five_hour: { utilization: 2 }, subscriptionType: 'max' })
        .plan
    ).toBeNull();
  });
});

describe('what reaches the snapshot', () => {
  const on: UsageSettings = { claude: true, codex: true, bar: 'five-hour' };

  function service(planWord: unknown) {
    return createUsageService({
      credentials: {
        keychain: async () =>
          JSON.stringify({
            claudeAiOauth: { accessToken: 'ACCESS', subscriptionType: 'max' }
          }),
        readText: async () =>
          JSON.stringify({
            OPENAI_API_KEY: null,
            tokens: { access_token: 'ACCESS', account_id: 'SENTINEL_ACCOUNT' }
          }),
        env: {},
        home: '/Users/example'
      },
      transport: async (req) => ({
        status: 200,
        body:
          req.host === 'api.anthropic.com'
            ? JSON.stringify({ five_hour: { utilization: 32 } })
            : JSON.stringify(codexBody({ plan_type: planWord })),
        retryAfterAt: null
      }),
      settings: () => on,
      now: () => NOW,
      log: () => undefined
    });
  }

  it('carries one plain plan word per provider and nothing else', async () => {
    const snap = await service('pro').read();
    expect(snap.providers.map((p) => p.plan)).toEqual(['max', 'pro']);
  });

  it('carries NO identifier even when the plan field holds one', async () => {
    const snap = await service(A_UUID).read();
    expect(snap.providers.map((p) => p.plan)).toEqual(['max', null]);
    const text = JSON.stringify(snap);
    expect(text).not.toContain(A_UUID);
    expect(text).not.toContain('SENTINEL_EMAIL');
    expect(text).not.toContain('SENTINEL_USER');
    expect(text).not.toContain('SENTINEL_ACCOUNT');
    expect(text).not.toContain('ACCESS');
  });
});

/**
 * THE GUARD THAT ACTUALLY HOLDS, made executable (added when the fix round's
 * own correction was re-verified on 2026-08-31).
 *
 * `usagePlanWord` refuses a long value and an address. It does NOT refuse a
 * short identifier shaped one, and `src/shared/__tests__/` pins that it does
 * not. So the thing that keeps an identifier off the card is not the gate: it
 * is that the gate is only ever handed a vendor's plan field. That was a
 * sentence in a comment, which is exactly the kind of claim two rounds of
 * this phase already got wrong, so it is a check now.
 *
 * IT READS SOURCE TEXT, the same way `src/main/actions/__tests__/
 * p126-boundary.test.ts` does, because the rule a person needs is in the
 * failure message: the file, the line and the expression that was passed.
 * Both directions are asserted. A NEW call site on any other expression fails
 * here, and so does a call site going MISSING, which would mean a vendor's
 * plan field stopped being filtered at all.
 */
describe('what the plan gate is handed', () => {
  /**
   * Every production call site, by file, with the exact argument text. The
   * renderer's is a second pass over a plan that already came through main.
   */
  const ALLOWED: ReadonlyMap<string, string> = new Map([
    ['src/main/usage/credentials.ts', "bag['subscriptionType']"],
    ['src/main/usage/parse.ts', "obj['plan_type']"],
    ['src/renderer/app/usage-copy.ts', 'plan']
  ]);

  /** Where the function is declared. It calls nothing, so it is not a site. */
  const DECLARED_IN = 'src/shared/usage.ts';

  interface Site {
    readonly file: string;
    readonly line: number;
    readonly argument: string;
  }

  /** Every production `.ts` and `.tsx` file under src, tests excluded. */
  function productionSources(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') productionSources(full, out);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        out.push(full);
      }
    }
    return out;
  }

  /** The argument of one call, read by matching parentheses rather than a regex. */
  function argumentAt(text: string, open: number): string {
    let depth = 0;
    for (let i = open; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) return text.slice(open + 1, i).trim();
      }
    }
    return text.slice(open + 1).trim();
  }

  function callSites(): Site[] {
    const root = process.cwd();
    const sites: Site[] = [];
    for (const full of productionSources(join(root, 'src'))) {
      const rel = relative(root, full);
      if (rel === DECLARED_IN) continue;
      const text = readFileSync(full, 'utf8');
      let from = 0;
      for (;;) {
        const at = text.indexOf('usagePlanWord(', from);
        if (at === -1) break;
        from = at + 1;
        sites.push({
          file: rel,
          line: text.slice(0, at).split('\n').length,
          argument: argumentAt(text, at + 'usagePlanWord'.length)
        });
      }
    }
    return sites;
  }

  it('is handed a vendor plan field and nothing else, at every call site', () => {
    for (const site of callSites()) {
      const allowed = ALLOWED.get(site.file);
      expect(
        allowed,
        `${site.file}:${site.line} calls the plan gate and is not a recorded call site. ` +
          'The gate does not refuse a short identifier, so a new field may only be ' +
          "passed to it once somebody has proved that field cannot hold one."
      ).toBeDefined();
      expect(
        site.argument,
        `${site.file}:${site.line} passes \`${site.argument}\` to the plan gate`
      ).toBe(allowed);
    }
  });

  it('still filters both vendor plan fields, so no call site went missing', () => {
    const found = callSites().map((site) => `${site.file} ${site.argument}`);
    for (const [file, argument] of ALLOWED) {
      expect(found, `${file} no longer passes \`${argument}\` to the plan gate`).toContain(
        `${file} ${argument}`
      );
    }
  });
});
