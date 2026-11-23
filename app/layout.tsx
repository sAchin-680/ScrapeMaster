import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import AnnouncementBar from '@/components/AnnouncementBar';
import Footer from '@/components/Footer';
import { PreferencesProvider } from '@/components/PreferencesProvider';
import { getRates } from '@/lib/fx';
import { buildAnnouncements } from '@/lib/announcements';
import { getActiveSales } from '@/lib/data/sales';
import { getPriceSignals } from '@/lib/data/signals';
import {
  type CountryCode,
  CURRENCIES,
  DEFAULT_PREFERENCES,
  getCountry,
  regionForCountry,
} from '@/lib/locale';
import { saleSignalFeed } from '@/lib/services/store-feed';
import { filterSalesFor } from '@/lib/sales';
import { withTimeout } from '@/lib/utils/timeout';
import { siteConfig } from '@/lib/site';
import './globals.css';

// Self-hosted at build time as Latin-subset woff2.
const sans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

// Used for a few small labels below the fold, so it is not preloaded.
const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: 'website',
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#06070e' },
  ],
};

type ActiveSales = Awaited<ReturnType<typeof getActiveSales>>;
type PriceSignals = Awaited<ReturnType<typeof getPriceSignals>>;

/** Banners for the announcement bar, read at request time rather than during render. */
function siteAnnouncements(sales: ActiveSales, signals: PriceSignals, code: CountryCode) {
  return buildAnnouncements(
    filterSalesFor(sales, code, Date.now(), 21),
    signals,
    // peek() never blocks rendering; banners appear once the feed has loaded.
    saleSignalFeed(regionForCountry(code)).peek()?.data.signals ?? [],
  );
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // No cookies or headers here: the layout must stay static so pages can be
  // served from the CDN. Announcements target the default marketplace.
  const country = getCountry(DEFAULT_PREFERENCES.country);
  const [rates, sales, signals] = await Promise.all([
    getRates(),
    // Announcements are optional: never let them hold up a page.
    withTimeout(getActiveSales(), 3_000, []),
    withTimeout(getPriceSignals(CURRENCIES[country.currency].symbol.trim()), 3_000, {
      drops: [],
      waves: [],
    }),
  ]);
  const announcements = siteAnnouncements(sales, signals, country.code);

  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <PreferencesProvider rates={rates}>
          <AnnouncementBar items={announcements} />
          <Navbar />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer />
        </PreferencesProvider>
      </body>
    </html>
  );
}
