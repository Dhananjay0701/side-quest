import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { getAuthProfile } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Random Sidequest",
  description: "Discover hidden gems and unforgettable places",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAuthProfile();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <AppHeader profile={profile} />
        <main className="mx-auto max-w-[1400px]">{children}</main>
      </body>
    </html>
  );
}
