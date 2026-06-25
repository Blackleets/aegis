import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorBoundary from '@/components/ErrorBoundary';

const SITE_URL = "https://worldwatch.blackleets.dev";
const SITE_NAME = "WorldWatch";
const SITE_TITLE = "WorldWatch — Global Monitoring Platform | Live Tracking, Recon & Intelligence";
const SITE_DESCRIPTION = "Global monitoring and recon platform for live flight, satellite, CCTV, seismic and cyber signals. Correlate public telemetry, generate operator-ready briefings, and let each user bring their own AI key or run in zero-cost local mode.";

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
    template: "%s | WorldWatch",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "OSINT tools", "global monitoring", "live tracking", "recon platform", "threat intelligence",
    "flight tracker", "satellite tracking", "CCTV monitoring", "earthquake monitor", "cyber threats dashboard",
    "open source intelligence", "geospatial intelligence", "intelligence dashboard", "operator dashboard",
    "WorldWatch", "worldwatch", "worldwatch blackleets"
  ],
  authors: [{ name: "WorldWatch Project", url: SITE_URL }],
  creator: "WorldWatch Project",
  publisher: "WorldWatch Project",
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
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
    other: [{ rel: "apple-touch-icon-precomposed", url: "/apple-touch-icon.png" }],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "WorldWatch — Live Global Monitoring, Recon & Intelligence",
    description: "Track flights, satellites, CCTV, seismic events, markets and cyber signals in one operator-grade interface. Run free in local mode or let users attach their own AI key.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "WorldWatch global monitoring platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "🛰️ WorldWatch — Global Monitoring + Recon Platform",
    description: "Watch the world live across flights, satellites, CCTV, seismic and cyber signals. Zero-cost local mode plus optional BYOK AI.",
    images: [`${SITE_URL}/og-image.png`],
  },
  category: "technology",
  classification: "Monitoring & Intelligence",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "WorldWatch",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#06060C",
    "msapplication-config": "none",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WorldWatch — Global Monitoring & Recon Platform",
  alternateName: ["WorldWatch", "WorldWatch OSINT", "WorldWatch Recon"],
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
    name: "WorldWatch Project",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="canonical" href={SITE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary name="WorldWatch Core">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
