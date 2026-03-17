// =============================================================================
// GET /api/device/env-key
//
// Server-side Next.js route that exposes DEVICE_LICENSE_KEY to the browser
// without baking it into the JS bundle (unlike NEXT_PUBLIC_* vars).
//
// The activate page calls this on mount: if a key is returned it auto-activates
// the terminal silently, so any browser on this machine becomes licensed without
// manual entry.
//
// Returns: { key: string | null }
// =============================================================================

import { NextResponse } from 'next/server'

export function GET() {
  const key = process.env['DEVICE_LICENSE_KEY'] ?? null
  return NextResponse.json({ key })
}
