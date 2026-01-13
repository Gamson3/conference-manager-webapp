# Client Integration Guidance: Participants & Submissions (with Pagination)

This guide shows how to consume the updated API list endpoints with optional pagination from the Next.js client.

Key endpoints:
- GET `/api/conferences/:id/participants` (organizer/admin)
- GET `/api/conferences/:id/submissions` (organizer/admin get all; user sees own)

Pagination is optional and backwards-compatible:
- If `page`/`pageSize` are omitted: the full array is returned (legacy behavior).
- If provided: the response body still contains an array of items (the current page) and headers carry pagination meta:
  - `X-Total-Count`: total matching items
  - `X-Page`: current page (1-based)
  - `X-Page-Size`: effective page size (max 100)

## Axios client
The project uses an Axios instance at `src/lib/api/client.ts` which automatically attaches Cognito tokens and handles 401/403.

```ts
// src/lib/api/client.ts (already exists)
import apiClient from '@/lib/api/client';
```

## Helper: typed pagination fetcher
Create a small utility to fetch paginated lists and normalize the response into `{ items, total, page, pageSize }`.

```ts
// Example usage snippet (put in a feature file or shared API util)
import apiClient from '@/lib/api/client';

export type PageMeta = { total: number; page: number; pageSize: number };
export type PagedResult<T> = { items: T[]; meta: PageMeta };

function parseMeta(headers: any, fallbackCount: number, page: number, pageSize: number): PageMeta {
  const total = Number(headers['x-total-count'] ?? fallbackCount ?? 0);
  const currentPage = Number(headers['x-page'] ?? page ?? 1);
  const currentSize = Number(headers['x-page-size'] ?? pageSize ?? 20);
  return { total, page: currentPage, pageSize: currentSize };
}

export async function fetchParticipants(
  conferenceId: number,
  opts: { role?: string; status?: string; page?: number; pageSize?: number } = {}
): Promise<PagedResult<any>> {
  const params = new URLSearchParams();
  if (opts.role) params.set('role', opts.role);
  if (opts.status) params.set('status', opts.status);
  if (opts.page != null) params.set('page', String(opts.page));
  if (opts.pageSize != null) params.set('pageSize', String(opts.pageSize));

  const url = `/api/conferences/${conferenceId}/participants?` + params.toString();
  const res = await apiClient.get(url);
  const items = res.data as any[];
  const meta = parseMeta(res.headers, items.length, opts.page ?? 1, opts.pageSize ?? 20);
  return { items, meta };
}

export async function fetchSubmissions(
  conferenceId: number,
  opts: { page?: number; pageSize?: number } = {}
): Promise<PagedResult<any>> {
  const params = new URLSearchParams();
  if (opts.page != null) params.set('page', String(opts.page));
  if (opts.pageSize != null) params.set('pageSize', String(opts.pageSize));

  const url = `/api/conferences/${conferenceId}/submissions?` + params.toString();
  const res = await apiClient.get(url);
  const items = res.data as any[];
  const meta = parseMeta(res.headers, items.length, opts.page ?? 1, opts.pageSize ?? 20);
  return { items, meta };
}
```

Notes:
- For server-side environments (RSC/route handlers), ensure cookies/headers are forwarded if needed. The default Axios client attaches tokens when available in the browser. For SSR, consider passing an Authorization header if necessary.

## Example: Organizer Participants Page
```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchParticipants } from '@/lib/api/pagination'; // if you move helpers into this path

export default function ParticipantsList({ conferenceId }: { conferenceId: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<{ items: any[]; meta: { total: number; page: number; pageSize: number } }>();

  useEffect(() => {
    fetchParticipants(conferenceId, { page, pageSize, role: 'attendee' }).then(setData);
  }, [conferenceId, page, pageSize]);

  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2>Participants</h2>
      <p>{total} total</p>
      <ul>
        {data?.items.map(p => (
          <li key={p.id}>{p.user?.name} — {p.role} ({p.status})</li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page} / {pageCount}</span>
        <button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}
```

## Example: Author Submissions List (visibility applied by server)
```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchSubmissions } from '@/lib/api/pagination';

export default function MySubmissions({ conferenceId }: { conferenceId: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: any[]; meta: { total: number; page: number; pageSize: number } }>();

  useEffect(() => {
    fetchSubmissions(conferenceId, { page, pageSize: 10 }).then(setData);
  }, [conferenceId, page]);

  return (
    <div>
      <h2>My submissions</h2>
      <ul>
        {data?.items.map(s => (
          <li key={s.id}><b>{s.title}</b> — {s.status}</li>
        ))}
      </ul>
      <div>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <button disabled={(data?.items?.length ?? 0) < (data?.meta?.pageSize ?? 10)} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}
```

## Optional: TanStack Query / Infinite Scroll
If you use TanStack Query, wrap the fetchers with `useQuery`/`useInfiniteQuery` using `(pageParam)` and stop when `page * pageSize >= total`.

## Error handling
Use `handleApiError(error)` from `src/lib/api/client.ts` to present user-friendly messages.

## Where to place helpers
- You may create `src/lib/api/pagination.ts` and paste the helper functions there, or collocate near each feature in `features/*/api`.
- Update imports in pages/components accordingly.

---
This doc reflects the new pagination headers and is safe to adopt incrementally—existing calls without `page`/`pageSize` still receive full arrays.
