export type Severity = 'error' | 'warning';

export interface Violation {
  rule: string;
  severity: Severity;
  message: string;
  line: number;
  sql: string;
  suggestion: string;
}

export interface AnalysisResult {
  file: string;
  violations: Violation[];
  passed: boolean;
}

interface Rule {
  id: string;
  severity: Severity;
  test: (s: string) => boolean;
  message: string;
  suggestion: string;
}

const RULES: Rule[] = [
  {
    id: 'require-concurrent-index',
    severity: 'error',
    test: (s) => /CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(s) && !/CONCURRENTLY/i.test(s),
    message: 'CREATE INDEX without CONCURRENTLY locks writes',
    suggestion: 'Use CREATE INDEX CONCURRENTLY',
  },
  {
    id: 'not-null-without-default',
    severity: 'error',
    test: (s) => /ADD\s+COLUMN/i.test(s) && /NOT\s+NULL/i.test(s) && !/DEFAULT/i.test(s),
    message: 'NOT NULL column without DEFAULT rewrites entire table',
    suggestion: 'Add DEFAULT value or add nullable first, backfill, then set NOT NULL',
  },
  {
    id: 'drop-column-risk',
    severity: 'warning',
    test: (s) => /DROP\s+COLUMN/i.test(s),
    message: 'Dropping column may break application code referencing it',
    suggestion: 'Deploy code removing references first, then drop column',
  },
  {
    id: 'drop-table-danger',
    severity: 'error',
    test: (s) => /DROP\s+TABLE\b/i.test(s) && !/IF\s+EXISTS/i.test(s),
    message: 'DROP TABLE without IF EXISTS is irreversible and unsafe',
    suggestion: 'Use DROP TABLE IF EXISTS and verify no code references remain',
  },
  {
    id: 'rename-column-risk',
    severity: 'warning',
    test: (s) => /RENAME\s+COLUMN/i.test(s),
    message: 'Renaming column breaks all code using the old name',
    suggestion: 'Add new column, backfill, update code, then drop old column',
  },
  {
    id: 'set-not-null-lock',
    severity: 'warning',
    test: (s) => /SET\s+NOT\s+NULL/i.test(s),
    message: 'SET NOT NULL scans entire table with ACCESS EXCLUSIVE lock',
    suggestion: 'Add CHECK constraint NOT VALID first, then VALIDATE CONSTRAINT separately',
  },
];

export function analyzeSql(sql: string, file: string): AnalysisResult {
  const stmts = sql.split(';').map((s) => s.trim()).filter(Boolean);
  const violations: Violation[] = [];
  for (const stmt of stmts) {
    const line = sql.substring(0, sql.indexOf(stmt)).split('\n').length;
    for (const rule of RULES) {
      if (rule.test(stmt)) {
        violations.push({
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          line,
          sql: stmt.replace(/\s+/g, ' ').slice(0, 80),
          suggestion: rule.suggestion,
        });
      }
    }
  }
  return { file, violations, passed: !violations.some((v) => v.severity === 'error') };
}

export function formatText(results: AnalysisResult[]): string {
  const out: string[] = [];
  for (const r of results) {
    out.push(`\n📄 ${r.file} — ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
    for (const v of r.violations) {
      const icon = v.severity === 'error' ? '🔴' : '🟡';
      out.push(`  ${icon} L${v.line} [${v.rule}] ${v.message}`);
      out.push(`    💡 ${v.suggestion}`);
    }
  }
  const errs = results.reduce((n, r) => n + r.violations.filter((v) => v.severity === 'error').length, 0);
  const warns = results.reduce((n, r) => n + r.violations.filter((v) => v.severity === 'warning').length, 0);
  out.push(`\n📊 Summary: ${errs} error(s), ${warns} warning(s)`);
  return out.join('\n');
}
