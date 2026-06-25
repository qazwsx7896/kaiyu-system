import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: '凱淯內勤生產系統',
  description: '訂單生產看板管理系統',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '凱淯生產',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#378ADD',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  )
}
