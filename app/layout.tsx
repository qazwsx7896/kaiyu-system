import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '凱淯內勤生產系統',
  description: '訂單生產看板管理系統',
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