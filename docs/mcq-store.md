# Technical MCQ Store

How the Technical MCQs module stores and persists its questions.

## Source of truth

**Postgres.** The `mcq_tests` and `mcq_questions` tables are authoritative.

```
backend/data/mcq-tests-store.json   derived cache / offline fallback only
mcq_tests + mcq_questions           authoritative
question_bank_entries               anti-duplication registry (separate concern)
```

Before this change the JSON file was the only store and the two tables were
dead weight — nothing at runtime ever read them.

## Why it changed

Three problems, all found by auditing the two stores against each other:

1. **The tables were stale.** 101 test rows held 119 of 3,024 questions; 80 of
   the 101 tests had *zero* question rows. Nothing read them, so nobody noticed.
2. **The JSON file is an ephemeral-host liability.** It lives on the container
   filesystem. Any test generated at runtime through the admin API was lost on
   the next Railway deploy, and each write rewrote the whole ~5.8 MB file.
3. **The reason the import never completed** was 15 duplicate question *ids*
   inside the JSON store — collisions with *different* question text, not
   duplicates. `mcq_questions.id` is the primary key, so `createMany` aborted and
   each failure left that test with no rows at all.

## Root cause of the id collisions

`mcq.service.ts` minted ids as `mcq-{target}-t{testNumber}-q{i}`, where `i` is the
index **within one generation batch**. A test assembled in two passes — a
15-question seed followed by a top-up — restarted the counter and produced the
same id for different questions.

`buildQuestionId()` now mixes the content fingerprint into the id, so an id is a
function of what the question *is*:

```
mcq-{target}-t{testNumber}-q{index}-{fingerprint8}
```

Distinct questions cannot collide, and regenerating an identical question yields
an identical id, so regeneration stays idempotent.

`withUniqueIds()` in `mcq-store-db.ts` is a second line of defence: it re-numbers
colliding ids on the way into the database, so no future collision can ever cost a
test its entire question set.

## Read path

`mcq.service.ts` keeps the whole store in an in-memory `Map` so the many
synchronous read helpers stay synchronous. That map is hydrated once at boot:

1. `initializeTestStore()` runs at module import and loads the JSON file, seeding
   a missing Test 1 for any technology or company that has none.
2. `hydrateTestStoreFromDb()` runs before `server.listen()` in `src/index.ts` and
   replaces the map contents with the database rows.

Postgres wins. If it is unreachable, empty, or the `mcq_tests` migration has not
been applied, the JSON file stays in charge and the app boots normally — the
hydration logs a warning and never throws.

### Self-healing

If a test exists in the JSON file with *more* questions than its database row, the
database row is treated as stale and repaired from the JSON. This is what healed
the tables left behind by the incomplete import, and it means the store converges
on its own after any bad write.

## Write path

Every mutation goes through `commitStore()`, which writes the JSON cache and then
writes through to Postgres:

| Function | Database effect |
|---|---|
| `createNewTest` | upsert test + replace its questions |
| `updateTest` | upsert test + replace its questions |
| `deleteTest` | delete test (questions cascade) |
| `addQuestionToTest` | upsert test + replace its questions |
| `deleteQuestionFromTest` | upsert test + replace its questions |
| `initializeTestStore` | upsert only the tests it just seeded |
| `batchAddTestsToOneEach` | one write-through per generated test |

Question rows are replaced wholesale rather than merged: the in-memory test is
the source of truth for its own contents, so a partial merge would leave orphans
behind.

The write-through is fire-and-forget (`void persistTestToDb(...)`) and
failure-tolerant. A database outage degrades to JSON-only service rather than
failing the admin request that triggered the write.

## Operating notes

**Do not run more than one backend process against one database.** Each process
holds its own copy of the store in memory, and the JSON file is a single shared
file — the last writer wins, so a mutation in one process can be reverted by a
save from another. This is why `hydrateTestStoreFromDb()` deliberately does *not*
rewrite the JSON file: doing so let a starting process silently clobber a
repair another process had just made.

**The JSON file is not a backup target for the import script.** Stop the backend
before pointing `scripts/import-mcq-to-postgres.ts --apply` at it, otherwise a
running backend overwrites your restore with its own in-memory state.

## Maintenance commands

```bash
# Audit the database store (read-only)
npx ts-node scripts/import-mcq-to-postgres.ts            # dry run + validation report

# Reconcile the database from the JSON file (stop the backend first)
npx ts-node scripts/import-mcq-to-postgres.ts --apply
```

The import script is idempotent — upsert by test id, replace the question set —
so re-running it is safe.

## Related

- Anti-duplication across aptitude and MCQ lives in `question_bank_entries` and is
  managed by `src/services/question-bank.service.ts`. It is independent of this
  store and is populated from both sources.
- The aptitude engine needs none of this: `AptitudeTopicTest` was already in
  Postgres and `aptitude-test-bank.service.ts` reads and writes it directly.
