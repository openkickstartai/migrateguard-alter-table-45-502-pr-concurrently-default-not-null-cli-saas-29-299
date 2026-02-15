#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { analyzeSql, formatText, AnalysisResult } from './analyzer';

export { analyzeSql, formatText } from './analyzer';
export type { Violation, AnalysisResult, Severity } from './analyzer';

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log('🛡️  MigrateGuard — Database Migration Safety Scanner');
    console.log('');
    console.log('Usage: migrateguard <file.sql> [...files] [options]');
    console.log('');
    console.log('Options:');
    console.log('  --json     Output results as JSON');
    console.log('  --help     Show this help message');
    console.log('  --version  Show version');
    console.log('');
    console.log('Examples:');
    console.log('  migrateguard migrations/0001.sql');
    console.log('  migrateguard migrations/*.sql --json');
    console.log('');
    console.log('Exit codes: 0 = passed, 1 = errors found');
    process.exit(0);
  }

  if (args.includes('--version')) {
    console.log('migrateguard v1.0.0');
    process.exit(0);
  }

  const jsonMode = args.includes('--json');
  const files = args.filter((a) => !a.startsWith('--'));
  const results: AnalysisResult[] = [];

  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`❌ File not found: ${file}`);
      process.exit(2);
    }
    results.push(analyzeSql(readFileSync(file, 'utf-8'), file));
  }

  if (jsonMode) {
    console.log(JSON.stringify({ results, passed: results.every((r) => r.passed) }, null, 2));
  } else {
    console.log(formatText(results));
  }

  process.exit(results.every((r) => r.passed) ? 0 : 1);
}

main();
