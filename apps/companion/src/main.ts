import { app, BrowserWindow, Menu, Tray, nativeImage, dialog } from 'electron'
import * as path from 'path'
import { startServer } from './server'
import {
  getDevice, getDrawerId,
  getPrinterSettings, setPrinterSettings,
  getPrintLog, clearPrintLog, onPrintLogUpdated,
} from './store'

// ─── Single instance lock ─────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// ─── Globals ──────────────────────────────────────────────────────────────────

let tray:           Tray | null          = null
let settingsWindow: BrowserWindow | null = null

// ─── Login item (auto-start) ──────────────────────────────────────────────────

function toggleLoginItem(): void {
  const current = app.getLoginItemSettings().openAtLogin
  app.setLoginItemSettings({ openAtLogin: !current })
  buildTrayMenu()   // refresh label
}

// ─── Settings window ──────────────────────────────────────────────────────────

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width:          900,
    height:         640,
    minWidth:       760,
    minHeight:      540,
    resizable:      true,
    title:          'VenuePlus Companion',
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
    },
  })

  settingsWindow.setMenuBarVisibility(false)

  // Load the settings HTML
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resourcesPath = (process as any).resourcesPath as string
  const settingsPath = app.isPackaged
    ? path.join(resourcesPath, 'templates', 'settings.html')
    : path.join(__dirname, '..', '..', 'templates', 'settings.html')

  settingsWindow.loadFile(settingsPath)

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// ─── Tray icon ────────────────────────────────────────────────────────────────

function createTray(): void {
  // Use a simple 16×16 white circle as fallback icon (replaced with real asset in production)
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('VenuePlus Companion')

  buildTrayMenu()
}

function buildTrayMenu(): void {
  if (!tray) return
  const settings = getPrinterSettings()

  const menu = Menu.buildFromTemplate([
    {
      label:   'VenuePlus Companion',
      enabled: false,
    },
    { type: 'separator' },
    {
      label:   '⚙️  Settings',
      click:   () => openSettingsWindow(),
    },
    {
      label:   '🖨️  Test Receipt Print',
      click:   () => testPrint('receipt'),
    },
    {
      label:   '🎫  Test Ticket Print',
      click:   () => testPrint('ticket'),
    },
    { type: 'separator' },
    {
      label:   `Receipt Printer: ${settings.receiptPrinter ?? 'Default'}`,
      enabled: false,
    },
    {
      label:   `Ticket Printer: ${settings.ticketPrinter ?? 'Default'}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label:   `Start at Login: ${app.getLoginItemSettings().openAtLogin ? 'On' : 'Off'}`,
      click:   () => toggleLoginItem(),
    },
    { type: 'separator' },
    {
      label: 'Quit VenuePlus Companion',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => openSettingsWindow())
}

// ─── Test prints ──────────────────────────────────────────────────────────────

async function testPrint(type: 'receipt' | 'ticket'): Promise<void> {
  const { printReceipt, printTicket } = await import('./printer')

  if (type === 'receipt') {
    const result = await printReceipt({
      orderNumber: 'TEST-001',
      items: [
        { name: 'Day Pass',      visitorType: 'Adult', qty: 2, unitPrice: 500, discountAmount: 0, lineTotal: 1000 },
        { name: 'Locker Rental',                        qty: 1, unitPrice: 200, discountAmount: 0, lineTotal: 200 },
      ],
      subtotal:    1200,
      discount:    0,
      tax:         216,
      total:       1416,
      payments:    [{ method: 'cash', amount: 1416 }],
      cashierName: 'Test Cashier',
      timestamp:   new Date().toISOString(),
    })
    dialog.showMessageBox({ type: result.success ? 'info' : 'error', message: result.success ? 'Test receipt sent to printer.' : `Print failed: ${result.error}` })

  } else {
    const result = await printTicket({
      orderNumber:  'TEST-001',
      productName:  'Day Pass',
      visitorType:  'Adult',
      visitDate:    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      holderName:   'Test Visitor',
      ticketNumber: 'TEST-001-01',
      qrData:       'TEST-001-01',
    })
    dialog.showMessageBox({ type: result.success ? 'info' : 'error', message: result.success ? 'Test ticket sent to printer.' : `Print failed: ${result.error}` })
  }

  buildTrayMenu()
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Don't show in macOS dock
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  // Enable auto-start on first launch (if not already set)
  if (!app.getLoginItemSettings().wasOpenedAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true })
  }

  // Start the local HTTP server
  startServer()

  // Push print-log-updated events to the settings window whenever a print completes
  onPrintLogUpdated(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('print-log-updated')
    }
  })

  // Create tray icon
  createTray()

  console.log('[companion] Ready — listening on http://127.0.0.1:8765')
})

app.on('window-all-closed', () => {
  // Keep running in background even if all windows closed
  // App only exits via tray "Quit"
})

app.on('activate', () => {
  // macOS: re-open settings if tray icon is clicked while no windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    openSettingsWindow()
  }
})

// ─── IPC: settings save (called from settings window renderer) ────────────────

import { ipcMain } from 'electron'

ipcMain.handle('get-settings', () => getPrinterSettings())

ipcMain.handle('save-settings', (_event: Electron.IpcMainInvokeEvent, settings: Record<string, unknown>) => {
  setPrinterSettings(settings as Parameters<typeof setPrinterSettings>[0])
  buildTrayMenu()
  return { success: true }
})

ipcMain.handle('get-printers', async () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length === 0) return []
  const printers = await wins[0]!.webContents.getPrintersAsync()
  return printers.map((p: Electron.PrinterInfo) => ({
    name:        p.name,
    displayName: p.displayName,
    isDefault:   p.isDefault,
    description: p.description,
    status:      p.status,
    options:     p.options,   // includes 'device-uri' on macOS/CUPS — reveals USB/Network/Bluetooth
  }))
})

ipcMain.handle('get-device', () => getDevice())

ipcMain.handle('get-drawer-id', () => getDrawerId())

ipcMain.handle('get-print-log', () => getPrintLog())

ipcMain.handle('clear-print-log', () => {
  clearPrintLog()
  return { success: true }
})

ipcMain.handle('test-print', async (_event: Electron.IpcMainInvokeEvent, type: 'receipt' | 'ticket') => {
  const { printReceipt, printTicket } = await import('./printer')
  if (type === 'receipt') {
    return printReceipt({
      orderNumber: 'TEST-001',
      items: [
        { name: 'Day Pass',      visitorType: 'Adult', qty: 2, unitPrice: 500, discountAmount: 0, lineTotal: 1000 },
        { name: 'Locker Rental',                        qty: 1, unitPrice: 200, discountAmount: 0, lineTotal:  200 },
      ],
      subtotal:     1200,
      discount:     0,
      tax:          216,
      total:        1416,
      payments:     [{ method: 'cash', amount: 1416 }],
      cashierName:  'Test Cashier',
      timestamp:    new Date().toISOString(),
      // Layout defaults for test prints (no POS session available)
      venueName:    'VenuePlus',
      receiptWidth: 80,
    })
  } else {
    return printTicket({
      orderNumber:  'TEST-001',
      productName:  'Day Pass',
      visitorType:  'Adult',
      visitDate:    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      holderName:   'Test Visitor',
      ticketNumber: 'TEST-001-01',
      qrData:       'TEST-001-01',
      // Layout defaults for test prints (no POS session available)
      venueName:    'VenuePlus',
      ticketWidth:  210,
      ticketHeight: 99,
    })
  }
})

/**
 * test-print-on — like test-print but forces a specific named printer.
 * Used by the Printer Discovery panel to test each discovered printer individually.
 */
ipcMain.handle('test-print-on', async (
  _event: Electron.IpcMainInvokeEvent,
  { type, printerName }: { type: 'receipt' | 'ticket'; printerName: string },
) => {
  const { printReceipt, printTicket } = await import('./printer')
  if (type === 'receipt') {
    return printReceipt({
      orderNumber: 'TEST-001',
      items: [
        { name: 'Day Pass',      visitorType: 'Adult', qty: 2, unitPrice: 500, discountAmount: 0, lineTotal: 1000 },
        { name: 'Locker Rental',                        qty: 1, unitPrice: 200, discountAmount: 0, lineTotal:  200 },
      ],
      subtotal:        1200,
      discount:        0,
      tax:             216,
      total:           1416,
      payments:        [{ method: 'cash', amount: 1416 }],
      cashierName:     'Test Cashier',
      timestamp:       new Date().toISOString(),
      venueName:       'VenuePlus',
      receiptWidth:    80,
      printerOverride: printerName,
    })
  } else {
    return printTicket({
      orderNumber:     'TEST-001',
      productName:     'Day Pass',
      visitorType:     'Adult',
      visitDate:       new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      holderName:      'Test Visitor',
      ticketNumber:    'TEST-001-01',
      qrData:          'TEST-001-01',
      venueName:       'VenuePlus',
      ticketWidth:     210,
      ticketHeight:    99,
      printerOverride: printerName,
    })
  }
})
