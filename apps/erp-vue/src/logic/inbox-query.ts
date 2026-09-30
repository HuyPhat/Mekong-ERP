import {
  z,
  ApprovalDocTypeSchema,
  ApprovalStatusSchema,
  type ApprovalDocType,
  type ListParams,
} from '@mekong-erp/contract';

export const PAGE_SIZE = 25;

const SORTS = ['createdAt:asc', 'createdAt:desc'] as const;
export type InboxSort = (typeof SORTS)[number];

// What the inbox shows is a function of the address bar, so a filtered, sorted, paged
// view survives a reload and can be pasted to someone. A bad value falls back to its
// default rather than breaking the page.
const InboxQuerySchema = z.object({
  status: z.enum(['all', ...ApprovalStatusSchema.options]).catch('pending'),
  type: z.enum(['all', ...ApprovalDocTypeSchema.options]).catch('all'),
  q: z.string().trim().catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.enum(SORTS).catch('createdAt:asc'),
  // The document open in the side panel, as `<docType>:<docId>`.
  open: z.string().optional().catch(undefined),
});
export type InboxQuery = z.output<typeof InboxQuerySchema>;

const DEFAULTS = InboxQuerySchema.parse({});

/** A route's query values arrive as a string, a list of strings or null; take the first string. */
function firstString(value: unknown): string | undefined {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : undefined;
}

export function parseInboxQuery(raw: Record<string, unknown>): InboxQuery {
  return InboxQuerySchema.parse({
    status: firstString(raw['status']),
    type: firstString(raw['type']),
    q: firstString(raw['q']),
    page: firstString(raw['page']),
    sort: firstString(raw['sort']),
    open: firstString(raw['open']),
  });
}

/** The query as it goes in the URL: only what differs from the defaults, so a plain inbox has a plain address. */
export function serializeInboxQuery(query: InboxQuery): Record<string, string> {
  const out: Record<string, string> = {};
  if (query.status !== DEFAULTS.status) out['status'] = query.status;
  if (query.type !== DEFAULTS.type) out['type'] = query.type;
  if (query.q !== DEFAULTS.q) out['q'] = query.q;
  if (query.page !== DEFAULTS.page) out['page'] = String(query.page);
  if (query.sort !== DEFAULTS.sort) out['sort'] = query.sort;
  if (query.open) out['open'] = query.open;
  return out;
}

/**
 * The list request for a view. An approver sees the steps waiting on their own role.
 * The admin login holds no approver role but can decide any step, so it sees all of
 * them (the same rule as the React inbox).
 */
export function toListParams(query: InboxQuery, role: string | undefined): ListParams {
  return {
    page: query.page,
    pageSize: PAGE_SIZE,
    sort: query.sort,
    ...(query.q ? { q: query.q } : {}),
    filters: {
      ...(query.status !== 'all' ? { status: query.status } : {}),
      ...(query.type !== 'all' ? { docType: query.type } : {}),
      ...(role && role !== 'admin' ? { approverRole: role } : {}),
    },
  };
}

export interface OpenDocument {
  docType: ApprovalDocType;
  docId: string;
}

export function formatOpenDocument(document: OpenDocument): string {
  return `${document.docType}:${document.docId}`;
}

export function parseOpenDocument(open: string | undefined): OpenDocument | undefined {
  if (!open) return undefined;
  const at = open.indexOf(':');
  const docType = ApprovalDocTypeSchema.safeParse(open.slice(0, at));
  const docId = open.slice(at + 1);
  return docType.success && docId ? { docType: docType.data, docId } : undefined;
}
