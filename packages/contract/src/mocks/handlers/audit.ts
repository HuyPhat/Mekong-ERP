import { http, HttpResponse } from 'msw';
import { auditLogStore } from '../../db/store';
import { ensureSeeded } from '../../seed';
import { applySort, matchesSearch, paginate, parseListParams } from '../../list-query';

/** Shared by every action handler that changes a document's status. */
export async function writeAudit(
  entityType: string,
  entityId: string,
  entityNumber: string,
  action: string,
  actorId: string,
  before: string | undefined,
  after: string,
  at: string,
): Promise<void> {
  await auditLogStore.put({
    id: crypto.randomUUID(),
    entityType,
    entityId,
    entityNumber,
    action,
    actorId,
    ...(before !== undefined ? { before: { status: before } } : {}),
    after: { status: after },
    at,
  });
}

export const auditHandlers = [
  http.get('/api/audit-log', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [{ field: 'at', direction: 'desc' }]);
    const entityType = url.searchParams.get('filter[entityType]');
    const entityId = url.searchParams.get('filter[entityId]');

    let items = auditLogStore.list();
    if (entityType) items = items.filter((entry) => entry.entityType === entityType);
    if (entityId) items = items.filter((entry) => entry.entityId === entityId);
    items = items.filter((entry) => matchesSearch(entry, q, ['entityNumber', 'action', 'actorId']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),
];
