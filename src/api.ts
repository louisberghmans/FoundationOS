export type Role = 'administrator' | 'foundation_manager' | 'voting_member' | 'finance_manager' | 'project_steward' | 'reviewer' | 'viewer'

export interface User {
  id: string
  username: string
  displayName: string
  email: string | null
  role: Role
  active: boolean
  capabilities: string[]
}

export interface Bootstrap {
  setupRequired: boolean
  productName: string
  version: string
  user: User | null
  csrfToken: string | null
}

// The server snapshot is intentionally schema-driven; feature views narrow row fields as they consume them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataRow = Record<string, any>

export interface AppData {
  applicationVersion: string
  foundation: Record<string, unknown>
  members: User[]
  objectives: DataRow[]
  objectiveObservations: DataRow[]
  organizations: DataRow[]
  opportunities: DataRow[]
  decisions: DataRow[]
  decisionResponses: DataRow[]
  electorate: DataRow[]
  funds: DataRow[]
  budgets: DataRow[]
  commitments: DataRow[]
  agreements: DataRow[]
  amendments: DataRow[]
  schedules: DataRow[]
  payments: DataRow[]
  documents: DataRow[]
  meetings: DataRow[]
  meetingSlots: DataRow[]
  availability: DataRow[]
  agendaItems: DataRow[]
  reviews: DataRow[]
  auditEvents: DataRow[]
  stages: string[]
}

let csrfToken: string | null = null

export function setCsrfToken(value: string | null) {
  csrfToken = value
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (csrfToken && options.method && !['GET', 'HEAD'].includes(options.method)) headers.set('X-CSRF-Token', csrfToken)
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed (${response.status})`)
  return payload as T
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
