import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = {
  title: {
    default: 'Allendesi | Premium E-commerce Marketplace',
    template: '%s | Allendesi',
  },
  description:
    'Shop products across fashion, beauty, home, food, wellness, and more from Allendesi sellers. Free shipping above ₹999.',
  keywords: [
    'online shopping India',
    'fashion and lifestyle',
    'home and kitchen',
    'beauty and personal care',
    'marketplace',
    'Allendesi',
    'shop online India',
  ],
  authors: [{ name: 'Allendesi' }],
  metadataBase: new URL('http://localhost:3000'),
  creator: 'Allendesi Technologies',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Allendesi',
    title: 'Allendesi | Premium E-commerce Marketplace',
    description: 'Discover products across fashion, beauty, home, food, wellness, and more on Allendesi.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Allendesi | Premium E-commerce Marketplace',
    description: 'Shop fashion, beauty, home, food, wellness, and more on Allendesi.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>

      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}