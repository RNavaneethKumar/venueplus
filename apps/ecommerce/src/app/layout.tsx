import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Header from '@/components/Header'
import './globals.css'

const inter = Inter({})

export const metadata: Metadata = {
  title: 'FunZone — Book Tickets Online',
  description: 'Book tickets, memberships, and more at FunZone Family Entertainment Centre',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <Header />
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
