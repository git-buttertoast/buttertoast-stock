import type { Metadata } from 'next'
import './globals.css'

// Indigo #4338ca background, cream bracket marks -- same SVG favicon pattern as all apps
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#4338ca"/><rect x="6" y="8" width="3" height="16" rx="1" fill="#F0EAD6"/><rect x="6" y="8" width="8" height="3" rx="1" fill="#F0EAD6"/><rect x="6" y="21" width="8" height="3" rx="1" fill="#F0EAD6"/><rect x="23" y="8" width="3" height="16" rx="1" fill="#F0EAD6"/><rect x="18" y="8" width="8" height="3" rx="1" fill="#F0EAD6"/><rect x="18" y="21" width="8" height="3" rx="1" fill="#F0EAD6"/></svg>`
const faviconB64 = Buffer.from(faviconSvg).toString('base64')


export const metadata: Metadata = {
  title: 'Stock | Butter Toast',
  description: 'HR system of record',
  icons: { icon: `data:image/svg+xml;base64,${faviconB64}` },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
