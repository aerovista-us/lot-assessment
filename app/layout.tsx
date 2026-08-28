import type { Metadata } from "next";
import AeroVistaLocalBadge from "@/components/AeroVistaLocalBadge";
import UmamiAnalytics from "@/components/UmamiAnalytics";
import "./globals.css";
import "./guided.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lotscope.aerovista.us").replace(/\/$/, "");
const previewImage = `${siteUrl}/lotscope_preview.png`;
const logoImage = `${siteUrl}/lotscope_logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LotScope | Can I Build That Here?",
  description: "A fast early-feasibility screen for lot dimensions, setbacks, coverage, project size, garages and access constraints.",
  alternates: { canonical: siteUrl },
  icons: {
    icon: [{ url: logoImage, type: "image/png" }],
    shortcut: [{ url: logoImage, type: "image/png" }],
    apple: [{ url: logoImage, type: "image/png" }]
  },
  openGraph: {
    title: "LotScope — Can I Build That Here?",
    description: "Check setbacks, coverage, garages and access before they become redesigns. Early site feasibility by AeroVista Local.",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "LotScope",
    images: [
      {
        url: previewImage,
        width: 1731,
        height: 909,
        alt: "LotScope — Can I build that here? Early site feasibility by AeroVista Local."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "LotScope — Can I Build That Here?",
    description: "Check the lot constraints before they become redesigns.",
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
