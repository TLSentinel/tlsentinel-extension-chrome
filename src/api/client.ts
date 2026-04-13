import { getSettings } from '@/lib/storage'

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

export interface EndpointList {
  items: EndpointItem[]
  totalCount: number
}

export interface CertItem {
  fingerprint: string
  commonName: string
  notAfter: string
  daysRemaining: number
}

export interface EndpointDetail {
  id: string
  name: string
  dnsName: string
  port: number
  type: string
  activeCerts: Array<{
    fingerprint: string
    isCurrent: boolean
    commonName: string
    notAfter: string
  }>
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

// Find endpoints matching a hostname (searches name + dnsName).
// We fetch with the hostname as the search term and filter by exact dnsName.
export async function findEndpointByHost(hostname: string): Promise<EndpointItem | null> {
  const data = await apiFetch<EndpointList>(`/endpoints?name=${encodeURIComponent(hostname)}&page_size=50`)
  const exact = data.items.find(ep => ep.dnsName.toLowerCase() === hostname.toLowerCase())
  return exact ?? null
}

// Get full endpoint detail including activeCerts, then return the current cert.
export async function getActiveCert(endpointId: string): Promise<CertItem | null> {
  const detail = await apiFetch<EndpointDetail>(`/endpoints/${endpointId}`)
  const cert = detail.activeCerts.find(c => c.isCurrent) ?? detail.activeCerts[0] ?? null
  if (!cert) return null
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((new Date(cert.notAfter).getTime() - Date.now()) / msPerDay)
  return { fingerprint: cert.fingerprint, commonName: cert.commonName, notAfter: cert.notAfter, daysRemaining }
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
