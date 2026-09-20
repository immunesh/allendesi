import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = {
  title: {
    default: 'Allendesi — Premium Hair Wigs for Men & Women',
    template: '%s | Allendesi',
  },
  description:
    "India's #1 hair wig brand. Shop premium human hair wigs, synthetic wigs, and hair systems for men and women. Free shipping above ₹999.",
  keywords: [
    'hair wigs',
    'human hair wigs',
    'synthetic wigs',
    "men's hair system",
    "women's wigs",
    'lace front wigs',
    'Allendesi',
    'buy wigs online India',
  ],
  authors: [{ name: 'Allendesi' }],
  metadataBase: new URL('http://localhost:3000'),
  creator: 'Allendesi Technologies',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Allendesi',
    title: 'Allendesi — Premium Hair Wigs for Men & Women',
    description:
      "India's #1 hair wig brand — premium human hair wigs & systems for men and women.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Allendesi — Premium Hair Wigs',
    description: "India's #1 hair wig brand.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c855f5',
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