import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, post, setCsrfToken } from './api'

afterEach(() => {
  setCsrfToken(null)
  vi.unstubAllGlobals()
})

describe('API client', () => {
  it('sends the server CSRF token on state-changing requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    setCsrfToken('csrf-test-token')

    await post('/api/example', { value: 1 })

    const [, options] = fetchMock.mock.calls[0]
    expect((options.headers as Headers).get('X-CSRF-Token')).toBe('csrf-test-token')
    expect(options.credentials).toBe('same-origin')
  })

  it('surfaces the server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'Explicit response required.' },
    }), { status: 409, headers: { 'Content-Type': 'application/json' } })))

    await expect(api('/api/example')).rejects.toThrow('Explicit response required.')
  })
})
