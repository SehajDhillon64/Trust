export async function rpc<T = any>(method: string, params?: any): Promise<T> {
  const base = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000'
  const resp = await fetch(`${base.replace(/\/$/, '')}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ method, params })
  })
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(body?.error || `RPC ${method} failed (${resp.status})`)
  return body.result as T
}

// Backward compatibility for older wrappers
export const rpcCall = rpc;

