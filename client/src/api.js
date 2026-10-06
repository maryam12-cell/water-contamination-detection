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
  if (!res.ok) throw apiError(res, data)
  return data
}

function apiError(res, data) {
  const error = new Error(data.error || 'Request failed')
  error.status = res.status
  return error
}

// Downloads a file (e.g. a PDF) from the API and saves it with the given name
export async function downloadFile(path, filename) {
  const res = await fetch(`/api${path}`, { credentials: 'include' })
  if (!res.ok) throw apiError(res, await res.json().catch(() => ({})))

  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing the file
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
