import { useEffect, useState } from 'react'
import { lookupDomain, createEndpoint } from '@/api/client'
import type { LookupResult } from '@/api/client'
import { getSettings } from '@/lib/storage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function daysLabel(days: number): string {
  if (days < 0)   return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  return `${days}d remaining`
}

type Color = 'green' | 'amber' | 'red' | 'gray'

function colorFromDays(days: number): Color {
  if (days < 0)   return 'red'
  if (days <= 7)  return 'red'
  if (days <= 30) return 'amber'
  return 'green'
}

const BADGE: Record<Color, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red:   'bg-red-50 text-red-700 ring-1 ring-red-200',
  gray:  'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
}

const DOT: Record<Color, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red:   'bg-red-500',
  gray:  'bg-gray-400',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Popup() {
  const [hostname, setHostname] = useState<string | null>(null)
  const [port, setPort]         = useState(443)
  const [isHttps, setIsHttps]   = useState(true)

  const [configured, setConfigured] = useState(false)
  const [baseUrl, setBaseUrl]       = useState('')
  const [loading, setLoading]       = useState(true)
  const [lookup, setLookup]         = useState<LookupResult | null>(null)
  const [adding, setAdding]         = useState(false)
  const [added, setAdded]           = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url) { setLoading(false); return }

    let host: string | null = null
    let p = 443
    try {
      const u = new URL(tab.url)
      if (u.protocol !== 'https:') { setIsHttps(false); setLoading(false); return }
      host = u.hostname
      p = u.port ? parseInt(u.port, 10) : 443
    } catch { setIsHttps(false); setLoading(false); return }

    setHostname(host)
    setPort(p)

    const settings = await getSettings()
    if (settings) {
      setConfigured(true)
      setBaseUrl(settings.baseUrl)
      try {
        const result = await lookupDomain(host, p)
        setLookup(result)
      } catch { /* leave lookup null */ }
    }

    setLoading(false)
  }

  async function handleAdd() {
    if (!hostname) return
    setAdding(true)
    try {
      const ep = await createEndpoint(hostname, port)
      setLookup(prev => prev ? { ...prev, monitored: true, endpointId: ep.id } : prev)
      setAdded(true)
    } finally { setAdding(false) }
  }

  function openOptions() { chrome.runtime.openOptionsPage() }
  function openTLSentinel(path = '') { chrome.tabs.create({ url: baseUrl + path }) }

  const color = lookup ? colorFromDays(lookup.daysRemaining) : 'gray'

  return (
    <div className="w-80 flex flex-col bg-white text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Brand header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/shield.png" alt="" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold tracking-wide text-white">TLSentinel</span>
        </div>
        <button
          onClick={openOptions}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-4">

        {/* Not HTTPS */}
        {!isHttps && (
          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
            <LockOpenIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Certificate monitoring only applies to HTTPS pages.
          </div>
        )}

        {/* Loading */}
        {isHttps && loading && (
          <div className="flex items-center justify-center py-6">
            <span className="text-sm text-slate-400">Loading…</span>
          </div>
        )}

        {/* Main content */}
        {isHttps && !loading && hostname && (
          <>
            {/* Hostname pill */}
            <div className="flex items-center rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
              <span className="truncate text-sm font-medium text-slate-700">
                {hostname}{port !== 443 && <span className="text-slate-400">:{port}</span>}
              </span>
            </div>

            {/* Cert card — shown whenever we have lookup data */}
            {lookup && (
              <div className="rounded-lg ring-1 ring-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Certificate</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[color]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${DOT[color]}`} />
                    {daysLabel(lookup.daysRemaining)}
                  </span>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  <CertRow label="Common name"  value={lookup.commonName} />
                  <CertRow label="Issuer"       value={lookup.issuer} />
                  <CertRow label="Expires"      value={fmtDate(lookup.notAfter)} />
                  <CertRow label="SHA-256"      value={lookup.fingerprint} wrap />
                </div>
              </div>
            )}

            {/* Monitoring status */}
            <div className="rounded-lg ring-1 ring-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">TLSentinel Monitoring</span>
              </div>

              <div className="px-3 py-3 space-y-2.5">
                {!configured && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                      Not connected
                    </div>
                    <button onClick={openOptions} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                      Set up →
                    </button>
                  </div>
                )}

                {configured && !lookup && (
                  <p className="text-xs text-slate-400">Could not reach TLSentinel.</p>
                )}

                {configured && lookup && lookup.monitored && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      {added ? 'Added to monitoring' : 'Monitored'}
                    </div>
                    {lookup.endpointId && (
                      <button
                        onClick={() => openTLSentinel(`/endpoints/${lookup.endpointId}`)}
                        className="w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                      >
                        Open in TLSentinel →
                      </button>
                    )}
                  </div>
                )}

                {configured && lookup && !lookup.monitored && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                      Not monitored
                    </div>
                    <button
                      onClick={handleAdd}
                      disabled={adding}
                      className="w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                    >
                      {adding ? 'Adding…' : '+ Add to Monitoring'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CertRow({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className={`flex gap-3 ${wrap ? 'flex-col' : 'items-center justify-between'}`}>
      <span className="shrink-0 text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-medium text-slate-700 font-mono ${wrap ? 'break-all' : 'truncate text-right'}`} title={value}>{value}</span>
    </div>
  )
}

function GearIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}


function LockOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  )
}
