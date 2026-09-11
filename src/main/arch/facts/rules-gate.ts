/**
 * The GATE rules (Phase 257): where work is refused, checked or switched.
 *
 * The family measured 58%, 67% excluding vendored bytes, and two of its rules
 * are FIXED here on the hand sample's own false rows. `gate.auth`, 54%, was
 * matching an auth word anywhere in a callee's text, so `expect(authenticate)
 * .toHaveBeenCalled()` and `authenticated_user.hashed_password.startswith()`
 * both fired; it now asks the word of the final segment and the receiver
 * separately, refuses an assertion or mocking receiver, and refuses a swift
 * implicit member (`.authorization(token)` is a value, not a call the product
 * makes). `gate.refusal`, 57%, refuses a test path outright, because a
 * `raise` or `new Error` in a test is a fixture or an assertion, and the
 * sample's eight `t` rows in this family were that.
 */

import type { FactRule } from './types';
import { ASSERTION_RECV, isAnnotation, isTestPath } from './predicates';

// `permit` is deliberately absent. Its one measured hit was Pundit's RSpec
// matcher (`expect(subject).to_not permit(alice, john)`, mastodon/gate/5,
// judged t), a bare call nested inside an assertion that no receiver test can
// see, and its product idiom is Rails strong params (`params.permit(:a)`),
// which is not a gate.
const AUTH_WORD =
  /(authenticate|authoriz|requireAuth|require_login|login_required|checkPermission|hasPermission|isAllowed|canAccess|ensureSignedIn|verifyToken|currentUser|access_control)/i;

const GUARD_MIDDLEWARE = /auth|guard|protect|csrf|cors|ratelimit|rate_limit/i;

export const GATE_RULES: readonly FactRule[] = [
  {
    id: 'gate.auth',
    category: 'gate',
    kind: 'auth',
    langs: '*',
    match: (s) => {
      if (s.callee.startsWith('.')) return null;
      if (ASSERTION_RECV.test(s.recv)) return null;
      // The receiver is asked only when it is a plain name: `headers['Authorization']`
      // is an index into a value, not a gate.
      const recvIsName = /^[\w$]+$/.test(s.recv);
      const hit = AUTH_WORD.test(s.last) ? s.last : recvIsName && AUTH_WORD.test(s.recv) ? s.recv : null;
      if (hit === null) return null;
      const shown = isAnnotation(s.form) ? `@${s.callee.slice(0, 59)}` : s.callee.slice(0, 60);
      return `auth gate ${shown}`;
    }
  },
  {
    id: 'gate.flag',
    category: 'gate',
    kind: 'flag',
    langs: '*',
    match: (s) => {
      if (/(featureFlag|isEnabled|isFeatureEnabled|flagEnabled|getFlag|variation|checkFlag|toggles?\.)/i.test(s.callee)) {
        return `feature flag ${s.args[0] || s.callee.slice(0, 50)}`;
      }
      return null;
    }
  },
  {
    id: 'gate.refusal',
    category: 'gate',
    kind: 'refusal',
    langs: '*',
    match: (s, c) => {
      if (isTestPath(c.file)) return null;
      const msg = s.args.find((a) => a.length > 6 && /\s/.test(a));
      if (/^(Error|TypeError|ValueError|RuntimeError|Exception)$/.test(s.last) && s.form === 'new') {
        return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : null;
      }
      // `require` is deliberately absent: in JS it is the module loader and
      // it matched 300+ imports on this repository before it was removed.
      if (/^(panic|fatal|Fatalf|Fatal|abort|invariant|raise|throwError)$/.test(s.last)) {
        return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : `refuses (${s.last})`;
      }
      if (s.recv === 'errors' && s.last === 'New') return msg !== undefined ? `refuses: ${msg.slice(0, 90)}` : null;
      return null;
    }
  },
  {
    id: 'gate.guard-name',
    category: 'gate',
    kind: 'guard',
    langs: '*',
    match: (s) => {
      if (isAnnotation(s.form) && /^(guard|Guard|RequiresRole|PreAuthorize|Secured|RolesAllowed|Authorize)$/.test(s.last)) {
        return `guard @${s.callee.slice(0, 50)}`;
      }
      if (/^(middleware|use)$/.test(s.last)) {
        const named = s.args.find((a) => GUARD_MIDDLEWARE.test(a));
        if (named !== undefined) return `middleware ${named}`;
      }
      return null;
    }
  }
];
