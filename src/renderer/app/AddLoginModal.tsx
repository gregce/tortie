/**
 * Add login (Phase 202): the one dialog, and the two steps it runs.
 *
 * IT ASKS FOR ONE THING, being a name, because a name is the whole of what
 * Tortie needs and everything else about the login belongs to the vendor. It
 * follows the New Project dialog exactly: same scrim, same field rhythm, Enter
 * adds from the field, Esc cancels, focus trapped.
 *
 * WHAT PRESSING ADD DOES, in this order and no other:
 *
 *   1. Creates an EMPTY directory under Tortie's own data and records the
 *      name. This starts nothing at all. It is a configuration change, and
 *      refusal 8 says a configuration change may never cause a process to
 *      start on its own.
 *   2. Starts ONE ORDINARY SESSION in the current project, with the vendor's
 *      own sign in command, pointed at that directory. It is the same create
 *      path every other session uses, it opens in the person's own terminal,
 *      and the person completes the vendor's own flow in the vendor's own
 *      browser.
 *
 * TORTIE NEVER SIGNS ANYBODY IN AND NEVER WRITES A CREDENTIAL. If step 2 fails
 * the login still exists and is still empty, which is honest: the directory is
 * there, nothing is in it, and the meter says the login is not signed in yet.
 *
 * IT DOES NOT CHOOSE THE NEW LOGIN EITHER. A login with nothing in it would
 * launch every new session signed out, so choosing it is a second act, made
 * from the meter's own card once the sign in has written something.
 */

import React, { useEffect, useRef, useState } from 'react';
import { LOGIN_NAME_MAX, sanitizeLoginName } from '@shared/logins';
import { useApp } from '../state/store';
import { useLogins } from '../state/logins';
import { USAGE_PROVIDER_LABEL } from './usage-copy';
import { modalKeyDown } from './focus-trap';

/** The words this dialog draws, in one place so the copy rules test reads them. */
export const ADD_LOGIN_TITLE = 'Add login';
export const ADD_LOGIN_FIELD = 'Name';
export const ADD_LOGIN_PLACEHOLDER = 'Work';
export const ADD_LOGIN_ADD = 'Add and sign in';
export const ADD_LOGIN_CANCEL = 'Cancel';
export const ADD_LOGIN_NOTE =
  'Tortie opens a session and the vendor asks you to sign in. Tortie never writes your credentials.';
export const ADD_LOGIN_BAD_NAME =
  'Use up to 32 letters, digits, spaces, dots, hyphens or underscores.';

export function AddLoginModal(): React.JSX.Element | null {
  const provider = useApp((s) => s.addLoginProvider);
  const close = useApp((s) => s.setAddLoginProvider);
  const createSession = useApp((s) => s.createSession);
  const add = useLogins((s) => s.add);
  const problem = useLogins((s) => s.problem);

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (provider === null) return;
    setName('');
    setBusy(false);
    setError(null);
    requestAnimationFrame(() => nameRef.current?.focus());
  }, [provider]);

  if (provider === null) return null;

  const clean = sanitizeLoginName(name);

  const submit = (): void => {
    if (busy) return;
    if (clean === null) {
      setError(ADD_LOGIN_BAD_NAME);
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    void add(provider, clean).then((ok) => {
      if (!ok) {
        setBusy(false);
        setError(useLogins.getState().problem ?? ADD_LOGIN_BAD_NAME);
        nameRef.current?.focus();
        return;
      }
      // STEP 2. One ordinary session, running the vendor's own command inside
      // the directory just created. `signIn` is what makes main compose that
      // argv from its own compiled words; nothing typed here reaches it.
      void createSession({
        name: `Sign in ${clean}`,
        agent: provider,
        login: clean,
        signIn: true
      }).finally(() => {
        setBusy(false);
        close(null);
      });
    });
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(null);
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${ADD_LOGIN_TITLE} ${USAGE_PROVIDER_LABEL[provider]}`}
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, { submit, close: () => close(null) })
        }
      >
        <h2 className="modal-title">
          {ADD_LOGIN_TITLE} · {USAGE_PROVIDER_LABEL[provider]}
        </h2>

        <div className="field">
          <label className="field-label" htmlFor="add-login-name">
            {ADD_LOGIN_FIELD}
          </label>
          <input
            id="add-login-name"
            ref={nameRef}
            className={`input${error !== null ? ' input-error' : ''}`}
            value={name}
            maxLength={LOGIN_NAME_MAX}
            spellCheck={false}
            autoComplete="off"
            placeholder={ADD_LOGIN_PLACEHOLDER}
            data-add-login-name="1"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          {error !== null || problem !== null ? (
            <div className="input-error-text">{error ?? problem}</div>
          ) : null}
        </div>

        <p className="field-caption">{ADD_LOGIN_NOTE}</p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => close(null)}
          >
            {ADD_LOGIN_CANCEL}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || clean === null}
            data-add-login-submit="1"
            onClick={submit}
          >
            {ADD_LOGIN_ADD}
          </button>
        </div>
      </div>
    </div>
  );
}
