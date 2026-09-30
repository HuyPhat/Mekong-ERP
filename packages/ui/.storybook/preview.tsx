import { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';
import './storybook.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      const dark = context.globals['theme'] === 'dark';
      // The apps switch theme by toggling `.dark` on <html>; do the same here.
      useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
      }, [dark]);
      return <Story />;
    },
  ],
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
