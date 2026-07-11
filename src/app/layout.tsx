import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, Fraunces } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Providers } from "@/components/providers";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const APP_NAME = "The Hangar";
const APP_TITLE = "The Hangar — Home Monitor";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: "%s · The Hangar",
  },
  description:
    "Off-grid house monitoring & maintenance system for The Hangar, Upper Kangaroo River, NSW",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoNarrow.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-steel text-paper">
        <SerwistProvider swUrl="/serwist/sw.js">
          <Providers>
            <Nav />
            <main className="flex-1">{children}</main>
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  );
}
