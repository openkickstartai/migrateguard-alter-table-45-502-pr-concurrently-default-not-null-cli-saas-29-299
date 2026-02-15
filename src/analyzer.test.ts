import { describe, it, expect } from 'vitest';
import { analyzeSql, formatText } from './analyzer';

describe('MigrateGuard Analyzer', () => {
  it('detects CREATE INDEX without CONCURRENTLY', () => {
    const r = analyzeSql('CREATE INDEX idx_email ON users (email);', 't.sql');
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].rule).toBe('require-concurrent-index');
  });

  it('passes CREATE INDEX CONCURRENTLY', () => {
    const r = analyzeSql('CREATE INDEX CONCURRENTLY idx_email ON users (email);', 't.sql');
    expect(r.violations.filter((v) => v.rule === 'require-concurrent-index')).toHaveLength(0);
  });

  it('detects NOT NULL without DEFAULT', () => {
    const r = analyzeSql('ALTER TABLE users ADD COLUMN age INT NOT NULL;', 't.sql');
    expect(r.passed).toBe(false);
    expect(r.violations[0].rule).toBe('not-null-without-default');
  });

  it('passes NOT NULL with DEFAULT', () => {
    const r = analyzeSql('ALTER TABLE users ADD COLUMN age INT NOT NULL DEFAULT 0;', 't.sql');
    expect(r.passed).toBe(true);
  });

  it('detects DROP COLUMN as warning', () => {
    const r = analyzeSql('ALTER TABLE users DROP COLUMN legacy;', 't.sql');
    expect(r.violations.some((v) => v.rule === 'drop-column-risk')).toBe(true);
    expect(r.passed).toBe(true); // warnings don't fail
  });

  it('detects DROP TABLE without IF EXISTS', () => {
    const r = analyzeSql('DROP TABLE users;', 't.sql');
    expect(r.passed).toBe(false);
    expect(r.violations[0].rule).toBe('drop-table-danger');
  });

  it('passes DROP TABLE IF EXISTS', () => {
    const r = analyzeSql('DROP TABLE IF EXISTS temp;', 't.sql');
    expect(r.violations.filter((v) => v.rule === 'drop-table-danger')).toHaveLength(0);
  });

  it('detects RENAME COLUMN', () => {
    const r = analyzeSql('ALTER TABLE users RENAME COLUMN name TO full_name;', 't.sql');
    expect(r.violations.some((v) => v.rule === 'rename-column-risk')).toBe(true);
  });

  it('detects SET NOT NULL lock risk', () => {
    const r = analyzeSql('ALTER TABLE users ALTER COLUMN email SET NOT NULL;', 't.sql');
    expect(r.violations.some((v) => v.rule === 'set-not-null-lock')).toBe(true);
  });

  it('catches multiple violations in one file', () => {
    const sql = [
      'CREATE INDEX idx_a ON t (a);',
      'ALTER TABLE t ADD COLUMN x INT NOT NULL;',
      'ALTER TABLE t DROP COLUMN old;',
    ].join('\n');
    const r = analyzeSql(sql, 'multi.sql');
    expect(r.violations.length).toBeGreaterThanOrEqual(3);
    expect(r.passed).toBe(false);
  });

  it('passes completely safe migration', () => {
    const sql = [
      'CREATE INDEX CONCURRENTLY idx_a ON t (a);',
      'ALTER TABLE t ADD COLUMN bio TEXT;',
    ].join('\n');
    const r = analyzeSql(sql, 'safe.sql');
    expect(r.passed).toBe(true);
    expect(r.violations.filter((v) => v.severity === 'error')).toHaveLength(0);
  });

  it('formatText produces readable output', () => {
    const r = analyzeSql('CREATE INDEX idx ON t (a);', 'f.sql');
    const text = formatText([r]);
    expect(text).toContain('❌ FAILED');
    expect(text).toContain('require-concurrent-index');
    expect(text).toContain('Summary');
  });
});
