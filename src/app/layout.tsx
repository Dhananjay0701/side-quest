import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { getAuthProfile } from "@/lib/auth/session";
import {
  PWA_APP_NAME,
  PWA_BACKGROUND_COLOR,
  PWA_SHORT_NAME,
  PWA_THEME_COLOR,
} from "@/lib/pwa/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME_COLOR,
};

export const metadata: Metadata = {
  title: PWA_APP_NAME,
  description: "Discover hidden gems and unforgettable places",
  applicationName: PWA_APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: PWA_SHORT_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": PWA_SHORT_NAME,
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAuthProfile();

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content={PWA_THEME_COLOR} />
        <meta name="background-color" content={PWA_BACKGROUND_COLOR} />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1170-2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1284-2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1290-2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <PwaRegister />
        <AppHeader profile={profile} />
        <main className="mx-auto max-w-[1400px]">{children}</main>
      </body>
    </html>
  );
}
