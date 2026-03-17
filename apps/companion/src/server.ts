import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { webContents } from 'electron'
import {
  getDevice, setDevice, clearDevice,
  getDrawerId, setDrawerId, clearDrawerId,
  getPrinterSettings, setPrinterSettings,
} from './store'
import { printReceipt, printTicket, ReceiptJob, TicketJob } from './printer'

const PORT = 8765

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express()

app.use(cors({ origin: '*' }))       // Allow any origin — localhost only anyway
app.use(express.json({ limit: '2mb' }))

// ─── Root status page ─────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  const device   = getDevice()
  const settings = getPrinterSettings()
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VenuePlus Companion</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px 40px; max-width: 420px; width: 100%; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    h1 span { color: #3b82f6; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0;
           border-bottom: 1px solid #1e293b; font-size: 13px; }
    .label { color: #94a3b8; }
    .val { font-weight: 600; }
    .ok  { color: #4ade80; }
    .dim { color: #64748b; }
    .endpoints { margin-top: 20px; font-size: 11px; color: #475569; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Venue<span>Plus</span> Companion</h1>
    <p class="sub">Local agent · http://127.0.0.1:8765</p>
    <div class="row"><span class="label">Status</span>      <span class="val ok">● Running</span></div>
    <div class="row"><span class="label">Version</span>     <span class="val">1.0.0</span></div>
    <div class="row"><span class="label">Device</span>      <span class="val ${device ? 'ok' : 'dim'}">${device ? device.name : 'Not registered'}</span></div>
    <div class="row"><span class="label">Receipt printer</span><span class="val">${settings.receiptPrinter ?? 'System default'}</span></div>
    <div class="row"><span class="label">Ticket printer</span> <span class="val">${settings.ticketPrinter  ?? 'System default'}</span></div>
    <div class="endpoints">
      Available endpoints: /health &nbsp;·&nbsp; /device &nbsp;·&nbsp; /session/drawer<br>
      /printers &nbsp;·&nbsp; /settings &nbsp;·&nbsp; /print/receipt &nbsp;·&nbsp; /print/ticket
    </div>
  </div>
</body>
</html>`)
})

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ success: true, version: '1.0.0', service: 'venueplus-companion' })
})

// ─── Device registration ──────────────────────────────────────────────────────

app.get('/device', (_req, res) => {
  res.json({ success: true, data: getDevice() })
})

app.post('/device', (req, res) => {
  const { token, id, name, type } = req.body as Record<string, string>
  if (!token || !id || !name || !type) {
    res.status(400).json({ success: false, error: 'Missing required fields: token, id, name, type' })
    return
  }
  setDevice({ token, id, name, type })
  res.json({ success: true })
})

app.delete('/device', (_req, res) => {
  clearDevice()
  res.json({ success: true })
})

// ─── Active drawer (till session) ─────────────────────────────────────────────
// Stores the drawerId of the currently-open till session on this terminal.
// Replaces the cookie-based venueplus_active_drawer_id — persists across browsers.

app.get('/session/drawer', (_req, res) => {
  res.json({ success: true, data: { drawerId: getDrawerId() } })
})

app.post('/session/drawer', (req, res) => {
  const { drawerId } = req.body as { drawerId?: string }
  if (!drawerId) {
    res.status(400).json({ success: false, error: 'Missing required field: drawerId' })
    return
  }
  setDrawerId(drawerId)
  res.json({ success: true })
})

app.delete('/session/drawer', (_req, res) => {
  clearDrawerId()
  res.json({ success: true })
})

// ─── Printer discovery ────────────────────────────────────────────────────────

app.get('/printers', (_req, res) => {
  try {
    // Get any BrowserWindow's webContents to call getPrintersAsync
    const [wc] = webContents.getAllWebContents()
    if (!wc) {
      res.json({ success: true, data: [] })
      return
    }
    wc.getPrintersAsync().then(printers => {
      res.json({
        success: true,
        data: printers.map(p => ({
          name:        p.name,
          displayName: p.displayName,
          isDefault:   p.isDefault,
          status:      p.status,
        })),
      })
    }).catch(err => {
      res.status(500).json({ success: false, error: String(err) })
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── Printer settings ─────────────────────────────────────────────────────────

app.get('/settings', (_req, res) => {
  res.json({ success: true, data: getPrinterSettings() })
})

app.post('/settings', (req, res) => {
  try {
    setPrinterSettings(req.body)
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// ─── Print: Receipt ───────────────────────────────────────────────────────────

app.post('/print/receipt', async (req, res) => {
  const job = req.body as ReceiptJob

  if (!job.orderNumber || !Array.isArray(job.items) || !Array.isArray(job.payments)) {
    res.status(400).json({ success: false, error: 'Invalid receipt job: missing orderNumber, items, or payments' })
    return
  }

  const result = await printReceipt(job)
  if (result.success) {
    res.json({ success: true })
  } else {
    res.status(500).json({ success: false, error: result.error })
  }
})

// ─── Print: Ticket ────────────────────────────────────────────────────────────

app.post('/print/ticket', async (req, res) => {
  const job = req.body as TicketJob

  if (!job.orderNumber || !job.productName || !job.qrData) {
    res.status(400).json({ success: false, error: 'Invalid ticket job: missing orderNumber, productName, or qrData' })
    return
  }

  const result = await printTicket(job)
  if (result.success) {
    res.json({ success: true })
  } else {
    res.status(500).json({ success: false, error: result.error })
  }
})

// ─── Error handler (must be AFTER all routes) ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[companion] Unhandled error:', err.message)
  res.status(500).json({ success: false, error: err.message })
})

// ─── Start server ─────────────────────────────────────────────────────────────

export function startServer(): void {
  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[companion] HTTP server listening on http://127.0.0.1:${PORT}`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[companion] Port ${PORT} is already in use. Is another instance running?`)
    } else {
      console.error('[companion] Server error:', err.message)
    }
  })
}
