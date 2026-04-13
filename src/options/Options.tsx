import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/lib/storage'
import { findEndpointByHost } from '@/api/client'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TestState = 'idle' | 'testing' | 'ok' | 'error'

export default function Options() {
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey]   = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [testState, setTestState] = useState<TestState>('idle')
  const [testMsg, setTestMsg]     = useState('')

  useEffect(() => {
    getSettings().then(s => {
      if (!s) return
      setBaseUrl(s.baseUrl)
      setApiKey(s.apiKey)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!baseUrl.trim() || !apiKey.trim()) return
    setSaveState('saving')
    try {
      await saveSettings({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
    }
  }

  async function handleTest() {
    if (!baseUrl.trim() || !apiKey.trim()) return
    setTestState('testing')
    setTestMsg('')
    try {
      await saveSettings({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() })
      await findEndpointByHost('__connection_test__')
      setTestState('ok')
      setTestMsg('Connected successfully.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setTestState('error')
      setTestMsg(msg)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Brand header ───────────────────────────────────────────── */}
      <div
        className="flex items-center px-8 py-4 shadow-md"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <img src="/logo_horizontal.png" alt="TLSentinel" className="h-7 object-contain" />
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-5 relative">

          {/* Page title */}
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Extension Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Connect to your TLSentinel instance. Create an API key under{' '}
              <strong className="font-medium text-slate-700">Settings → API Keys</strong> in TLSentinel.
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 space-y-4">

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="baseUrl">
                  Instance URL
                </label>
                <input
                  id="baseUrl"
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://tls.example.com"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="apiKey">
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="tlsentinel_••••••••••••••••"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm font-mono focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
                />
              </div>

              {/* Test result */}
              {testState === 'ok' && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                  <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">{testMsg}</p>
                </div>
              )}
              {testState === 'error' && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                  <XIcon className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700 break-all">{testMsg}</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="submit"
                disabled={saveState === 'saving'}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {saveState === 'saving' ? 'Saving…' : 'Save'}
              </button>

              <button
                type="button"
                onClick={handleTest}
                disabled={testState === 'testing' || !baseUrl || !apiKey}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {testState === 'testing' ? 'Testing…' : 'Test Connection'}
              </button>

              {saveState === 'saved' && (
                <span className="ml-auto flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <CheckIcon className="h-4 w-4" />
                  Saved
                </span>
              )}
              {saveState === 'error' && (
                <span className="ml-auto text-sm text-red-600 font-medium">Failed to save.</span>
              )}

            </div>
          </form>

          {/* CORS note */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
            <p className="font-semibold">CORS note</p>
            <p>
              If the extension cannot reach your instance, ensure your TLSentinel server allows requests
              from{' '}
              <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">chrome-extension://</code>{' '}
              origins.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
