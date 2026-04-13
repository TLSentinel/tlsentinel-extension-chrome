// Background service worker — badge updates only.
// Badge color/text is updated whenever the active tab changes or a navigation completes.

import { setBadge, clearBadge, stateFromDays } from '@/lib/badge'
import { lookupDomain } from '@/api/client'
import { getSettings } from '@/lib/storage'

function parseHttpsUrl(url: string | undefined): { hostname: string; port: number } | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    return { hostname: u.hostname, port: u.port ? parseInt(u.port, 10) : 443 }
  } catch { return null }
}

async function updateBadge(tabId: number, url: string | undefined) {
  const parsed = parseHttpsUrl(url)
  if (!parsed) { await clearBadge(tabId); return }

  const settings = await getSettings()
  if (!settings) { await clearBadge(tabId); return }

  try {
    const result = await lookupDomain(parsed.hostname, parsed.port)
    await setBadge(tabId, stateFromDays(result.daysRemaining), result.daysRemaining)
  } catch {
    await clearBadge(tabId)
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId)
  await updateBadge(tabId, tab.url)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (active?.id !== tabId) return
  await updateBadge(tabId, tab.url)
})

chrome.alarms.create('badge-refresh', { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'badge-refresh') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) await updateBadge(tab.id, tab.url)
})

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return
  if (!changes.baseUrl && !changes.apiKey) return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) await updateBadge(tab.id, tab.url)
})
