import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';
import { DEMO_URL, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site-config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — a mini-ERP built with React 19`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'ERP',
    'React',
    'TanStack',
    'TypeScript',
    'MSW',
    'procure-to-pay',
    'order-to-cash',
    'Vietnam',
    'VAS',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — a mini-ERP built with React 19`,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1720' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <header className="site">
          <div className="wrap">
            <Link className="brand" href="/">
              {SITE_NAME}
            </Link>
            <nav aria-label="Main">
              <Link href="/case-study">Case study</Link>
              <Link href="/architecture">Architecture</Link>
              <a href={REPO_URL}>Source</a>
              {DEMO_URL ? <a href={DEMO_URL}>Live demo</a> : null}
            </nav>
          </div>
        </header>
        <main id="content">
          <div className="wrap">{children}</div>
        </main>
        <footer className="site">
          <div className="wrap">
            <p>
              {SITE_NAME} is a portfolio project. All data is fictional and generated in your
              browser; nothing here is real accounting, tax or e-invoice software.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
