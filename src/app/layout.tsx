import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorBoundary from '@/components/ErrorBoundary';

const SITE_URL = "https://aegis.blackleets.dev";
const SITE_NAME = "AEGIS";
const SITE_TITLE = "AEGIS — Verified Global Intelligence Surface";
const SITE_DESCRIPTION = "Original intelligence surface for live flights, satellites, CCTV, seismic, markets and cyber telemetry. Correlate public signals, generate operator-ready briefings, and run in local mode or with your own AI key.";

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | AEGIS",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "OSINT tools", "global monitoring", "live tracking", "recon platform", "threat intelligence",
    "flight tracker", "satellite tracking", "CCTV monitoring", "earthquake monitor", "cyber threats dashboard",
    "open source intelligence", "geospatial intelligence", "intelligence dashboard", "operator dashboard",
    "AEGIS", "aegis", "aegis blackleets"
  ],
  authors: [{ name: "AEGIS Project", url: SITE_URL }],
  creator: "AEGIS Project",
  publisher: "AEGIS Project",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/favicon.svg" }],
    shortcut: "/favicon.svg",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "AEGIS — Verified Global Intelligence Surface",
    description: "Track flights, satellites, CCTV, seismic events, markets and cyber signals in one operator-grade interface with a distinct AEGIS identity.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AEGIS verified global intelligence surface",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AEGIS — Verified Global Intelligence Surface",
    description: "Monitor the world live across flights, satellites, CCTV, seismic, markets and cyber signals with an original AEGIS shell.",
    images: [`${SITE_URL}/og-image.png`],
  },
  category: "technology",
  classification: "Monitoring & Intelligence",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "AEGIS",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#06060C",
    "msapplication-config": "none",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AEGIS — Verified Global Intelligence Surface",
  alternateName: ["AEGIS", "AEGIS Intel Surface", "AEGIS Command Surface"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern web browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Live global monitoring dashboard",
    "Flight, satellite, CCTV and seismic tracking",
    "Browser-native recon workflows",
    "Cyber and threat intelligence overlays",
    "Operator briefings and fusion dossiers",
    "Zero-cost local analysis mode",
    "Bring-your-own-key AI mode"
  ],
  screenshot: `${SITE_URL}/og-image.png`,
  author: {
    "@type": "Organization",
    name: "AEGIS Project",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="canonical" href={SITE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary name="AEGIS Core">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
