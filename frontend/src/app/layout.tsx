import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavigationShell from "@/components/NavigationShell";

export const viewport: Viewport = {
  themeColor: "#08080c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lucky.sengathid.com"),
  title: "SUSU Lucky — Advanced Lottery Statistical Intelligence",
  description:
    "Unlock mathematical insights from your lucky numbers and compare against official lottery draws with SUSU Lucky.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/app-logo.jpg", type: "image/jpeg" },
      { url: "/favicon.ico" },
    ],
    shortcut: ["/app-logo.jpg"],
    apple: [
      { url: "/app-logo.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SUSU Lucky",
  },
  openGraph: {
    title: "SUSU Lucky — Advanced Lottery Statistical Intelligence",
    description:
      "Unlock mathematical insights from your lucky numbers and compare against official lottery draws with SUSU Lucky.",
    siteName: "SUSU Lucky",
    images: [
      {
        url: "/app-logo.jpg",
        width: 1024,
        height: 1024,
        alt: "SUSU Lucky",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SUSU Lucky — Advanced Lottery Statistical Intelligence",
    description:
      "Unlock mathematical insights from your lucky numbers with SUSU Lucky.",
    images: ["/app-logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/app-logo.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/app-logo.jpg" />
        <link rel="icon" type="image/jpeg" href="/app-logo.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SUSU Lucky" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthProvider>
          <NavigationShell>{children}</NavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
