/**
 * The grader self-test loop that probe:p330 and probe:p332 share. Phase 332's
 * integrator extracted it from the copy each probe carried.
 *
 * A probe's graders are pure functions of a recorded reading. A grader is
 * trusted only once each of its clauses has been shown to FAIL, so for every
 * grader this checks four things:
 *   - the honest reading passes;
 *   - each clause goes red when only its own break is applied;
 *   - every break names a clause the grader has;
 *   - every refused edit names one of the grader's own clauses and turns that
 *     clause red.
 *
 * It starts nothing: no process, no socket and no file.
 *
 * `graders` maps an id to `{ clauses: [[name, test], ...] }`. `fixtures` maps
 * the same id to `{ pass, breaks: { [clause]: edit }, refused?: [{ what,
 * clause, edit }] }`. `grade(id, reading)` answers `{ ok, failed }`, `clone`
 * copies a fixture's reading, and `say(ok, text)` reports each check, which
 * the probe counts. The function answers the number of clauses it graded.
 */
export function gradeFixtures({ graders, fixtures, grade, clone, say, J = JSON.stringify }) {
  let clauses = 0;
  for (const id of Object.keys(graders)) {
    const fixture = fixtures[id];
    if (fixture === undefined) {
      say(false, `${id} has no fixtures`);
      continue;
    }
    const pass = grade(id, clone(fixture.pass));
    say(pass.ok, `${id} passes its honest reading${pass.ok ? '' : `, failing ${J(pass.failed)}`}`);
    for (const [name] of graders[id].clauses) {
      clauses += 1;
      const breakIt = fixture.breaks[name];
      if (breakIt === undefined) {
        say(false, `${id} has no fixture that breaks "${name}", so nothing shows that clause can fail`);
        continue;
      }
      const reading = clone(fixture.pass);
      breakIt(reading);
      const got = grade(id, reading);
      say(!got.ok && got.failed.includes(name), `${id} goes red on "${name}" when only that is broken${got.failed.includes(name) ? '' : ` (it failed ${J(got.failed)})`}`);
    }
    for (const name of Object.keys(fixture.breaks)) {
      if (!graders[id].clauses.some(([c]) => c === name)) say(false, `${id} has a break for "${name}", which is no clause of its grader`);
    }
    for (const { what, clause, edit } of fixture.refused ?? []) {
      if (!graders[id].clauses.some(([c]) => c === clause)) {
        say(false, `${id} refuses ${what} on "${clause}", which is no clause of its grader`);
        continue;
      }
      const reading = clone(fixture.pass);
      edit(reading);
      const got = grade(id, reading);
      say(!got.ok && got.failed.includes(clause), `${id} refuses ${what} on "${clause}"${got.failed.includes(clause) ? '' : ` (it failed ${J(got.failed)})`}`);
    }
  }
  return clauses;
}
