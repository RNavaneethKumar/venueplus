'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

// ─── Setting keys ─────────────────────────────────────────────────────────────

const KEYS = {
  receiptWidth:        'print.receipt_width',
  receiptShowAddress:  'print.receipt_show_address',
  receiptShowGstin:    'print.receipt_show_gstin',
  receiptShowTax:      'print.receipt_show_tax',
  receiptShowCashier:  'print.receipt_show_cashier',
  receiptFooter:       'print.receipt_footer',
  receiptHtmlTemplate: 'print.receipt_html_template',
  ticketWidth:         'print.ticket_width',
  ticketHeight:        'print.ticket_height',
  ticketLabel:         'print.ticket_label',
  ticketTagline:       'print.ticket_tagline',
  ticketShowName:      'print.ticket_show_name',
  ticketShowDate:      'print.ticket_show_date',
  ticketShowOrder:     'print.ticket_show_order',
  ticketHtmlTemplate:  'print.ticket_html_template',
}

interface Settings {
  receiptWidth:        number
  receiptShowAddress:  boolean
  receiptShowGstin:    boolean
  receiptShowTax:      boolean
  receiptShowCashier:  boolean
  receiptFooter:       string
  receiptHtmlTemplate: string
  ticketWidth:         number
  ticketHeight:        number
  ticketLabel:         string
  ticketTagline:       string
  ticketShowName:      boolean
  ticketShowDate:      boolean
  ticketShowOrder:     boolean
  ticketHtmlTemplate:  string
}

const DEFAULTS: Settings = {
  receiptWidth:        80,
  receiptShowAddress:  true,
  receiptShowGstin:    true,
  receiptShowTax:      true,
  receiptShowCashier:  true,
  receiptFooter:       '',
  receiptHtmlTemplate: '',
  ticketWidth:         210,
  ticketHeight:        99,
  ticketLabel:         'Admission Ticket',
  ticketTagline:       '',
  ticketShowName:      true,
  ticketShowDate:      true,
  ticketShowOrder:     true,
  ticketHtmlTemplate:  '',
}

// ─── Default HTML Templates ────────────────────────────────────────────────────

function defaultReceiptTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; padding: 8px 6px 14px; width: {{width}}px; }
.center { text-align: center; }
.right  { text-align: right; }
.dashed { border: none; border-top: 1px dashed #000; margin: 5px 0; }
table   { width: 100%; border-collapse: collapse; }
th      { font-size: 8px; text-transform: uppercase; padding: 2px 0; border-bottom: 1px solid #000; }
td      { font-size: 9px; padding: 2px 0; vertical-align: top; }
.total-row td { font-size: 13px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
</style>
</head>
<body>

<div class="center" style="border-bottom:1px dashed #000;padding-bottom:6px;margin-bottom:6px">
  <div style="font-size:14px;font-weight:bold;letter-spacing:0.5px">{{venue_name}}</div>
  {{address}}
  {{gstin}}
  <div style="font-size:9px;color:#444;line-height:1.7;margin-top:4px">
    Order: <strong>{{order_number}}</strong><br>
    {{date_time}}{{cashier}}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="text-align:left">Item</th>
      <th style="text-align:center;width:20px">Qty</th>
      <th style="text-align:right;width:44px">Price</th>
      <th style="text-align:right;width:44px">Total</th>
    </tr>
  </thead>
  <tbody>{{items_rows}}</tbody>
</table>

<hr class="dashed">

<table style="font-size:9px">
  <tr><td>Subtotal</td><td class="right">{{subtotal}}</td></tr>
  {{tax_row}}
  <tr class="total-row">
    <td>TOTAL</td>
    <td class="right">{{total}}</td>
  </tr>
</table>

<div style="margin-top:6px">
  <div style="font-size:8px;text-transform:uppercase;color:#666;margin-bottom:2px">Payment</div>
  <table>
    <tr><td>Cash</td><td class="right" style="font-weight:bold">{{total}}</td></tr>
  </table>
</div>

<div class="center" style="margin-top:10px;padding-top:6px;border-top:1px dashed #000;font-size:8px;color:#777">
  {{footer}}
</div>

</body>
</html>`
}

function defaultTicketTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a; }
.ticket {
  width: {{width}}px; height: {{height}}px;
  border: 2px solid #1a1a1a; border-radius: 4px;
  display: flex; overflow: hidden;
}
.main { flex: 1; padding: 14px; display: flex; flex-direction: column; overflow: hidden; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.venue-name { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
.badge {
  font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
  color: #888; border: 1px solid #ccc; padding: 3px 8px; border-radius: 4px;
}
.product-name { font-size: 20px; font-weight: 800; line-height: 1.1; margin-bottom: 2px; }
.product-type { font-size: 11px; color: #555; font-weight: 500; margin-bottom: 4px; }
.tagline     { font-size: 9px; color: #888; font-style: italic; margin-bottom: 6px; }
.meta        { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: auto; }
.meta-item label { display: block; font-size: 7px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 600; }
.meta-item span  { font-size: 11px; font-weight: 700; }
.divider {
  width: 1px; height: 80%; border-left: 1.5px dashed #ccc;
  flex-shrink: 0; align-self: center;
  position: relative;
}
.divider::before, .divider::after {
  content: ''; position: absolute; left: 50%; transform: translateX(-50%);
  width: 16px; height: 16px; background: #f0f0f0;
  border: 2px solid #1a1a1a; border-radius: 50%;
}
.divider::before { top: -18px; }
.divider::after  { bottom: -18px; }
.stub {
  width: 72px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 8px; background: #f8f8f8; gap: 6px;
}
.scan-label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; font-weight: 600; }
.qr { width: 48px; height: 48px; background: #e0e0e0; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #777; text-align: center; }
.barcode { font-size: 7px; font-weight: 700; font-family: monospace; color: #333; text-align: center; word-break: break-all; }
</style>
</head>
<body>
<div class="ticket">
  <div class="main">
    <div class="header">
      <div class="venue-name">{{venue_name}}</div>
      <div class="badge">{{ticket_label}}</div>
    </div>
    <div class="product-name">{{product_name}}</div>
    <div class="product-type">{{product_type}}</div>
    {{tagline}}
    <div class="meta">{{meta_fields}}</div>
  </div>

  <div style="position:relative;width:1px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:14px;height:14px;background:#fff;border-radius:50%;border:2px solid #1a1a1a"></div>
    <div style="width:0;height:80%;border-left:1.5px dashed #ccc"></div>
    <div style="position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:14px;height:14px;background:#fff;border-radius:50%;border:2px solid #1a1a1a"></div>
  </div>

  <div class="stub">
    <div class="scan-label">Scan to enter</div>
    <div class="qr">QR<br>Code</div>
    <div class="barcode">{{order_number}}</div>
  </div>
</div>
</body>
</html>`
}

// ─── Template variable substitution ──────────────────────────────────────────

function renderReceiptTemplate(template: string, s: Settings, venue: VenueInfo): string {
  const w = Math.round(s.receiptWidth * 2)
  const vars: Record<string, string> = {
    width:       String(w),
    venue_name:  venue.name    || 'Your Venue',
    address:     s.receiptShowAddress && venue.address
      ? `<div style="font-size:8px;color:#555;margin-top:2px;line-height:1.6">${venue.address}</div>`
      : '',
    gstin:       s.receiptShowGstin && venue.gstin
      ? `<div style="font-size:7px;color:#888;margin-top:1px">GSTIN: ${venue.gstin}</div>`
      : '',
    order_number: '#ORD-2026-001',
    date_time:    '15 Mar 2026 · 14:32',
    cashier:      s.receiptShowCashier ? '<br>Cashier: Priya' : '',
    items_rows:  `
      <tr>
        <td style="padding:2px 0;vertical-align:top">Day Pass<span style="display:block;font-size:8px;color:#666">Adult</span></td>
        <td style="text-align:center;padding:2px 0">2</td>
        <td style="text-align:right;padding:2px 0">₹500.00</td>
        <td style="text-align:right;padding:2px 0">₹1,000.00</td>
      </tr>
      <tr>
        <td style="padding:2px 0;vertical-align:top">Child Pass<span style="display:block;font-size:8px;color:#666">Child</span></td>
        <td style="text-align:center;padding:2px 0">1</td>
        <td style="text-align:right;padding:2px 0">₹250.00</td>
        <td style="text-align:right;padding:2px 0">₹250.00</td>
      </tr>`,
    subtotal:    '₹1,250.00',
    tax_row:     s.receiptShowTax
      ? '<tr style="font-size:8px;color:#666"><td>GST (18%)</td><td style="text-align:right">₹190.68</td></tr>'
      : '',
    total:       '₹1,250.00',
    footer:      s.receiptFooter || 'Thank you for visiting!',
  }
  return Object.entries(vars).reduce((t, [k, v]) => t.split(`{{${k}}}`).join(v), template)
}

function renderTicketTemplate(template: string, s: Settings, venue: VenueInfo): string {
  const pxW = Math.round(s.ticketWidth  * 3.78)
  const pxH = Math.round(s.ticketHeight * 3.78)

  const metaFields = [
    s.ticketShowDate  ? `<div class="meta-item"><label>Date</label><span>15 Mar 2026</span></div>` : '',
    s.ticketShowName  ? `<div class="meta-item"><label>Name</label><span>John Smith</span></div>`  : '',
    s.ticketShowOrder ? `<div class="meta-item"><label>Order</label><span>#ORD-2026-001</span></div>` : '',
  ].join('')

  const vars: Record<string, string> = {
    width:        String(pxW),
    height:       String(pxH),
    venue_name:   venue.name  || 'Your Venue',
    ticket_label: s.ticketLabel || 'Admission Ticket',
    product_name: 'Day Pass',
    product_type: 'Adult',
    tagline:      s.ticketTagline ? `<div class="tagline">${s.ticketTagline}</div>` : '',
    meta_fields:  metaFields,
    order_number: 'ORD-2026-001-1-1',
  }
  return Object.entries(vars).reduce((t, [k, v]) => t.split(`{{${k}}}`).join(v), template)
}

// ─── Smart React Previews (fallback when no custom template) ──────────────────

interface VenueInfo { name: string; address: string; gstin: string }

function ReceiptPreview({ s, venue }: { s: Settings; venue: VenueInfo }) {
  const px = Math.round(s.receiptWidth * 2)
  return (
    <div style={{ width: px, fontFamily: "'Courier New', Courier, monospace", fontSize: 10, background: '#fff', color: '#000', padding: '8px 6px 14px', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>{venue.name || 'Your Venue'}</div>
        {s.receiptShowAddress && venue.address && (
          <div style={{ fontSize: 8, color: '#555', marginTop: 2, lineHeight: 1.6 }}>{venue.address}</div>
        )}
        {s.receiptShowGstin && venue.gstin && (
          <div style={{ fontSize: 7, color: '#888', marginTop: 1 }}>GSTIN: {venue.gstin}</div>
        )}
        <div style={{ fontSize: 9, color: '#444', lineHeight: 1.7, marginTop: 4 }}>
          Order: <strong>#ORD-2026-001</strong><br />
          15 Mar 2026 · 14:32{s.receiptShowCashier && <><br />Cashier: Priya</>}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 3 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000', fontSize: 8, textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left',   padding: '2px 0' }}>Item</th>
            <th style={{ textAlign: 'center', padding: '2px 0', width: 20 }}>Qty</th>
            <th style={{ textAlign: 'right',  padding: '2px 0', width: 44 }}>Price</th>
            <th style={{ textAlign: 'right',  padding: '2px 0', width: 44 }}>Total</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: 9 }}>
          <tr>
            <td style={{ padding: '2px 0', verticalAlign: 'top' }}>Day Pass<span style={{ display: 'block', fontSize: 8, color: '#666' }}>Adult</span></td>
            <td style={{ textAlign: 'center', padding: '2px 0' }}>2</td>
            <td style={{ textAlign: 'right',  padding: '2px 0' }}>₹500.00</td>
            <td style={{ textAlign: 'right',  padding: '2px 0' }}>₹1,000.00</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 0', verticalAlign: 'top' }}>Child Pass<span style={{ display: 'block', fontSize: 8, color: '#666' }}>Child</span></td>
            <td style={{ textAlign: 'center', padding: '2px 0' }}>1</td>
            <td style={{ textAlign: 'right',  padding: '2px 0' }}>₹250.00</td>
            <td style={{ textAlign: 'right',  padding: '2px 0' }}>₹250.00</td>
          </tr>
        </tbody>
      </table>
      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '5px 0' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
        <tbody>
          <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>₹1,250.00</td></tr>
          {s.receiptShowTax && (
            <tr style={{ fontSize: 8, color: '#666' }}>
              <td>GST (18%)</td><td style={{ textAlign: 'right' }}>₹190.68</td>
            </tr>
          )}
          <tr style={{ fontWeight: 'bold', fontSize: 13, borderTop: '1px solid #000' }}>
            <td style={{ paddingTop: 4 }}>TOTAL</td>
            <td style={{ textAlign: 'right', paddingTop: 4 }}>₹1,250.00</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#666', marginBottom: 2 }}>Payment</div>
        <table style={{ width: '100%', fontSize: 9 }}>
          <tbody><tr><td>Cash</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹1,250.00</td></tr></tbody>
        </table>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 6, borderTop: '1px dashed #000', fontSize: 8, color: '#777' }}>
        {s.receiptFooter || 'Thank you for visiting!'}
      </div>
    </div>
  )
}

const QR_SVG = (
  <svg viewBox="0 0 21 21" style={{ width: '100%', height: '100%' }}>
    <rect width="21" height="21" fill="white"/>
    <rect x="0"  y="0"  width="7" height="7" fill="none" stroke="black" strokeWidth="1"/>
    <rect x="2"  y="2"  width="3" height="3" fill="black"/>
    <rect x="14" y="0"  width="7" height="7" fill="none" stroke="black" strokeWidth="1"/>
    <rect x="16" y="2"  width="3" height="3" fill="black"/>
    <rect x="0"  y="14" width="7" height="7" fill="none" stroke="black" strokeWidth="1"/>
    <rect x="2"  y="16" width="3" height="3" fill="black"/>
    <rect x="9" y="1" width="1" height="1" fill="black"/>
    <rect x="11" y="1" width="2" height="1" fill="black"/>
    <rect x="9" y="3" width="2" height="1" fill="black"/>
    <rect x="12" y="4" width="1" height="2" fill="black"/>
    <rect x="9" y="7" width="3" height="1" fill="black"/>
  </svg>
)

function TicketPreview({ s, venue }: { s: Settings; venue: VenueInfo }) {
  const MAX_PX_W = 660
  const scale    = Math.min(1, MAX_PX_W / (s.ticketWidth * 3.78))
  const pxW      = Math.round(s.ticketWidth  * 3.78 * scale)
  const pxH      = Math.round(s.ticketHeight * 3.78 * scale)
  const sz       = (mm: number) => Math.round(mm * scale)
  return (
    <div style={{ width: pxW, height: pxH, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#fff', color: '#1a1a1a', border: `${Math.max(1, sz(1.5))}px solid #1a1a1a`, borderRadius: sz(2), display: 'flex', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: sz(8), overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sz(4) }}>
          <span style={{ fontWeight: 700, fontSize: sz(10), textTransform: 'uppercase', letterSpacing: 0.4 }}>{venue.name || 'Your Venue'}</span>
          <span style={{ fontSize: sz(7), fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#888', border: '1px solid #ccc', padding: `${sz(2)}px ${sz(5)}px`, borderRadius: sz(3) }}>{s.ticketLabel || 'Admission Ticket'}</span>
        </div>
        <div style={{ fontSize: sz(19), fontWeight: 800, lineHeight: 1.1, marginBottom: sz(1) }}>Day Pass</div>
        <div style={{ fontSize: sz(10), color: '#555', fontWeight: 500, marginBottom: sz(2) }}>Adult</div>
        {s.ticketTagline && <div style={{ fontSize: sz(8), color: '#888', fontStyle: 'italic', marginBottom: sz(2) }}>{s.ticketTagline}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${sz(3)}px ${sz(6)}px`, marginTop: 'auto' }}>
          {s.ticketShowDate  && <div style={{ minWidth: sz(28) }}><div style={{ fontSize: sz(6), textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 1 }}>Date</div><div style={{ fontSize: sz(10), fontWeight: 700 }}>15 Mar 2026</div></div>}
          {s.ticketShowName  && <div style={{ minWidth: sz(28) }}><div style={{ fontSize: sz(6), textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 1 }}>Name</div><div style={{ fontSize: sz(10), fontWeight: 700 }}>John Smith</div></div>}
          {s.ticketShowOrder && <div style={{ minWidth: sz(28) }}><div style={{ fontSize: sz(6), textTransform: 'uppercase', letterSpacing: 0.8, color: '#888', fontWeight: 600, marginBottom: 1 }}>Order</div><div style={{ fontSize: sz(10), fontWeight: 700 }}>#ORD-2026-001</div></div>}
        </div>
      </div>
      <div style={{ width: sz(10), position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', width: sz(9), height: sz(9), background: '#fff', borderRadius: '50%', border: `${Math.max(1, sz(1.5))}px solid #1a1a1a` }} />
        <div style={{ width: 0, height: '80%', borderLeft: '1.5px dashed #ccc' }} />
        <div style={{ position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)', width: sz(9), height: sz(9), background: '#fff', borderRadius: '50%', border: `${Math.max(1, sz(1.5))}px solid #1a1a1a` }} />
      </div>
      <div style={{ width: sz(54), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: sz(5), background: '#f8f8f8', gap: sz(3), flexShrink: 0 }}>
        <span style={{ fontSize: sz(6), textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', fontWeight: 600 }}>Scan to enter</span>
        <div style={{ width: sz(36), height: sz(36), background: '#fff', border: '1px solid #ddd', borderRadius: sz(3), padding: sz(2) }}>{QR_SVG}</div>
        <div style={{ fontSize: sz(6), fontWeight: 700, fontFamily: 'monospace', color: '#333', textAlign: 'center', wordBreak: 'break-all' }}>ORD-2026-001-1-1</div>
      </div>
    </div>
  )
}

// ─── HTML Code Editor ─────────────────────────────────────────────────────────

const RECEIPT_VARS: [string, string][] = [
  ['{{venue_name}}', 'Venue name'],
  ['{{address}}',    'Address block (conditional)'],
  ['{{gstin}}',      'GSTIN block (conditional)'],
  ['{{order_number}}','Order number'],
  ['{{date_time}}',  'Date and time'],
  ['{{cashier}}',    'Cashier line (conditional)'],
  ['{{items_rows}}', 'Item table rows HTML'],
  ['{{subtotal}}',   'Subtotal amount'],
  ['{{tax_row}}',    'Tax row (conditional)'],
  ['{{total}}',      'Total amount'],
  ['{{footer}}',     'Footer text'],
  ['{{width}}',      'Paper width in px'],
]

const TICKET_VARS: [string, string][] = [
  ['{{venue_name}}',   'Venue name'],
  ['{{ticket_label}}', 'Badge text (top-right)'],
  ['{{product_name}}', 'Product / pass name'],
  ['{{product_type}}', 'Visitor type'],
  ['{{tagline}}',      'Tagline block (conditional)'],
  ['{{meta_fields}}',  'Date / Name / Order fields'],
  ['{{order_number}}', 'Order barcode'],
  ['{{width}}',        'Ticket width in px'],
  ['{{height}}',       'Ticket height in px'],
]

function HtmlEditor({
  value, onChange, vars, label,
}: {
  value:    string
  onChange: (v: string) => void
  vars:     [string, string][]
  label:    string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showVars, setShowVars] = useState(false)

  // Tab key → insert 2 spaces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta  = e.currentTarget
      const s   = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.substring(0, s) + '  ' + value.substring(end)
      onChange(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <span className="text-slate-400 text-xs font-mono">{label}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVars((v) => !v)}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            {showVars ? 'Hide vars' : '{{…}} Variables'}
          </button>
          <span className="text-slate-600 text-xs tabular-nums">{value.length} chars</span>
        </div>
      </div>

      {/* Variable reference */}
      {showVars && (
        <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-700 flex flex-wrap gap-1.5 shrink-0">
          {vars.map(([token, desc]) => (
            <button
              key={token}
              title={desc}
              onClick={() => {
                const ta = textareaRef.current
                if (!ta) return
                const s    = ta.selectionStart
                const end  = ta.selectionEnd
                const next = value.substring(0, s) + token + value.substring(end)
                onChange(next)
                requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + token.length; ta.focus() })
              }}
              className="font-mono text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40 hover:bg-blue-800/50 transition-colors"
            >
              {token}
            </button>
          ))}
        </div>
      )}

      {/* Code area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="flex-1 w-full bg-slate-950 text-slate-200 text-xs leading-relaxed resize-none focus:outline-none p-3 font-mono"
        style={{ tabSize: 2, minHeight: 320 }}
        placeholder="Paste or type your HTML template here…"
      />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PrintLayoutPage() {
  const [venue,         setVenue]         = useState<VenueInfo>({ name: '', address: '', gstin: '' })
  const [cur,           setCur]           = useState<Settings>(DEFAULTS)
  const [preview,       setPreview]       = useState<Settings>(DEFAULTS)
  const [saved,         setSaved]         = useState<Settings>(DEFAULTS)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [savedOk,       setSavedOk]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [activePreview, setActivePreview] = useState<'receipt' | 'ticket'>('receipt')
  const [htmlMode,      setHtmlMode]      = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const res  = await posApi.admin.getVenue()
      const data = res.data.data
      const raw  = (data.settings ?? {}) as Record<string, string>

      setVenue({ name: data.name ?? '', address: data.registeredAddress ?? '', gstin: data.taxRegistrationNumber ?? '' })

      const num  = (key: string, fb: number)  => { const n = parseFloat(raw[key] ?? ''); return isNaN(n) ? fb : n }
      const str  = (key: string, fb: string)  => raw[key] ?? fb
      // Use String() coercion to handle both boolean true and string 'true' from DB
      const bool = (key: string, fb: boolean) => { const v = raw[key]; return v === undefined ? fb : String(v) !== 'false' }

      const loaded: Settings = {
        receiptWidth:        num(KEYS.receiptWidth,        DEFAULTS.receiptWidth),
        receiptShowAddress:  bool(KEYS.receiptShowAddress,  DEFAULTS.receiptShowAddress),
        receiptShowGstin:    bool(KEYS.receiptShowGstin,    DEFAULTS.receiptShowGstin),
        receiptShowTax:      bool(KEYS.receiptShowTax,      DEFAULTS.receiptShowTax),
        receiptShowCashier:  bool(KEYS.receiptShowCashier,  DEFAULTS.receiptShowCashier),
        receiptFooter:       str(KEYS.receiptFooter,        DEFAULTS.receiptFooter),
        receiptHtmlTemplate: str(KEYS.receiptHtmlTemplate,  DEFAULTS.receiptHtmlTemplate),
        ticketWidth:         num(KEYS.ticketWidth,          DEFAULTS.ticketWidth),
        ticketHeight:        num(KEYS.ticketHeight,         DEFAULTS.ticketHeight),
        ticketLabel:         str(KEYS.ticketLabel,          DEFAULTS.ticketLabel),
        ticketTagline:       str(KEYS.ticketTagline,        DEFAULTS.ticketTagline),
        ticketShowName:      bool(KEYS.ticketShowName,      DEFAULTS.ticketShowName),
        ticketShowDate:      bool(KEYS.ticketShowDate,      DEFAULTS.ticketShowDate),
        ticketShowOrder:     bool(KEYS.ticketShowOrder,     DEFAULTS.ticketShowOrder),
        ticketHtmlTemplate:  str(KEYS.ticketHtmlTemplate,   DEFAULTS.ticketHtmlTemplate),
      }
      setCur(loaded); setPreview(loaded); setSaved(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Dirty detection ───────────────────────────────────────────────────────
  const isDirty = (Object.keys(DEFAULTS) as (keyof Settings)[]).some((k) => cur[k] !== saved[k])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const pairs: [string, string][] = [
        [KEYS.receiptWidth,        String(cur.receiptWidth)],
        [KEYS.receiptShowAddress,  String(cur.receiptShowAddress)],
        [KEYS.receiptShowGstin,    String(cur.receiptShowGstin)],
        [KEYS.receiptShowTax,      String(cur.receiptShowTax)],
        [KEYS.receiptShowCashier,  String(cur.receiptShowCashier)],
        [KEYS.receiptFooter,       cur.receiptFooter],
        [KEYS.receiptHtmlTemplate, cur.receiptHtmlTemplate],
        [KEYS.ticketWidth,         String(cur.ticketWidth)],
        [KEYS.ticketHeight,        String(cur.ticketHeight)],
        [KEYS.ticketLabel,         cur.ticketLabel],
        [KEYS.ticketTagline,       cur.ticketTagline],
        [KEYS.ticketShowName,      String(cur.ticketShowName)],
        [KEYS.ticketShowDate,      String(cur.ticketShowDate)],
        [KEYS.ticketShowOrder,     String(cur.ticketShowOrder)],
        [KEYS.ticketHtmlTemplate,  cur.ticketHtmlTemplate],
      ]
      await Promise.all(pairs.map(([key, value]) => posApi.admin.updateVenueSetting(key, value)))
      setSaved({ ...cur }); setPreview({ ...cur })
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── State helpers ─────────────────────────────────────────────────────────
  const setInstant = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...cur, [key]: value }
    setCur(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setPreview(next)
  }

  const setDebounced = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...cur, [key]: value }
    setCur(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setPreview(next), 300)
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  function NumInput({ label, field, unit, min, max, description }: {
    label: string; field: 'receiptWidth' | 'ticketWidth' | 'ticketHeight'
    unit: string; min: number; max: number; description: string
  }) {
    const value = cur[field] as number
    return (
      <div>
        <label className="text-white text-sm font-medium block mb-0.5">{label}</label>
        <p className="text-slate-500 text-xs mb-2">{description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number" value={value} min={min} max={max}
            onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= min && n <= max) setInstant(field, n as Settings[typeof field]) }}
            className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400 text-sm">{unit}</span>
          <div className="flex gap-1">
            {[-5, -1, +1, +5].map((d) => (
              <button key={d}
                onClick={() => { const n = value + d; if (n >= min && n <= max) setInstant(field, n as Settings[typeof field]) }}
                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold border border-slate-600"
              >{d > 0 ? `+${d}` : d}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function TextInput({ label, field, placeholder, description }: {
    label: string; field: 'ticketLabel' | 'ticketTagline'
    placeholder?: string; description?: string
  }) {
    return (
      <div>
        <label className="text-white text-sm font-medium block mb-0.5">{label}</label>
        {description && <p className="text-slate-500 text-xs mb-2">{description}</p>}
        <input
          type="text" value={cur[field] as string} placeholder={placeholder}
          onChange={(e) => setDebounced(field, e.target.value as Settings[typeof field])}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )
  }

  type BoolField = 'receiptShowAddress' | 'receiptShowGstin' | 'receiptShowTax' | 'receiptShowCashier' | 'ticketShowName' | 'ticketShowDate' | 'ticketShowOrder'

  function Toggle({ label, field, description, disabled, disabledHint }: {
    label: string; field: BoolField
    description?: string; disabled?: boolean; disabledHint?: string
  }) {
    const on = cur[field] as boolean
    return (
      <div className={clsx('flex items-start gap-3', disabled && 'opacity-50')}>
        {/* Track — p-0 prevents browser button default padding shifting the thumb */}
        <button
          role="switch"
          aria-checked={on}
          onClick={() => !disabled && setInstant(field, (!on) as Settings[typeof field])}
          disabled={disabled}
          className={clsx(
            'relative shrink-0 w-10 h-6 rounded-full p-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 mt-0.5',
            on && !disabled ? 'bg-blue-600' : 'bg-slate-600',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          {/* Thumb — left-0 ensures anchor is always the button's left edge */}
          <span
            className={clsx(
              'absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
              on ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </button>
        <div>
          <p className="text-white text-sm font-medium">{label}</p>
          {disabled && disabledHint
            ? <p className="text-amber-500 text-xs mt-0.5">{disabledHint}</p>
            : description && <p className="text-slate-500 text-xs mt-0.5">{description}</p>}
        </div>
      </div>
    )
  }

  // ── Derived: iframe HTML ──────────────────────────────────────────────────
  const isReceipt      = activePreview === 'receipt'
  const activeTemplate = isReceipt ? preview.receiptHtmlTemplate : preview.ticketHtmlTemplate
  const hasTemplate    = activeTemplate.trim().length > 0

  const iframeHtml = hasTemplate
    ? (isReceipt
        ? renderReceiptTemplate(activeTemplate, preview, venue)
        : renderTicketTemplate(activeTemplate, preview, venue))
    : ''

  const templateField: keyof Settings = isReceipt ? 'receiptHtmlTemplate' : 'ticketHtmlTemplate'
  const templateVars  = isReceipt ? RECEIPT_VARS : TICKET_VARS

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminPageShell title="Print Layout" description="Customise receipt and ticket layout across all POS terminals" icon="🖨️">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell title="Print Layout" description="Customise receipt and ticket layout across all POS terminals" icon="🖨️">

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">{error}</div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">

        {/* ── Left: settings panel ── */}
        <div className="xl:w-80 shrink-0 space-y-5">

          {/* Receipt */}
          <div className="bg-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
              <span className="text-xl">🧾</span>
              <h2 className="text-white font-semibold">Receipt</h2>
            </div>
            <NumInput label="Paper width" field="receiptWidth" unit="mm" min={40} max={120} description="Thermal roll width. 58 mm = narrow, 80 mm = standard." />
            <div className="space-y-4">
              <Toggle label="Show address"        field="receiptShowAddress" description="Print registered address below venue name." disabled={!venue.address} disabledHint="No address set — edit in Venue Settings." />
              <Toggle label="Show GSTIN"          field="receiptShowGstin"   description="Print tax registration number." disabled={!venue.gstin} disabledHint="No GSTIN set — edit in Venue Settings." />
              <Toggle label="Show tax breakdown"  field="receiptShowTax"     description="Display GST line below subtotal." />
              <Toggle label="Show cashier name"   field="receiptShowCashier" description="Display the staff member's name." />
            </div>
            <div>
              <label className="text-white text-sm font-medium block mb-0.5">Footer message</label>
              <p className="text-slate-500 text-xs mb-2">Printed at the bottom. Leave blank for the default "Thank you for visiting!"</p>
              <textarea
                value={cur.receiptFooter}
                placeholder="e.g. Follow us @FunZone · T&C apply"
                rows={2}
                onChange={(e) => setDebounced('receiptFooter', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Ticket */}
          <div className="bg-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
              <span className="text-xl">🎟️</span>
              <h2 className="text-white font-semibold">Admission Ticket</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Width"  field="ticketWidth"  unit="mm" min={80}  max={300} description="DL = 210 mm" />
              <NumInput label="Height" field="ticketHeight" unit="mm" min={50}  max={200} description="DL = 99 mm"  />
            </div>
            <TextInput label="Ticket label" field="ticketLabel"   placeholder="Admission Ticket" description="Badge text in the top-right corner." />
            <TextInput label="Tagline"      field="ticketTagline" placeholder="Enjoy your visit!" description="Short line below product name. Leave blank to hide." />
            <div className="space-y-4">
              <Toggle label="Show visit date"    field="ticketShowDate"  />
              <Toggle label="Show customer name" field="ticketShowName"  />
              <Toggle label="Show order number"  field="ticketShowOrder" />
            </div>
          </div>

          {/* Save */}
          <div className="bg-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">Settings are shared across all POS terminals — no per-device configuration needed.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave} disabled={saving || !isDirty}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Layout'}
              </button>
              {savedOk && <span className="text-green-400 text-sm font-medium">✓ Saved</span>}
            </div>
            {isDirty && !saving && <p className="text-amber-400 text-xs mt-2">Unsaved changes</p>}
          </div>

        </div>

        {/* ── Right: preview + HTML editor ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Preview panel */}
          <div className="bg-slate-800 rounded-2xl overflow-hidden sticky top-6">

            {/* Tab bar */}
            <div className="flex items-center border-b border-slate-700">
              <div className="flex flex-1">
                {(['receipt', 'ticket'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivePreview(tab)}
                    className={clsx(
                      'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                      activePreview === tab ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                    )}
                  >
                    <span>{tab === 'receipt' ? '🧾' : '🎟️'}</span>
                    {tab === 'receipt' ? 'Receipt' : 'Admission Ticket'}
                    {tab === 'receipt' && cur.receiptHtmlTemplate && (
                      <span className="ml-1 text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded">custom</span>
                    )}
                    {tab === 'ticket' && cur.ticketHtmlTemplate && (
                      <span className="ml-1 text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded">custom</span>
                    )}
                  </button>
                ))}
              </div>

              {/* HTML mode toggle */}
              <button
                onClick={() => setHtmlMode((v) => !v)}
                className={clsx(
                  'flex items-center gap-1.5 mr-4 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors',
                  htmlMode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                )}
              >
                <span>{'</>'}</span>
                HTML
              </button>
            </div>

            {/* Visual preview */}
            {!htmlMode && (
              <>
                <div className="p-6 bg-slate-900/40 min-h-64 flex items-center justify-center overflow-auto">
                  {hasTemplate ? (
                    <iframe
                      srcDoc={iframeHtml}
                      sandbox="allow-same-origin"
                      className="border-0 rounded"
                      style={{ width: '100%', height: 420 }}
                      title="Custom template preview"
                    />
                  ) : (
                    activePreview === 'receipt'
                      ? <ReceiptPreview s={preview} venue={venue} />
                      : <TicketPreview  s={preview} venue={venue} />
                  )}
                </div>
                <div className="px-6 py-3 border-t border-slate-700 flex items-center justify-between">
                  <p className="text-slate-500 text-xs">
                    {activePreview === 'receipt'
                      ? `${preview.receiptWidth} mm wide · height follows content`
                      : `${preview.ticketWidth} × ${preview.ticketHeight} mm`}
                    {hasTemplate && <span className="ml-2 text-blue-400">· custom HTML template active</span>}
                  </p>
                  <p className="text-slate-600 text-xs">Live preview · not to scale</p>
                </div>
              </>
            )}

            {/* HTML editor mode */}
            {htmlMode && (
              <div className="flex flex-col xl:flex-row" style={{ minHeight: 520 }}>

                {/* Code editor */}
                <div className="xl:w-1/2 border-b xl:border-b-0 xl:border-r border-slate-700 flex flex-col">
                  <HtmlEditor
                    value={cur[templateField] as string}
                    onChange={(v) => setDebounced(templateField, v)}
                    vars={templateVars}
                    label={`${activePreview === 'receipt' ? 'receipt' : 'ticket'}-template.html`}
                  />
                  {/* Footer actions */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-t border-slate-700 shrink-0">
                    <button
                      onClick={() => {
                        const tpl = activePreview === 'receipt' ? defaultReceiptTemplate() : defaultTicketTemplate()
                        setDebounced(templateField, tpl)
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    >
                      Load default template
                    </button>
                    {(cur[templateField] as string).length > 0 && (
                      <button
                        onClick={() => setInstant(templateField, '' as Settings[typeof templateField])}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                      >
                        Clear (use smart preview)
                      </button>
                    )}
                  </div>
                </div>

                {/* Rendered preview */}
                <div className="xl:w-1/2 flex flex-col bg-slate-900/40">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
                    <span className="text-slate-500 text-xs">Rendered preview</span>
                    {!(cur[templateField] as string).trim() && (
                      <span className="text-slate-600 text-xs">— load a template to preview</span>
                    )}
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    {(preview[templateField] as string).trim() ? (
                      <iframe
                        key={preview[templateField] as string}
                        srcDoc={iframeHtml}
                        sandbox="allow-same-origin"
                        className="w-full border-0 rounded"
                        style={{ height: 460 }}
                        title="HTML template preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-3">
                        <span className="text-4xl">📄</span>
                        <p className="text-sm">No template yet</p>
                        <p className="text-xs">Click "Load default template" to start</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </AdminPageShell>
  )
}
