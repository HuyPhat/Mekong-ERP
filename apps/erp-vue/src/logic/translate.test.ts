import { describe, expect, it } from 'vitest';
import { translate } from './translate';

const messages = {
  greeting: 'Hello {{name}}',
  twice: '{{a}} and {{a}}',
  items_one: '{{count}} item',
  items_other: '{{count}} items',
  lonely_other: '{{count}} lonely',
  plain: 'Plain',
};

describe('translate', () => {
  it('fills placeholders, each occurrence', () => {
    expect(translate(messages, 'en', 'greeting', { name: 'An' })).toBe('Hello An');
    expect(translate(messages, 'en', 'twice', { a: 7 })).toBe('7 and 7');
  });

  it('leaves a placeholder it has no value for, so a gap shows', () => {
    expect(translate(messages, 'en', 'greeting')).toBe('Hello {{name}}');
  });

  it('chooses the plural form for the language', () => {
    expect(translate(messages, 'en', 'items', { count: 1 })).toBe('1 item');
    expect(translate(messages, 'en', 'items', { count: 2 })).toBe('2 items');
    expect(translate(messages, 'en', 'items', { count: 0 })).toBe('0 items');
  });

  it('uses the one form a language has (Vietnamese has no plural)', () => {
    expect(translate(messages, 'vi', 'lonely', { count: 1 })).toBe('1 lonely');
    expect(translate(messages, 'vi', 'lonely', { count: 5 })).toBe('5 lonely');
  });

  it('falls back to the bare key, then to the key itself when nothing is defined', () => {
    expect(translate(messages, 'en', 'plain', { count: 3 })).toBe('Plain');
    expect(translate(messages, 'en', 'missing.key')).toBe('missing.key');
  });
});
