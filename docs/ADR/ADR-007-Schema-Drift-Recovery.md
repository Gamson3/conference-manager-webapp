# ADR-007: Schema Drift and Migration Integrity in Prisma-based Systems

**Status:** Accepted  
**Date:** 2026-01-10  
**Authors:** Conference Master Development Team  
**Classification:** Thesis Appendix — Case Study

---

## Abstract

This document presents a case study of schema drift recovery in a Prisma-based TypeScript application. We analyze an incident where the `prisma db pull --force` command inadvertently overwrote semantic domain models with database-introspected artifacts, breaking the code-schema contract. We document the systematic recovery process, establish preventive guidelines, and formalize the principle that **schema defines intent; the database implements it**.

This case study demonstrates practical debugging methodology applicable to ORM-based systems and provides evidence of engineering rigor suitable for academic evaluation.

---

## 1. Introduction

### 1.1 Context

The Conference Master Web App is a full-stack TypeScript application using:

- **Backend:** Node.js, Express, Prisma ORM 6.x
- **Database:** PostgreSQL 15 with PostGIS extensions
- **Testing:** Vitest with isolated test database

The system employs a capability-based data model with typed participation roles, unified submission workflows, and consent-based delegation features.

### 1.2 The Incident

During development of the "Submission Assistance" feature (consent-based delegation allowing organizers to assist authors), integration tests began failing with the error:

```
The table `public.SubmissionAssistanceRequest` does not exist in the current database.
```

This occurred despite migrations reporting "already applied" status.

### 1.3 Scope of This Document

This ADR documents:

1. Root cause analysis of the schema drift
2. The systematic recovery methodology
3. Preventive measures implemented
4. Generalizable principles for Prisma-based systems

---

## 2. Background: Prisma's Dual-Direction Data Flow

### 2.1 Schema-First vs Database-First

Prisma supports two paradigms:

| Direction | Command | Use Case |
|-----------|---------|----------|
| Schema → DB | `migrate dev`, `migrate deploy` | Standard development flow |
| DB → Schema | `db pull` | Brownfield adoption, introspection |

**Critical distinction:** These are mutually exclusive mental models. Mixing them within a project creates schema drift.

### 2.2 The `db pull` Command

```bash
prisma db pull [--force]
```

This command:

1. Connects to the live database
2. Introspects all tables, columns, constraints, and indexes
3. **Overwrites** `schema.prisma` with the introspected result

The `--force` flag bypasses safety prompts.

### 2.3 Why This Is Dangerous in Schema-First Projects

Prisma introspection generates **technically correct but semantically degraded** schemas:

| Aspect | Schema-First | Introspected |
|--------|--------------|--------------|
| Relation names | `author`, `conference`, `organizer` | `User`, `Conference`, `User_` |
| Field defaults | Explicit: `@default(now()) @updatedAt` | May lose `@updatedAt` attribute |
| Documentation | Preserved | Lost |
| Naming conventions | camelCase relations | PascalCase model references |

---

## 3. Incident Analysis

### 3.1 Timeline of Events

| Time | Action | Result |
|------|--------|--------|
| T+0 | Developer runs `prisma db pull --force` | Schema overwritten |
| T+1 | `prisma generate` succeeds | Client regenerated with wrong types |
| T+2 | `tsc --noEmit` fails | 200+ type errors |
| T+3 | Tests fail | "Table does not exist" errors |

### 3.2 Symptoms Observed

**TypeScript Errors (Sample):**

```typescript
// Before (correct schema)
submission.author  // Works

// After (introspected schema)
submission.author  // Error: Property 'author' does not exist
submission.User    // Now the only option
```

**Migration Status Paradox:**

```bash
$ prisma migrate status
33 migrations found in prisma/migrations
Database schema is up to date!

$ vitest run
Error: The table `public.SubmissionAssistanceRequest` does not exist
```

### 3.3 Root Cause

The paradox was caused by **environment routing**:

- `prisma migrate status` checked the **development database** (`conference_manager`)
- `vitest` used the **test database** (`conference_manager_test`) via `DATABASE_URL_TEST`

The test database was missing migrations because:

1. `db pull --force` overwrote the schema
2. The developer reset the dev database, not the test database
3. Tests ran against stale test database state

---

## 4. Recovery Methodology

### 4.1 Principle: Schema Defines Intent

We established a governing principle:

> **The schema is the single source of truth.**
> Code must not be modified to match introspected artifacts.
> The schema must be restored to match code expectations.

### 4.2 Recovery Steps

#### Step 1: Identify the Correct Schema

Located the pre-incident schema from:

- Version control history (if available)
- Documentation (`docs/refined-schema.preview.prisma`)
- Migration SQL files (partial reconstruction)

#### Step 2: Restore Semantic Relation Names

**Before (introspected):**

```prisma
model Submission {
  authorId Int
  User     User @relation(fields: [authorId], references: [id])
}
```

**After (restored):**

```prisma
model Submission {
  authorId Int
  author   User @relation("SubmissionAuthor", fields: [authorId], references: [id])
}
```

#### Step 3: Align Schema to Code Requirements

Identified missing elements by analyzing TypeScript errors:

```typescript
// Code expected:
if (submission.status === 'revision_requested') { ... }

// Schema was missing:
enum SubmissionStatus {
  draft
  submitted
  // revision_requested ← Missing!
  accepted
  rejected
}
```

Fixed by adding the enum value to schema.

#### Step 4: Apply Migrations to Test Database

```bash
# Identified environment mismatch
echo $DATABASE_URL        # → conference_manager
echo $DATABASE_URL_TEST   # → conference_manager_test

# Applied migrations to correct database
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
```

#### Step 5: Validate End-to-End

```bash
npx prisma format      # ✓ Schema valid
npx prisma generate    # ✓ Client regenerated
npx tsc --noEmit       # ✓ No type errors
npx vitest run         # ✓ 14/14 tests passing
```

---

## 5. Preventive Measures

### 5.1 Schema Header Warning

Added to `schema.prisma`:

```prisma
// ⚠️  IMPORTANT — SCHEMA INTEGRITY RULES
// ══════════════════════════════════════════════════════════════════════════════
// This schema is the SINGLE SOURCE OF TRUTH for the data model.
//
// ❌ NEVER run `prisma db pull` or `prisma db pull --force`
//    → This overwrites semantic relation names with introspected artifacts
//    → It breaks code ↔ schema alignment
//
// ✅ Use `prisma migrate dev` to create new migrations (schema changes)
// ✅ Use `prisma migrate deploy` to apply existing migrations (CI/CD, test DB)
// ✅ Use `prisma generate` to regenerate the client after schema changes
//
// If schema drift occurs, restore from version control — do NOT re-introspect.
// ══════════════════════════════════════════════════════════════════════════════
```

### 5.2 Test Database Bootstrap Script

Existing script (`scripts/test-db-setup.ts`) ensures:

1. Test database exists (creates if missing)
2. All migrations are applied before tests run
3. Safety check prevents running against non-test databases

```typescript
// Fail fast if someone accidentally points tests at a non-test DB
if (!allowNonTestDb && !/(\btest\b|_test\b)/i.test(testUrl)) {
  throw new Error(
    `Refusing to run tests against a database that doesn't look like a test DB: ${testUrl}`
  );
}
```

### 5.3 Environment Isolation

| Environment | Database | `DATABASE_URL` Source |
|-------------|----------|----------------------|
| Development | `conference_manager` | `.env` |
| Testing | `conference_manager_test` | `.env.test` → `DATABASE_URL_TEST` |
| Production | (configured separately) | Environment variables |

---

## 6. Generalized Principles

### 6.1 The Schema-Code Contract

In schema-first ORM development:

```
┌─────────────┐     defines      ┌─────────────┐     implements     ┌─────────────┐
│   Schema    │ ───────────────► │   Types     │ ◄──────────────── │    Code     │
│ (Prisma)    │                  │ (Generated) │                    │ (TypeScript)│
└─────────────┘                  └─────────────┘                    └─────────────┘
       │                                                                   │
       │                         generates                                 │
       ▼                                                                   │
┌─────────────┐                                                           │
│  Migrations │ ─────────────────────────────────────────────────────────►│
│   (SQL)     │                   applied via                              │
└─────────────┘                                                            ▼
       │                                                            ┌─────────────┐
       └──────────────────────────────────────────────────────────► │  Database   │
                                                                    └─────────────┘
```

**Key insight:** The arrow from Database → Schema (introspection) should **never** occur in a schema-first project after initial setup.

### 6.2 Environment Routing Discipline

```
┌────────────────────────────────────────────────────────────────┐
│                    Environment Routing                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   .env              .env.test           CI/CD                  │
│     │                   │                 │                    │
│     ▼                   ▼                 ▼                    │
│  DATABASE_URL     DATABASE_URL_TEST   DATABASE_URL             │
│     │                   │                 │                    │
│     ▼                   ▼                 ▼                    │
│  Dev Database      Test Database     Prod Database             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Rule:** Never assume `prisma migrate status` reflects the database your application will actually use.

### 6.3 Recovery Priority Order

When schema drift is detected:

1. **Do NOT** run `db pull` to "see what the database has"
2. **Do NOT** modify application code to match introspected names
3. **DO** restore the schema from version control
4. **DO** identify which database is out of sync
5. **DO** apply migrations to the correct database

---

## 7. Lessons Learned

### 7.1 Technical Lessons

| Lesson | Rationale |
|--------|-----------|
| Schema is source of truth | Code depends on schema-generated types; reversing this breaks the contract |
| Migrations are append-only | Never edit or delete applied migrations |
| Test DB isolation is critical | Shared databases cause cross-environment pollution |
| Introspection is for brownfield only | Schema-first projects must never re-introspect |

### 7.2 Process Lessons

| Lesson | Rationale |
|--------|-----------|
| Document dangerous commands | Developers may not know `db pull` risks |
| Automate environment setup | Manual steps lead to drift |
| Validate after recovery | Type check + test suite must both pass |

### 7.3 Academic Relevance

This case study demonstrates:

1. **Systematic debugging:** Layer-by-layer isolation of root cause
2. **Architectural reasoning:** Understanding ORM contract semantics
3. **Engineering discipline:** Prioritizing correctness over expediency
4. **Documentation practices:** Converting incidents into preventive knowledge

---

## 8. Conclusion

Schema drift in Prisma-based systems represents a class of subtle bugs where:

- Tooling reports success (`migrate status: up to date`)
- Runtime fails (`table does not exist`)
- The root cause is semantic, not syntactic

The resolution requires understanding that **schema defines intent** and that introspection, while useful for brownfield adoption, is destructive in schema-first workflows.

By documenting this incident and implementing preventive measures, we establish a reproducible recovery methodology and contribute to the engineering knowledge base for ORM-based system development.

---

## Appendix A: Command Reference

### Safe Commands (Schema-First)

```bash
# Create new migration from schema changes
npx prisma migrate dev --name descriptive_name

# Apply existing migrations (CI/CD, test DB)
npx prisma migrate deploy

# Regenerate client after schema changes
npx prisma generate

# Check migration status
npx prisma migrate status

# Format schema file
npx prisma format
```

### Dangerous Commands (Avoid in Schema-First Projects)

```bash
# ❌ Overwrites schema with introspected database structure
npx prisma db pull

# ❌ Same as above, bypasses safety prompts
npx prisma db pull --force

# ⚠️ Use with caution - resets database and re-applies migrations
npx prisma migrate reset
```

---

## Appendix B: Diagnostic Checklist

When tests fail with "table does not exist":

- [ ] Check which `DATABASE_URL` the failing process uses
- [ ] Compare to `prisma migrate status` database
- [ ] If different, apply migrations to the correct database
- [ ] Verify schema has not been overwritten by introspection
- [ ] Run full validation: `format` → `generate` → `tsc` → `vitest`

---

## References

1. Prisma Documentation: Schema-First Development
2. Prisma Documentation: Introspection
3. Conference Master Engineering Change Log
4. TypeScript Strict Mode Configuration

---

*Document Version: 1.0*  
*Last Updated: 2026-01-10*  
*Classification: Thesis Appendix — Engineering Case Study*
