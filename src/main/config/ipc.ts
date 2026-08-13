/**
 * The ONE `config:*` registrar, and the seam the overlay loader plugs into.
 *
 * Three channels, and what is NOT here is the point of the file.
 *
 *  - `config:rows` reads. It returns what the file says and what is on record
 *    for each row. It starts no process, opens no socket, touches no manifest
 *    and writes nothing.
 *  - `config:confirm` writes ONE record, being that a person agreed to one row.
 *    It spawns nothing. Agreeing to a row does not start it.
 *  - `config:forget` deletes one record, so the row asks again.
 *
 * There is deliberately no `config:launch` and no `config:reload` that then
 * does something. A configured agent starts through the ordinary session create
 * path, which calls {@link assertConfigRowMayLaunch} in main. Splitting the
 * agreement from the launch is what makes "nothing starts on a configuration
 * change alone" a fact about the channel list rather than a promise.
 *
 * ## The seam
 *
 * This registrar does not read the configuration file. It takes a
 * {@link ConfigRowSource}, which the overlay loader supplies. The default
 * source returns nothing, which is the correct behaviour for a build with no
 * loader wired in yet and for a machine with no configuration file, and it is
 * also what keeps this module in the bundle so the refusal gate can assert its
 * sentences.
 */

import type { IpcMain } from 'electron';
import type {
  ConfigConfirmInput,
  ConfigRowView,
  ConfigRowsResult
} from '@shared/ipc';
import { handle } from '../typed-ipc';
import { gmuxError } from '../errors';
import {
  CONFIG_CONFIRM_ACKNOWLEDGEMENT,
  CONFIG_CONFIRM_WARNING,
  configRowStatus,
  confirmConfigRow,
  forgetConfigRow,
  type ConfigExecutionFields
} from './confirm';
// One opinion about where the configuration directory is, and it is not this
// file's. `./paths` is the loader's, and the reveal affordance must point at
// the same folder the loader reads.
import { configDir } from './paths';

/** One row as the loader hands it over. */
export interface ConfigSourceRow {
  readonly id: string;
  readonly displayName: string;
  readonly fields: ConfigExecutionFields;
}

/** A row the loader dropped whole, naming the field and the reason. */
export interface ConfigSourceError {
  readonly id: string;
  readonly field: string;
  readonly reason: string;
}

/**
 * What the registrar needs from the overlay loader.
 *
 * `read` is synchronous and must not touch the disk when it is called: the
 * loader reads the file at boot, on an explicit reload and on a watcher
 * debounce, and this asks for what it already has. That is what keeps a draw of
 * the list off the file system and, more importantly, keeps the read out of any
 * path a session create could reach.
 */
export interface ConfigRowSource {
  directory(): string;
  read(): { rows: readonly ConfigSourceRow[]; errors: readonly ConfigSourceError[] };
}

/**
 * The source used when no loader is wired in. It reports no rows and no errors,
 * which is exactly what a machine with no configuration file has.
 */
export const EMPTY_CONFIG_SOURCE: ConfigRowSource = {
  directory: () => configDir(),
  read: () => ({ rows: [], errors: [] })
};

let source: ConfigRowSource = EMPTY_CONFIG_SOURCE;

/**
 * Hand the registrar the real loader. Called once during boot, after the
 * loader's first read.
 */
export function setConfigRowSource(next: ConfigRowSource): void {
  source = next;
}

function viewOf(row: ConfigSourceRow): ConfigRowView {
  const status = configRowStatus(row.id, row.fields);
  return {
    id: row.id,
    displayName: row.displayName.length > 0 ? row.displayName : row.id,
    state: status.state,
    hash: status.hash,
    confirmedHash: status.confirmedHash,
    confirmedAt: status.confirmedAt,
    confirmedLines: [...status.confirmedLines],
    lines: [...status.lines],
    refusal: status.refusal,
    warning: CONFIG_CONFIRM_WARNING
  };
}

/** The row the file currently holds under this id, or a refusal. */
function rowOrThrow(id: string): ConfigSourceRow {
  const found = source.read().rows.find((row) => row.id === id);
  if (found === undefined) {
    throw gmuxError(
      'INVALID_INPUT',
      `There is no configured agent called ${id} in the configuration file. ` +
        `Nothing was confirmed.`
    );
  }
  return found;
}

export function registerConfigIpc(ipc: IpcMain): void {
  handle(ipc, 'config:rows', (): ConfigRowsResult => {
    const { rows, errors } = source.read();
    return {
      rows: rows.map(viewOf),
      errors: errors.map((e) => ({ id: e.id, field: e.field, reason: e.reason })),
      directory: source.directory()
    };
  });

  handle(ipc, 'config:confirm', (_event, input: ConfigConfirmInput): ConfigRowView => {
    const row = rowOrThrow(input.id);
    // The acknowledgement is supplied HERE, in main, by the handler a person's
    // click reaches. It is never sent from the renderer and never read from a
    // file, so the sentence means "a person pressed the button in Tortie" and
    // cannot mean anything else.
    const confirmation = confirmConfigRow(row.id, row.fields, {
      acknowledgement: CONFIG_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: input.hashRead,
      linesRead: input.linesRead
    });
    if (confirmation === null) {
      throw gmuxError(
        'INVALID_INPUT',
        `Tortie could not record your confirmation for ${row.id}, because the ` +
          `system keychain is unavailable. Nothing was confirmed.`
      );
    }
    return viewOf(row);
  });

  handle(ipc, 'config:forget', (_event, id: string): ConfigRowView => {
    forgetConfigRow(id);
    const row = source.read().rows.find((r) => r.id === id);
    if (row !== undefined) return viewOf(row);
    // The row left the file as well. Report it as a row nobody has agreed to,
    // which is what it is, rather than failing a withdrawal that succeeded.
    // The hash is empty because there is no row to take one of, and an empty
    // string is the honest answer where the hash of an empty row would not be.
    return {
      id,
      displayName: id,
      state: 'never',
      hash: '',
      confirmedHash: null,
      confirmedAt: null,
      confirmedLines: [],
      lines: [],
      refusal: null,
      warning: CONFIG_CONFIRM_WARNING
    };
  });
}
