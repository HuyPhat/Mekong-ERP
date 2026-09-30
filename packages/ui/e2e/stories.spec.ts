import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: 'story' | 'docs';
}

const index = JSON.parse(
  readFileSync(new URL('../storybook-static/index.json', import.meta.url), 'utf8'),
) as { entries: Record<string, IndexEntry> };
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Storybook's a11y addon runs axe in the preview frame on every render, and
 * axe allows one run per frame at a time: ours can land in the middle of it
 * ("Axe is already running"). Its run takes a fraction of a second, so retry.
 */
async function analyze(page: Page) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await new AxeBuilder({ page }).withTags(TAGS).analyze();
    } catch (error) {
      if (attempt >= 20 || !String(error).includes('already running')) throw error;
      await page.waitForTimeout(250);
    }
  }
}

test('the build contains the stories', () => {
  expect(stories.length).toBeGreaterThan(30);
});

for (const theme of ['light', 'dark'] as const) {
  for (const story of stories) {
    test(`${story.title} / ${story.name} (${theme}) renders cleanly and passes axe`, async ({
      page,
    }) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${String(error)}`));
      // The console message for a failed request doesn't say which one.
      page.on('response', (response) => {
        if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
      });

      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
      // Storybook marks the preview body once a story (and its play function) has rendered.
      // (Not toBeVisible: an open modal locks the body's scroll, which Playwright reads as hidden.)
      await expect(page.locator('body')).toHaveClass(/sb-show-main/);
      await expect(page.locator('body')).not.toHaveClass(/sb-show-errordisplay/);
      // Colour contrast is read from computed styles, and components transition
      // their colours (150ms) when the theme class is applied after first render:
      // sampled mid-transition, dark text on a dark page reads as 1.39:1. Cancel
      // transitions and animations so axe sees the settled colours.
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });
      await page.evaluate(() => document.fonts.ready);

      const results = await analyze(page);
      const violations = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.slice(0, 3).map((node) => ({
          target: node.target.join(' '),
          // For contrast failures this carries both colours and the measured ratio.
          why: node.any[0]?.message ?? node.failureSummary,
        })),
      }));
      expect(violations, 'axe violations').toEqual([]);
      expect(problems, 'console/page errors').toEqual([]);
    });
  }
}
