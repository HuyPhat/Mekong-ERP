import { describe, expect, it } from 'vitest';
import {
  PAGE_SIZE,
  formatOpenDocument,
  parseInboxQuery,
  parseOpenDocument,
  serializeInboxQuery,
  toListParams,
  type InboxQuery,
} from './inbox-query';

describe('parseInboxQuery', () => {
  it('starts on the steps waiting to be decided, oldest first', () => {
    expect(parseInboxQuery({})).toEqual({
      status: 'pending',
      type: 'all',
      q: '',
      page: 1,
      sort: 'createdAt:asc',
      open: undefined,
    });
  });

  it('reads every part of a filtered, sorted, paged view', () => {
    expect(
      parseInboxQuery({
        status: 'approved',
        type: 'leave_request',
        q: '  LV-2026  ',
        page: '3',
        sort: 'createdAt:desc',
        open: 'leave_request:abc',
      }),
    ).toEqual({
      status: 'approved',
      type: 'leave_request',
      q: 'LV-2026',
      page: 3,
      sort: 'createdAt:desc',
      open: 'leave_request:abc',
    });
  });

  it('accepts "all" for status, which is not a step status', () => {
    expect(parseInboxQuery({ status: 'all' }).status).toBe('all');
  });

  it('falls back to the default for a value it does not know, rather than breaking', () => {
    const parsed = parseInboxQuery({ status: 'bogus', type: 'x', page: '0', sort: 'name:asc' });
    expect(parsed).toMatchObject({
      status: 'pending',
      type: 'all',
      page: 1,
      sort: 'createdAt:asc',
    });
    expect(parseInboxQuery({ page: 'abc' }).page).toBe(1);
    expect(parseInboxQuery({ page: '2.5' }).page).toBe(1);
  });

  it('takes the first of a repeated parameter, and ignores an empty one', () => {
    expect(parseInboxQuery({ status: ['rejected', 'approved'] }).status).toBe('rejected');
    expect(parseInboxQuery({ status: null, q: [] }).status).toBe('pending');
  });
});

describe('serializeInboxQuery', () => {
  const base = parseInboxQuery({});

  it('leaves a plain inbox with a plain address', () => {
    expect(serializeInboxQuery(base)).toEqual({});
  });

  it('writes only what differs from the defaults', () => {
    expect(serializeInboxQuery({ ...base, status: 'all', page: 2 })).toEqual({
      status: 'all',
      page: '2',
    });
    expect(serializeInboxQuery({ ...base, q: 'abc', sort: 'createdAt:desc' })).toEqual({
      q: 'abc',
      sort: 'createdAt:desc',
    });
  });

  it('round-trips a view through the address bar', () => {
    const view: InboxQuery = {
      status: 'changes_requested',
      type: 'purchase_order',
      q: 'Sông Tiền',
      page: 4,
      sort: 'createdAt:desc',
      open: 'purchase_order:po-1',
    };
    expect(parseInboxQuery(serializeInboxQuery(view))).toEqual(view);
    expect(parseInboxQuery(serializeInboxQuery(base))).toEqual(base);
  });
});

describe('toListParams', () => {
  const view = parseInboxQuery({});

  it('asks for the viewer role’s pending steps, a page at a time', () => {
    expect(toListParams(view, 'approver_manager')).toEqual({
      page: 1,
      pageSize: PAGE_SIZE,
      sort: 'createdAt:asc',
      filters: { status: 'pending', approverRole: 'approver_manager' },
    });
  });

  it('shows the admin login every role’s steps', () => {
    expect(toListParams(view, 'admin').filters).toEqual({ status: 'pending' });
    expect(toListParams(view, undefined).filters).toEqual({ status: 'pending' });
  });

  it('leaves out a filter that is set to "all", and a search that is empty', () => {
    const params = toListParams({ ...view, status: 'all', type: 'all' }, 'approver_director');
    expect(params.filters).toEqual({ approverRole: 'approver_director' });
    expect('q' in params).toBe(false);
  });

  it('passes the type, the search and the page on', () => {
    expect(toListParams({ ...view, type: 'leave_request', q: 'An', page: 3 }, 'admin')).toEqual({
      page: 3,
      pageSize: PAGE_SIZE,
      sort: 'createdAt:asc',
      q: 'An',
      filters: { status: 'pending', docType: 'leave_request' },
    });
  });
});

describe('the open document', () => {
  it('is written as <type>:<id> and read back', () => {
    const open = { docType: 'leave_request' as const, docId: '8f3a-11' };
    expect(formatOpenDocument(open)).toBe('leave_request:8f3a-11');
    expect(parseOpenDocument('leave_request:8f3a-11')).toEqual(open);
  });

  it('is nothing for a value that is not one', () => {
    expect(parseOpenDocument(undefined)).toBeUndefined();
    expect(parseOpenDocument('')).toBeUndefined();
    expect(parseOpenDocument('no-colon')).toBeUndefined();
    expect(parseOpenDocument('vendor_bill:abc')).toBeUndefined();
    expect(parseOpenDocument('leave_request:')).toBeUndefined();
  });
});
