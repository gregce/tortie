/**
 * The line rules (Phase 257): a main, a test's own name, an environment
 * switch, and the rust look back that makes a test fn ONE fact.
 */

import { describe, expect, it } from 'vitest';
import { applyLineRules } from '../line-rules';
import { ctx } from './site';

function read(file: string, lang: Parameters<typeof ctx>[1], text: string): string[] {
  return applyLineRules(ctx(file, lang, text), text.split('\n')).map((f) => `${f.line} ${f.rule} ${f.subject}`);
}

describe('mains', () => {
  it('go, rust, python, swift and the Rails application', () => {
    expect(read('main.go', 'go', 'package main\n\nfunc main() {\n}')).toEqual(['3 entrypoint.go.main main() in main.go']);
    expect(read('src/main.rs', 'rust', '#[tokio::main]\nasync fn main() {}')).toEqual(['2 entrypoint.rust.main main() in src/main.rs']);
    expect(read('main.py', 'python', 'x = 1\nif __name__ == "__main__":\n    run()')).toEqual([
      '2 entrypoint.python.dunder-main __main__ in main.py'
    ]);
    expect(read('Sources/App/main.swift', 'swift', '@main\nstruct App {}')).toEqual(['1 entrypoint.swift.main @main in Sources/App/main.swift']);
    expect(read('config/application.rb', 'ruby', 'module Mastodon\n  class Application < Rails::Application\n  end\nend')).toEqual([
      '2 entrypoint.rails.application composes Application < Rails::Application'
    ]);
  });

  it('answers for its own grammar only', () => {
    expect(read('x.ts', 'typescript', 'func main() {}\nfn main() {}')).toEqual([]);
  });
});

describe('tests', () => {
  it('go, python, swift, ruby', () => {
    expect(read('a_test.go', 'go', 'func TestX(t *testing.T) {}\nfunc BenchmarkY(b *testing.B) {}\nfunc helper() {}')).toEqual([
      '1 test.go.func Test X',
      '2 test.go.func Benchmark Y'
    ]);
    expect(read('tests/test_a.py', 'python', 'def test_one():\n    pass\nasync def test_two():\n    pass\ndef helper():\n    pass')).toEqual([
      '1 test.python.def test test_one',
      '3 test.python.def test test_two'
    ]);
    expect(read('Tests/K.swift', 'swift', 'final class KitTests: XCTestCase {\n  func testA() {}\n  func helper() {}\n}')).toEqual([
      '1 test.swift.xctest XCTestCase KitTests',
      '2 test.swift.func test testA'
    ]);
    expect(read('test/x_test.rb', 'ruby', 'class T < Minitest::Test\n  def test_a\n  end\nend')).toEqual(['2 test.ruby.def test test_a']);
  });

  it('rust: ONE fact per test fn, from the attribute above it, and a plain helper is nothing', () => {
    const text = [
      '#[test]',
      'fn one() {}',
      '',
      '#[tokio::test]',
      'async fn two() {}',
      '',
      'fn helper() {}',
      '',
      '#[test]',
      '#[ignore]',
      'fn three() {}',
      '',
      '#[cfg(test)]',
      'fn not_a_test() {}',
      '',
      '#[test]',
      '',
      '',
      'fn four_after_blanks() {}'
    ].join('\n');
    expect(read('tests/a.rs', 'rust', text)).toEqual([
      '2 test.rust.fn test fn one',
      '5 test.rust.fn test fn two',
      '11 test.rust.fn test fn three',
      '19 test.rust.fn test fn four_after_blanks'
    ]);
  });

  it('rust: the path alone no longer makes a zero argument fn a test', () => {
    expect(read('tests/a.rs', 'rust', 'fn helper() {}\nfn other() {}')).toEqual([]);
  });
});

describe('the environment switch', () => {
  it('reads six spellings and skips a lower case name', () => {
    expect(read('a.ts', 'typescript', 'const x = process.env.GMUX_X;\nconst y = process.env.home;')).toEqual([
      '1 gate.env-read environment switch GMUX_X'
    ]);
    expect(read('a.py', 'python', "os.environ['NETRC'] = f")).toEqual(['1 gate.env-read environment switch NETRC']);
    expect(read('a.rs', 'rust', 'std::env::var("RUST_LOG")')).toEqual(['1 gate.env-read environment switch RUST_LOG']);
    expect(read('a.go', 'go', 'os.Getenv("PORT")')).toEqual(['1 gate.env-read environment switch PORT']);
    expect(read('a.rb', 'ruby', "ENV['RAILS_ENV']")).toEqual(['1 gate.env-read environment switch RAILS_ENV']);
  });

  it('one fact per (rule, subject), and no line over the cap', () => {
    expect(read('a.ts', 'typescript', 'process.env.HOME_X;\nprocess.env.HOME_X;')).toHaveLength(1);
    expect(read('a.ts', 'typescript', `${'x'.repeat(601)} process.env.HOME_X;`)).toEqual([]);
  });

  it('H15: a name under three characters is not a switch; H10: #[cfg(test)] alone marks no fn', () => {
    expect(read('a.ts', 'typescript', 'const a = process.env.OK;\nconst b = process.env.A;')).toEqual([]);
    expect(read('a.ts', 'typescript', 'const a = process.env.OKAY;')).toEqual(['1 gate.env-read environment switch OKAY']);
    expect(read('tests/a.rs', 'rust', '#[cfg(test)]\nfn cfg_helper() {}')).toEqual([]);
  });

  it('the stated limit: a line rule sees no parse tree, so a docstring or a comment reads as code', () => {
    expect(read('a.py', 'python', "'''\ndef test_in_docstring():\n'''")).toEqual(['2 test.python.def test test_in_docstring']);
    expect(read('a.ts', 'typescript', '// process.env.CMT_SECRET')).toEqual(['1 gate.env-read environment switch CMT_SECRET']);
  });
});
