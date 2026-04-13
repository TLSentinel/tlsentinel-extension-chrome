export interface ExtensionSettings {
  baseUrl: string   // e.g. https://tls.example.com
  apiKey: string
}

export async function getSettings(): Promise<ExtensionSettings | null> {
  const result = await chrome.storage.sync.get(['baseUrl', 'apiKey'])
  if (!result.baseUrl || !result.apiKey) return null
  return { baseUrl: result.baseUrl.replace(/\/$/, ''), apiKey: result.apiKey }
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({
    baseUrl: settings.baseUrl.replace(/\/$/, ''),
    apiKey: settings.apiKey,
  })
}
