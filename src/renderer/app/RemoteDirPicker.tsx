/**
 * Phase 84, item 6. The folder picker for another machine.
 *
 * WHY TORTIE DRAWS THIS ONE. The Choose… button beside the create sheet's
 * Directory field opens the panel macOS ships, and that panel walks THIS Mac's
 * disk. A folder chosen in it names nothing on the other computer, so until
 * this phase a person had to know the path over there by heart and type it.
 * This panel is drawn by Tortie out of one read of one folder at a time,
 * through `machines:listDir`.
 *
 * WHAT IT DOES AND WHAT IT DOES NOT DO.
 *
 *  - It lists FOLDERS. It is a folder chooser and not a file browser. A picker
 *    that listed files would send every file name in a person's home directory
 *    across the connection for nothing.
 *  - It writes nothing on either computer.
 *  - It composes no home path for another machine. The empty path means "that
 *    machine's own home directory", and the machine resolves it and reports
 *    back the absolute path it read.
 *  - It never claims a listing is complete. When the machine holds more
 *    folders than one answer carries, the count the machine took separately is
 *    on screen beside the number shown.
 *
 * TWO EXPORTS, AND THE REASON IS THE TEST ENVIRONMENT. `RemoteDirPickerView` is
 * the whole surface as a pure function of one listing, so every state it can be
 * in is rendered and read in `__tests__/remote-dir-picker.test.tsx`, where the
 * vitest environment is node and there is no DOM to click. `RemoteDirPicker` is
 * the small stateful wrapper that does the reading. What a person sees is a
 * screenshot read, not this file.
 *
 * THE KEYBOARD. Escape shuts the panel and changes nothing, and it is stopped
 * here so it does not reach the create sheet and shut that instead. Enter is
 * stopped for the same reason: a person pressing Return inside the picker is
 * choosing a folder, never creating a session.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RemoteDirListing, RemoteDirRefusal } from '@shared/ipc';
import {
  DIR_PICKER_CHOOSE,
  DIR_PICKER_CLOSE,
  DIR_PICKER_DENIED,
  DIR_PICKER_EMPTY,
  DIR_PICKER_HOME,
  DIR_PICKER_HONESTY,
  DIR_PICKER_MISSING,
  DIR_PICKER_NOTDIR,
  DIR_PICKER_READING,
  DIR_PICKER_UP,
  dirPickerTitle,
  dirPickerTruncated,
  dirPickerUnreachable
} from './machine-copy';
import { Codicon } from '../icons';
import './remote-dir-picker.css';

/**
 * The sentence for a folder that was not listed.
 *
 * The four codes are the whole of {@link RemoteDirRefusal}, and each maps to
 * one sentence in machine-copy.ts. `unreachable` is the only one that names the
 * machine, because it is the only one that is about the machine rather than
 * about the folder.
 *
 * MAIN'S OWN `refusalText` IS NOT DRAWN. The three answers a machine gives
 * about a folder are fixed, so their sentences live in machine-copy.ts where
 * the vocabulary audit reads them, and the fourth is composed here because main
 * never sends it. Drawing main's string as well would put one fact on screen in
 * two wordings.
 */
export function dirPickerRefusalText(
  refusal: RemoteDirRefusal,
  label: string
): string {
  switch (refusal) {
    case 'missing':
      return DIR_PICKER_MISSING;
    case 'notdir':
      return DIR_PICKER_NOTDIR;
    case 'denied':
      return DIR_PICKER_DENIED;
    case 'unreachable':
      return dirPickerUnreachable(label);
  }
}

/**
 * One folder's path plus one name inside it.
 *
 * The machine always reports the path it actually read, so this join is only
 * ever the question and never the answer. The root case is written out because
 * `/` plus `/Users` would otherwise ask about `//Users`.
 */
export function joinRemotePath(base: string, name: string): string {
  if (base === '/') return `/${name}`;
  return `${base}/${name}`;
}

/** What the panel needs to draw itself, and nothing else. */
export interface RemoteDirPickerViewProps {
  /** The machine's own label. It names the panel and one refusal. */
  machineLabel: string;
  /** The last answer, or null while there has never been one. */
  listing: RemoteDirListing | null;
  /** True while a read is in flight. */
  loading: boolean;
  onOpen(name: string): void;
  onUp(): void;
  onHome(): void;
  onChoose(path: string): void;
  onClose(): void;
}

/**
 * The panel, as a pure function of one listing.
 *
 * The `Use this folder` button is off until a folder has actually been read,
 * because the path it would write is the path the MACHINE reported and there
 * is none before the first answer.
 */
export function RemoteDirPickerView({
  machineLabel,
  listing,
  loading,
  onOpen,
  onUp,
  onHome,
  onChoose,
  onClose
}: RemoteDirPickerViewProps): React.JSX.Element {
  const refusal =
    listing !== null && listing.refusal !== null
      ? dirPickerRefusalText(listing.refusal, machineLabel)
      : null;
  const readable = listing !== null && listing.refusal === null;
  const entries = readable ? listing.entries : [];
  const truncated =
    readable && listing.total > entries.length
      ? dirPickerTruncated(entries.length, listing.total)
      : null;

  return (
    <div
      className="dirpick"
      role="group"
      aria-label={dirPickerTitle(machineLabel)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
          return;
        }
        // A person pressing Return in here is choosing a folder. The create
        // sheet's own Return would start a session on another computer, so it
        // never reaches it while this panel is open. The default is left
        // alone, so Return on a focused button still presses that button.
        if (e.key === 'Enter') e.stopPropagation();
      }}
    >
      <div className="dirpick-head">
        <span className="dirpick-title">{dirPickerTitle(machineLabel)}</span>
        <button
          type="button"
          className="icon-btn dirpick-close"
          aria-label={DIR_PICKER_CLOSE}
          title={DIR_PICKER_CLOSE}
          data-dirpick-action="close"
          onClick={onClose}
        >
          <Codicon name="close" />
        </button>
      </div>

      <p className="dirpick-honesty">{DIR_PICKER_HONESTY}</p>

      <div className="dirpick-path" data-dirpick-path>
        {listing?.path ?? ''}
      </div>

      <div className="dirpick-nav">
        <button
          type="button"
          className="btn btn-secondary"
          data-dirpick-action="home"
          onClick={onHome}
        >
          {DIR_PICKER_HOME}
        </button>
        {listing !== null && listing.parent !== null ? (
          <button
            type="button"
            className="btn btn-secondary"
            data-dirpick-action="up"
            onClick={onUp}
          >
            {DIR_PICKER_UP}
          </button>
        ) : null}
      </div>

      <div className="dirpick-body" aria-live="polite">
        {loading ? <p className="dirpick-note">{DIR_PICKER_READING}</p> : null}
        {!loading && refusal !== null ? (
          <p className="dirpick-note dirpick-refusal">{refusal}</p>
        ) : null}
        {!loading && refusal === null && entries.length === 0 ? (
          <p className="dirpick-note">{DIR_PICKER_EMPTY}</p>
        ) : null}
        {!loading && entries.length > 0 ? (
          <ul className="dirpick-list">
            {entries.map((entry) => (
              <li key={entry.name}>
                <button
                  type="button"
                  className="dirpick-entry"
                  data-dirpick-entry={entry.name}
                  onClick={() => onOpen(entry.name)}
                >
                  <Codicon name="folder" />
                  <span className="dirpick-entry-name">{entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {truncated !== null ? (
          <p className="dirpick-note">{truncated}</p>
        ) : null}
      </div>

      <div className="dirpick-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!readable}
          data-dirpick-action="choose"
          onClick={() => {
            if (listing !== null) onChoose(listing.path);
          }}
        >
          {DIR_PICKER_CHOOSE}
        </button>
      </div>
    </div>
  );
}

export interface RemoteDirPickerProps {
  machineId: string;
  machineLabel: string;
  /**
   * Where to start. An empty string is that machine's own home directory, and
   * it is what an empty Directory field gives.
   */
  initialPath: string;
  onChoose(path: string): void;
  onClose(): void;
}

/**
 * The panel plus the one read it does.
 *
 * Every answer that comes back for a path the person has already moved away
 * from is dropped, so a slow read of a big folder cannot overwrite a fast read
 * of the folder inside it.
 */
export function RemoteDirPicker({
  machineId,
  machineLabel,
  initialPath,
  onChoose,
  onClose
}: RemoteDirPickerProps): React.JSX.Element {
  const [path, setPath] = useState(initialPath);
  const [listing, setListing] = useState<RemoteDirListing | null>(null);
  const [loading, setLoading] = useState(true);
  /** The path the newest read asked about. An older answer is dropped. */
  const wanted = useRef(initialPath);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    wanted.current = path;
    const api = window.gmux?.machines;
    if (api?.listDir === undefined) {
      // A build with no machines bridge cannot be here, because the Browse
      // button is only drawn for a machine that came off that bridge. The
      // panel still says what it knows rather than drawing an empty list.
      setLoading(false);
      setListing({
        path,
        parent: null,
        entries: [],
        total: 0,
        refusal: 'unreachable',
        refusalText: null
      });
      return;
    }
    setLoading(true);
    void api.listDir({ machineId, path }).then(
      (answer) => {
        if (wanted.current !== path) return;
        setLoading(false);
        setListing(answer);
      },
      () => {
        // The call itself did not come back. That is the machine rather than
        // the folder, so it is the one refusal that names the machine.
        if (wanted.current !== path) return;
        setLoading(false);
        setListing({
          path,
          parent: null,
          entries: [],
          total: 0,
          refusal: 'unreachable',
          refusalText: null
        });
      }
    );
  }, [machineId, path]);

  // The keyboard goes into the panel when it opens, so Escape and the folder
  // rows are reachable without the mouse.
  useEffect(() => {
    box.current?.querySelector('button')?.focus();
  }, []);

  const open = useCallback(
    (name: string) => {
      const base = listing?.path ?? path;
      setPath(joinRemotePath(base, name));
    },
    [listing, path]
  );

  return (
    <div ref={box}>
      <RemoteDirPickerView
        machineLabel={machineLabel}
        listing={listing}
        loading={loading}
        onOpen={open}
        onUp={() => {
          if (listing?.parent !== null && listing?.parent !== undefined) {
            setPath(listing.parent);
          }
        }}
        onHome={() => setPath('')}
        onChoose={onChoose}
        onClose={onClose}
      />
    </div>
  );
}
