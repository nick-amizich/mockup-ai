import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mockup AI - AI-Powered Website Mockups',
  description:
    'Describe changes in plain English, see AI-powered visual mockups instantly, and generate developer-ready Claude Code prompts.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  )
}
