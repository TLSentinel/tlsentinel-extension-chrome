import { getSettings } from '@/lib/storage'

export interface LookupResult {
  domain: string
  port: number
  commonName: string
  fingerprint: string
  issuer: string
  sans: string[]
  notBefore: string
  notAfter: string
  daysRemaining: number
  valid: boolean
  monitored: boolean
  endpointId: string | null
}

export interface EndpointItem {
  id: string
  name: string
  dnsName: string
  port: number
  type: string
  status: string
  enabled: boolean
  earliestExpiry: string | null
  hasError: boolean
  errorMessage: string | null
}

export interface CreateEndpointRequest {
  name: string
  dnsName: string
  port: number
  type: string
  enabled: boolean
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const settings = await getSettings()
  if (!settings) throw new Error('NOT_CONFIGURED')

  const res = await fetch(`${settings.baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${text || res.statusText}`)
  }

  return res.json() as Promise<T>
}

// Lightweight auth check — just verifies the API key and base URL are valid.
export async function testConnection(): Promise<void> {
  await apiFetch<unknown>('/certificates?page_size=1')
}

// Real-time TLS lookup — server dials the domain and returns live cert data
// plus whether it's monitored in TLSentinel.
export async function lookupDomain(hostname: string, port = 443): Promise<LookupResult> {
  return apiFetch<LookupResult>(
    `/certificates/lookup?domain=${encodeURIComponent(hostname)}&port=${port}`
  )
}

// Create a new endpoint for a hostname.
export async function createEndpoint(hostname: string, port = 443): Promise<EndpointItem> {
  return apiFetch<EndpointItem>('/endpoints', {
    method: 'POST',
    body: JSON.stringify({
      name: hostname,
      dnsName: hostname,
      port,
      type: 'host',
      enabled: true,
    } satisfies CreateEndpointRequest),
  })
}
