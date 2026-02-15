# 🛡️ MigrateGuard

**Catch dangerous database migrations before they lock your production tables.**

MigrateGuard statically analyzes SQL migration files and detects operations that cause table locks, data loss, or downtime. Run it in CI to block unsafe migrations at PR time.

## 🔥 Problems It Solves

| Incident | Root Cause | MigrateGuard Rule |
|---|---|---|
| 45-min downtime | `CREATE INDEX` without `CONCURRENTLY` | `require-concurrent-index` |
| Full table rewrite | `ADD COLUMN NOT NULL` without `DEFAULT` | `not-null-without-default` |
| App crashes after deploy | `DROP COLUMN` still referenced in code | `drop-column-risk` |
| Irreversible data loss | `DROP TABLE` without `IF EXISTS` | `drop-table-danger` |
| Broken queries | `RENAME COLUMN` without code update | `rename-column-risk` |
| Long lock on big table | `SET NOT NULL` full scan | `set-not-null-lock` |

## 🚀 Quick Start

```bash
npm install -g migrateguard

# Scan a migration file
migrateguard migrations/0042_add_index.sql

# JSON output for CI
migrateguard migrations/*.sql --json

# Exit code 1 = errors found (blocks PR merge)
echo $?
```

### GitHub Actions

```yaml
- name: Migration Safety Check
  run: npx migrateguard migrations/*.sql
```

## 📊 Example Output

```
📄 0042_add_index.sql — ❌ FAILED
  🔴 L1 [require-concurrent-index] CREATE INDEX without CONCURRENTLY locks writes
    💡 Use CREATE INDEX CONCURRENTLY
  🔴 L3 [not-null-without-default] NOT NULL column without DEFAULT rewrites entire table
    💡 Add DEFAULT value or add nullable first, backfill, then set NOT NULL

📊 Summary: 2 errors, 0 warnings
```

## 💰 Pricing

| Feature | Free (CLI) | Pro $29/mo | Team $99/mo | Enterprise $299/mo |
|---|---|---|---|---|
| 6 built-in safety rules | ✅ | ✅ | ✅ | ✅ |
| CI/CD integration | ✅ | ✅ | ✅ | ✅ |
| JSON output | ✅ | ✅ | ✅ | ✅ |
| Custom rules (YAML) | — | ✅ | ✅ | ✅ |
| PR comment bot | — | ✅ | ✅ | ✅ |
| Slack/PagerDuty alerts | — | — | ✅ | ✅ |
| Team dashboard & trends | — | — | ✅ | ✅ |
| Schema history tracking | — | — | ✅ | ✅ |
| SSO / SAML | — | — | — | ✅ |
| Audit trail (SOC2) | — | — | — | ✅ |
| Self-hosted option | — | — | — | ✅ |
| SLA & support | Community | Email | Priority | Dedicated |

## 📈 Why Pay?

**One production lockup costs $10k–$500k** in lost revenue, engineer time, and customer trust. MigrateGuard Pro pays for itself the first time it catches a dangerous migration.

- **Stripe**: 15-min downtime = ~$150k revenue loss
- **Shopify**: Table lock during Black Friday = catastrophic
- **Your startup**: One 502 page loses customer trust forever

## 🏗️ Supported Frameworks

Works with any tool that produces `.sql` files: Django, Rails, Alembic, Prisma, Knex, TypeORM, Drizzle, Flyway, Liquibase, golang-migrate, goose.

## License

MIT — Free CLI forever. Pro features require a subscription at [migrateguard.dev](https://migrateguard.dev).
