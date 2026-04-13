export type BadgeState = 'ok' | 'warning' | 'critical' | 'expired' | 'unmonitored' | 'unconfigured'

const COLORS: Record<BadgeState, string> = {
  ok:           '#22c55e',
  warning:      '#f59e0b',
  critical:     '#ef4444',
  expired:      '#dc2626',
  unmonitored:  '#6b7280',
  unconfigured: '#6b7280',
}

export function stateFromDays(days: number): BadgeState {
  if (days < 0)   return 'expired'
  if (days <= 7)  return 'critical'
  if (days <= 30) return 'warning'
  return 'ok'
}

export async function setBadge(tabId: number, state: BadgeState, days?: number): Promise<void> {
  const color = COLORS[state]
  let text = ''

  if (state === 'expired')  text = 'EXP'
  else if (state === 'critical' && days !== undefined) text = `${days}d`
  else if (state === 'warning' && days !== undefined)  text = `${days}d`
  else if (state === 'ok') text = '✓'

  await chrome.action.setBadgeBackgroundColor({ color, tabId })
  await chrome.action.setBadgeText({ text, tabId })
}

export async function clearBadge(tabId: number): Promise<void> {
  await chrome.action.setBadgeText({ text: '', tabId })
}
