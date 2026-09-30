import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // a11y runs axe on every story; docs builds the autodocs pages from the props.
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  // Builds and dev servers make no outbound calls.
  core: { disableTelemetry: true },
  // The components are styled with Tailwind utilities, so the preview needs the
  // same plugin the apps use.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [tailwindcss()] }),
};

export default config;
