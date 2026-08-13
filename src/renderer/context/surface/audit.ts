/**
 * The four-scanner audit row (research 29 §3.2), turned into one sentence.
 *
 * `GET add-skill.vercel.sh/audit` is free, unauthenticated and answers in about
 * three seconds. It is the only content-safety signal any source in the survey
 * hands a third-party client, and it is the reason Tortie can show a risk
 * assessment BEFORE the install control instead of a warning after the install.
 *
 * Two rules the sentence must keep.
 *
 *  1. A scan with no date is a weaker claim than a scan with one, so the date
 *     is part of the sentence rather than a tooltip.
 *  2. An absent scanner says "not scanned". It never renders as blank and it
 *     never renders as safe. 36.82 per cent of 3,984 scanned skills carried a
 *     flaw, so silence is not evidence of anything.
 */

import type { AuditRecord, AuditRisk, ScannerResult } from './model';

const RISK_ORDER: readonly AuditRisk[] = [
  'safe',
  'low',
  'medium',
  'high',
  'critical'
];

/** Display names, in the order the CLI's own table prints them. */
const SCANNERS: readonly (readonly [keyof AuditRecord, string])[] = [
  ['socket', 'Socket'],
  ['snyk', 'Snyk'],
  ['zeroleaks', 'ZeroLeaks'],
  ['ath', 'Gen']
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function riskRank(risk: AuditRisk): number {
  const i = RISK_ORDER.indexOf(risk);
  return i < 0 ? 0 : i;
}

/** The worst risk any scanner reported. null when nothing scanned it. */
export function worstRisk(record: AuditRecord | null): AuditRisk | null {
  if (record === null) return null;
  let worst: AuditRisk | null = null;
  for (const [key] of SCANNERS) {
    const result = record[key];
    if (result === undefined) continue;
    if (worst === null || riskRank(result.risk) > riskRank(worst))
      worst = result.risk;
  }
  return worst;
}

/** High and critical are the two that make the install control ask again. */
export function isElevatedRisk(risk: AuditRisk | null): boolean {
  return risk === 'high' || risk === 'critical';
}

/** The most recent date any scanner reported, as epoch ms. */
export function latestScanDate(record: AuditRecord | null): number | null {
  if (record === null) return null;
  let latest: number | null = null;
  for (const [key] of SCANNERS) {
    const at = record[key]?.analyzedAt;
    if (at === undefined) continue;
    const ms = Date.parse(at);
    if (Number.isNaN(ms)) continue;
    if (latest === null || ms > latest) latest = ms;
  }
  return latest;
}

/**
 * "16 April", and "16 April 2024" once the year stops being this one. The year
 * is what turns a clean scan into a stale clean scan, so it appears the moment
 * it carries information.
 *
 * Read in UTC, deliberately. `analyzedAt` is a stamp on a scan that ran on
 * somebody else's machine, and it is being used as a version marker rather than
 * as an event in the reader's day. Converting it to the local zone would move
 * the date by one for every reader west of Greenwich and change nothing useful.
 */
export function formatScanDate(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const month = MONTHS[d.getUTCMonth()] ?? '';
  const sameYear = d.getUTCFullYear() === new Date(now).getUTCFullYear();
  return sameYear
    ? `${d.getUTCDate()} ${month}`
    : `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

function scannerPhrase(name: string, result: ScannerResult): string {
  if (name === 'Socket' && result.alerts !== undefined) {
    return `Socket ${result.alerts === 1 ? '1 alert' : `${result.alerts} alerts`}`;
  }
  if (name === 'ZeroLeaks' && result.score !== undefined) {
    return `ZeroLeaks ${result.score}`;
  }
  return `${name} ${result.risk}`;
}

/**
 * The whole row as one sentence:
 *
 *   "Scanned 16 April: Socket 0 alerts, Snyk low, ZeroLeaks 93."
 *   "Not scanned."
 */
export function auditSentence(
  record: AuditRecord | null,
  now: number = Date.now()
): string {
  const phrases: string[] = [];
  for (const [key, name] of SCANNERS) {
    const result = record?.[key];
    if (result === undefined) continue;
    phrases.push(scannerPhrase(name, result));
  }
  if (phrases.length === 0) return 'Not scanned.';

  const at = latestScanDate(record);
  const head = at === null ? 'Scanned' : `Scanned ${formatScanDate(at, now)}`;
  return `${head}: ${phrases.join(', ')}.`;
}

/** Which scanners had nothing to say, named so the gap is visible. */
export function missingScanners(record: AuditRecord | null): string[] {
  return SCANNERS.filter(([key]) => record?.[key] === undefined).map(
    ([, name]) => name
  );
}
