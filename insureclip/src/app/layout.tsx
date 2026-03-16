import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InsureClip – AI Video Studio for Insurance Agents',
  description:
    'Create compliant insurance videos in under 2 minutes. AI-powered script generation, avatar clone, and multi-platform export for HK insurance agents.',
  keywords: 'insurance video, AI video, insurance agent, Hong Kong, VHIS, financial advisor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
