import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import CustomCursor from '@/components/CustomCursor';
import BackgroundEffect from '@/components/BackgroundEffect';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'WebCopier - Clone Any Website Instantly | Free Website Downloader',
    description: 'Download complete websites for offline browsing. WebCopier is the modern website cloning solution with full asset preservation, link rewriting, and ZIP packaging. Clone single pages or entire sites in seconds.',
    keywords: [
        'website copier',
        'website cloner',
        'website downloader',
        'offline website',
        'modern website copier',
        'web crawler',
        'website mirror',
        'download website',
        'clone website',
        'website archiver',
        'offline browser',
        'web scraper'
    ],
    authors: [{ name: 'WebCopier' }],
    creator: 'WebCopier',
    publisher: 'WebCopier',
    robots: 'index, follow',
    openGraph: {
        title: 'WebCopier - Clone Any Website Instantly',
        description: 'Download complete websites for offline browsing. The modern website cloning solution with single-page and full-site cloning.',
        type: 'website',
        locale: 'en_US',
        siteName: 'WebCopier',
        images: [
            {
                url: '/images/dashboard-mockup.png',
                width: 1200,
                height: 630,
                alt: 'WebCopier Dashboard - Website Cloning Tool',
            }
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WebCopier - Clone Any Website Instantly',
        description: 'Download complete websites for offline browsing. The modern website cloning solution.',
        images: ['/images/dashboard-mockup.png'],
    },
    icons: {
        icon: '/images/logo.png',
        apple: '/images/logo.png',
    },
    manifest: '/manifest.json',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <link rel="canonical" href="https://webcopier.app" />
                <meta name="theme-color" content="#10B981" />
            </head>
            <body className={`${inter.className} antialiased min-h-screen`} style={{ background: '#050505' }}>
                <CustomCursor />
                <BackgroundEffect />
                {children}
            </body>
        </html>
    );
}
