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
  manifest: "/manifest.json?v=3",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icon-192.png?v=3"],
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
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
        url: "/icon-512.png?v=3",
        width: 512,
        height: 512,
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
    images: ["/icon-512.png?v=3"],
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
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="manifest" href="/manifest.json?v=3" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Lao:wght@300;400;500;600;700&family=Noto+Sans+Lao+Looped:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SUSU Lucky" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SUSU Lucky" />
        <meta name="theme-color" content="#08080c" />
      </head>
      <body>
        <AuthProvider>
          <NavigationShell>{children}</NavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
