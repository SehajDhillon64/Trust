const API_BASE = (import.meta as any)?.env?.VITE_BACKEND_URL || ''

type RpcResponse<T> = { result: T }

export async function rpcCall<T = any>(method: string, params?: any | any[]): Promise<T> {
  const res = await fetch(`${API_BASE}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ method, params })
  })
  if (!res.ok) {
    let msg = `RPC ${method} failed with ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {}
    throw new Error(msg)
  }
  const data = (await res.json()) as RpcResponse<T>
  return data.result as T
}

