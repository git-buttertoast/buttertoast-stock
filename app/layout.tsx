import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stock | Butter Toast',
  description: 'HR system of record',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
