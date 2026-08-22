import type { Metadata } from "next";
import AeroVistaLocalBadge from "@/components/AeroVistaLocalBadge";
import UmamiAnalytics from "@/components/UmamiAnalytics";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lotscope.aerovista.us";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LotScope | Can I Build That Here?",
  description: "A fast early-feasibility screen for lot dimensions, setbacks, coverage, project size, garages and access constraints.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LotScope — Can I Build That Here?",
    description: "Check the lot constraints before they become redesigns. Early site feasibility by AeroVista Local.",
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "LotScope",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "LotScope — Can I Build That Here?" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "LotScope",
    description: "A fast early-feasibility screen for residential lots.",
    images: ["/opengraph-image"]
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
