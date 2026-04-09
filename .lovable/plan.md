

## Plan: Fix Remesa Duplicate Folio + Comments Not Loading

### Problem 1: Duplicate `internal_folio` on remesa creation
The `RemesaForm` creates multiple remesas via `Promise.all`, calling `generate_internal_folio` RPC concurrently. Each parallel call sees the same MAX folio number, producing duplicates that violate the unique constraint.

**Fix**: Change `Promise.all` to a sequential loop (`for...of`) so each folio is generated and committed before the next one starts. This ensures `generate_internal_folio` always sees the previously inserted folio.

**File**: `src/components/tramites/RemesaForm.tsx` (~lines 73-93)

### Problem 2: Comments query fails (400 error)
The `useReviewComments` query uses `profiles:created_by(nombre)` — a PostgREST embedded join that requires a foreign key. The `review_comments` table has no FK on `created_by → profiles.id`, so the query returns a 400 error. This means comments are never loaded in the UI, PDF, or copy function.

**Fix**: Add a database migration to create the missing foreign key:
```sql
ALTER TABLE public.review_comments
  ADD CONSTRAINT review_comments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);
```

**No code changes needed** — once the FK exists, the existing query `profiles:created_by(nombre)` will work correctly and comments will appear in the list, PDF, and copy output.

### Summary of changes
1. **Migration**: Add FK `review_comments.created_by → profiles.id`
2. **Code edit**: `RemesaForm.tsx` — replace `Promise.all` with sequential loop for folio generation

