import type { Metadata } from "next";
import AeroVistaLocalBadge from "@/components/AeroVistaLocalBadge";
import UmamiAnalytics from "@/components/UmamiAnalytics";
import "./globals.css";
import "./guided.css";
import "./architecture.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lotscope.aerovista.us").replace(/\/$/, "");
const previewImage = `${siteUrl}/opengraph-image`;
const logoImage = `${siteUrl}/lotscope_logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LotScope | Architectural Site Planning & Lot Feasibility",
  description: "Study parcel boundaries, test conceptual building programs and setbacks, compare options and understand what needs professional verification. By AeroVista Local.",
  alternates: { canonical: siteUrl },
  icons: {
    icon: [{ url: logoImage, type: "image/png" }],
    shortcut: [{ url: logoImage, type: "image/png" }],
    apple: [{ url: logoImage, type: "image/png" }]
  },
  openGraph: {
    title: "LotScope — Every Great Build Starts With the Lot",
    description: "Parcel-aware site planning, transparent feasibility, conceptual building programs and traceable design decisions. By AeroVista Local.",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "LotScope",
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "LotScope architectural site study with parcel, setbacks and indicative building program."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "LotScope — Every Great Build Starts With the Lot",
    description: "Every great build starts with the lot. Study site geometry and compare conceptual programs.",
    images: [previewImage]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AeroVistaLocalBadge />
        <UmamiAnalytics />
      </body>
    </html>
  );
}
