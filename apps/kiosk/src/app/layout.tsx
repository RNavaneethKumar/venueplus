import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({})

export const metadata: Metadata = {
  title: 'VenuePlus — Self-Service Kiosk',
  description: 'Buy tickets and more',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white antialiased overflow-hidden`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
