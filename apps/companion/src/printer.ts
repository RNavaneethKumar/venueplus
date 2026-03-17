import { BrowserWindow, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as QRCode from 'qrcode'
import { getPrinterSettings, addPrintLog } from './store'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptPayment {
  method: string
  amount: number
}

export interface ReceiptItem {
  name:          string
  visitorType?:  string
  qty:           number
  unitPrice:     number
  discountAmount: number
  lineTotal:     number
}

export interface ReceiptJob {
  orderNumber:  string
  items:        ReceiptItem[]
  subtotal:     number
  discount:     number
  tax:          number
  total:        number
  payments:     ReceiptPayment[]
  cashierName:  string
  timestamp:    string   // ISO string
  promoCode?:   string
  notes?:       string
  // Layout — sourced from venue back-office Print Layout settings
  venueName?:       string   // printed in receipt header
  receiptWidth?:    number   // mm, default 80
  // Override which physical printer to use (set by discovery panel test; otherwise uses stored setting)
  printerOverride?: string
}

export interface TicketJob {
  orderNumber:    string
  productName:    string
  visitorType?:   string
  visitDate:      string  // "15 Mar 2026"
  holderName?:    string
  resourceName?:  string  // seat / lane / court etc.
  ticketNumber:   string  // usually same as orderNumber or sub-ticket id
  qrData:         string  // what the QR code encodes
  // Layout — sourced from venue back-office Print Layout settings
  venueName?:       string   // printed on ticket
  ticketWidth?:     number   // mm, default 210
  ticketHeight?:    number   // mm, default 99
  // Override which physical printer to use (set by discovery panel test; otherwise uses stored setting)
  printerOverride?: string
}

export interface PrintResult {
  success: boolean
  error?:  string
}

// ─── Template loader ──────────────────────────────────────────────────────────

function loadTemplate(name: 'receipt' | 'ticket'): string {
  // In production (packaged), templates live in process.resourcesPath/templates/
  // In development, they live relative to __dirname ../../templates/
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resourcesPath = (process as any).resourcesPath as string | undefined
  const prodPath = path.join(resourcesPath ?? '', 'templates', `${name}.html`)
  const devPath  = path.join(__dirname, '..', '..', 'templates', `${name}.html`)
  const filePath = fs.existsSync(prodPath) ? prodPath : devPath
  return fs.readFileSync(filePath, 'utf-8')
}

// ─── Payment method display ───────────────────────────────────────────────────

function fmtMethod(method: string): string {
  const map: Record<string, string> = {
    cash:      'Cash',
    card:      'Card',
    upi:       'UPI',
    wallet:    'Wallet',
    gift_card: 'Gift Card',
  }
  return map[method] ?? method
}

// ─── Silent print via hidden BrowserWindow ────────────────────────────────────

function printHtml(
  html:     string,
  printer:  string | null,
  pageSize: { width: number; height: number },
  silent = true,
): Promise<PrintResult> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show:           false,
      width:          800,
      height:         600,
      webPreferences: { nodeIntegration: false },
    })

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    win.webContents.once('did-finish-load', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: Record<string, any> = {
        silent,
        printBackground: true,
        pageSize,
        margins: { marginType: 'none' },
      }
      if (printer) options['deviceName'] = printer

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(win.webContents as any).print(options, (success: boolean, errorType?: string) => {
        win.close()
        resolve(success
          ? { success: true }
          : { success: false, error: errorType ?? 'Print failed' }
        )
      })
    })

    win.webContents.once('did-fail-load', (_event: unknown, _code: unknown, errDesc: string) => {
      win.close()
      resolve({ success: false, error: `Template load failed: ${errDesc}` })
    })
  })
}

// ─── Receipt printer ──────────────────────────────────────────────────────────

export async function printReceipt(job: ReceiptJob): Promise<PrintResult> {
  try {
    const settings = getPrinterSettings()
    let html = loadTemplate('receipt')

    // Build items table rows
    const itemRows = job.items.map(item => `
      <tr>
        <td class="item-name">
          ${escHtml(item.name)}
          ${item.visitorType ? `<span class="visitor-type">${escHtml(item.visitorType)}</span>` : ''}
        </td>
        <td class="item-qty">${item.qty}</td>
        <td class="item-price">₹${item.unitPrice.toFixed(2)}</td>
        ${item.discountAmount > 0
          ? `<td class="item-total strike">₹${(item.unitPrice * item.qty).toFixed(2)}<br>₹${item.lineTotal.toFixed(2)}</td>`
          : `<td class="item-total">₹${item.lineTotal.toFixed(2)}</td>`}
      </tr>
    `).join('')

    // Build payment rows (supports split)
    const paymentRows = job.payments.map(p => `
      <tr>
        <td class="pay-method">${fmtMethod(p.method)}</td>
        <td class="pay-amount">₹${p.amount.toFixed(2)}</td>
      </tr>
    `).join('')

    // Format timestamp
    const ts = new Date(job.timestamp)
    const dateStr = ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

    // venueName comes from the print job (sourced from back-office venue settings)
    const venueName = job.venueName ?? ''

    // Inject all values
    html = html
      .replace(/{{VENUE_NAME}}/g,    escHtml(venueName))
      .replace(/{{ORDER_NUMBER}}/g,  escHtml(job.orderNumber))
      .replace(/{{DATE}}/g,          dateStr)
      .replace(/{{TIME}}/g,          timeStr)
      .replace(/{{CASHIER}}/g,       escHtml(job.cashierName))
      .replace(/{{ITEM_ROWS}}/g,     itemRows)
      .replace(/{{SUBTOTAL}}/g,      `₹${job.subtotal.toFixed(2)}`)
      .replace(/{{DISCOUNT_ROW}}/g,  job.discount > 0
        ? `<tr><td>Discount${job.promoCode ? ` (${escHtml(job.promoCode)})` : ''}</td><td>−₹${job.discount.toFixed(2)}</td></tr>`
        : '')
      .replace(/{{TAX}}/g,           `₹${job.tax.toFixed(2)}`)
      .replace(/{{TOTAL}}/g,         `₹${job.total.toFixed(2)}`)
      .replace(/{{PAYMENT_ROWS}}/g,  paymentRows)
      .replace(/{{NOTES_ROW}}/g,     job.notes
        ? `<p class="notes">${escHtml(job.notes)}</p>`
        : '')

    // Receipt width from job (set by POS from back-office Print Layout settings).
    // Height: thermal printers feed and auto-cut based on content length — 500 mm
    // is a safe upper bound that never triggers Electron's 352-micron minimum.
    const ONE_MM = 1_000  // 1 mm in microns
    const pageSize = {
      width:  Math.max(ONE_MM, (job.receiptWidth || 80) * 1_000),
      height: 500 * 1_000,  // 500 mm — printer auto-cuts at content end
    }

    const printer = job.printerOverride !== undefined ? job.printerOverride : settings.receiptPrinter
    const result = await printHtml(html, printer, pageSize)
    addPrintLog({
      type:        'receipt',
      orderNumber: job.orderNumber,
      status:      result.success ? 'success' : 'error',
      error:       result.error,
      timestamp:   new Date().toISOString(),
    })
    return result
  } catch (err: any) {
    const error = err.message ?? 'Receipt print error'
    addPrintLog({ type: 'receipt', orderNumber: job.orderNumber, status: 'error', error, timestamp: new Date().toISOString() })
    return { success: false, error }
  }
}

// ─── Ticket printer ───────────────────────────────────────────────────────────

export async function printTicket(job: TicketJob): Promise<PrintResult> {
  try {
    const settings = getPrinterSettings()
    let html = loadTemplate('ticket')

    // Generate QR code as inline data URL
    const qrDataUrl = await QRCode.toDataURL(job.qrData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' },
    })

    // venueName comes from the print job (sourced from back-office venue settings)
    const venueName = job.venueName ?? ''

    html = html
      .replace(/{{VENUE_NAME}}/g,    escHtml(venueName))
      .replace(/{{PRODUCT_NAME}}/g,  escHtml(job.productName))
      .replace(/{{VISITOR_TYPE}}/g,  escHtml(job.visitorType ?? ''))
      .replace(/{{VISIT_DATE}}/g,    escHtml(job.visitDate))
      .replace(/{{HOLDER_NAME}}/g,   escHtml(job.holderName ?? 'General Admission'))
      .replace(/{{RESOURCE_FIELD}}/g, job.resourceName
        ? `<div class="field"><span class="field-label">Location</span><span class="field-value">${escHtml(job.resourceName)}</span></div>`
        : '')
      .replace(/{{TICKET_NUMBER}}/g, escHtml(job.ticketNumber))
      .replace(/{{ORDER_NUMBER}}/g,  escHtml(job.orderNumber))
      .replace(/{{QR_DATA_URL}}/g,   qrDataUrl)

    // Ticket dimensions from job (set by POS from back-office Print Layout settings).
    // DL landscape default: 210 × 99 mm. Clamp to Electron's hard 352-micron minimum.
    const MIN_MICRONS = 352
    const pageSize = {
      width:  Math.max(MIN_MICRONS, (job.ticketWidth  || 210) * 1000),
      height: Math.max(MIN_MICRONS, (job.ticketHeight ||  99) * 1000),
    }

    const printer = job.printerOverride !== undefined ? job.printerOverride : settings.ticketPrinter
    const result = await printHtml(html, printer, pageSize)
    addPrintLog({
      type:        'ticket',
      orderNumber: job.orderNumber,
      status:      result.success ? 'success' : 'error',
      error:       result.error,
      timestamp:   new Date().toISOString(),
    })
    return result
  } catch (err: any) {
    const error = err.message ?? 'Ticket print error'
    addPrintLog({ type: 'ticket', orderNumber: job.orderNumber, status: 'error', error, timestamp: new Date().toISOString() })
    return { success: false, error }
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
