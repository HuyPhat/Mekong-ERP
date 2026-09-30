export type Lang = 'en' | 'vi';
export const LANGS: readonly Lang[] = ['vi', 'en'];

export type Params = Record<string, string | number>;

/**
 * Looks a message up and fills in its `{{name}}` placeholders. A `count` param picks
 * the plural form by the language's rules: `key_one`, `key_other` and so on, falling
 * back to `key_other` and then to `key`. A missing message comes back as its key, so a
 * gap is visible on screen rather than blank.
 */
export function translate(
  messages: Readonly<Record<string, string>>,
  lang: Lang,
  key: string,
  params: Params = {},
): string {
  let template = messages[key];
  const count = params['count'];
  if (typeof count === 'number') {
    const category = new Intl.PluralRules(lang).select(count);
    template = messages[`${key}_${category}`] ?? messages[`${key}_other`] ?? template;
  }
  if (template === undefined) return key;
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
