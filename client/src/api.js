// Small fetch wrapper: sends cookies, parses JSON, throws on error responses.
// `body` can be a plain object (sent as JSON) or FormData (for file uploads).
export async function api(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body && !isForm ? JSON.stringify(body) : body,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = res.status
    throw error
  }
  return data
}
