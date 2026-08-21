import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavigationShell from "@/components/NavigationShell";

export const metadata: Metadata = {
  title: "SUSU Lucky — Advanced Lottery Statistical Intelligence",
  description:
    "Unlock mathematical insights from your lucky numbers and compare against official lottery draws with SUSU Lucky.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavigationShell>{children}</NavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
