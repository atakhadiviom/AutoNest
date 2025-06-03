
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AutoNest - Automate Your Workflows',
  description: 'AI-powered workflow automation by AutoNest',
  icons: {
    icon: [
      { url: '/img/favicon/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/img/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/img/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      // Assuming you might have a general purpose PNG icon as well
      // If your AUTONEST.png is meant to be the main one and is, for example, 192x192:
      // { url: '/img/favicon/AUTONEST.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/img/favicon/apple-touch-icon.png', type: 'image/png' },
    ],
    shortcut: [
      { url: '/img/favicon/favicon.ico' },
    ],
    // Add other icons like Android chrome icons if you have them, e.g.:
    // other: [
    //   { rel: 'android-chrome-192x192', url: '/img/favicon/android-chrome-192x192.png', sizes: '192x192' },
    //   { rel: 'android-chrome-512x512', url: '/img/favicon/android-chrome-512x512.png', sizes: '512x512' },
    // ],
  },
  manifest: '/img/favicon/site.webmanifest', // Add this if you have a manifest file
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
