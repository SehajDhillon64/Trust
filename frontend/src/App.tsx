import { useEffect, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export function App() {
  const [health, setHealth] = useState<string>('...')
  const [items, setItems] = useState<any[]>([])
  const [orderId, setOrderId] = useState<string>('')

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`).then(r => r.json()).then(d => setHealth(JSON.stringify(d)))
    fetch(`${BACKEND_URL}/api/items`).then(r => r.json()).then(d => setItems(d.items || []))
  }, [])

  async function createOrder() {
    const res = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '5.00', currency: 'USD' })
    })
    const data = await res.json()
    setOrderId(data.orderId || '')
  }

  async function capture() {
    if (!orderId) return
    const res = await fetch(`${BACKEND_URL}/api/payments/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    })
    const data = await res.json()
    alert('Captured: ' + JSON.stringify(data))
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Frontend ↔ Backend (APIs)</h1>
      <p>Health: {health}</p>
      <h2>Items</h2>
      <pre style={{ background: '#f6f6f6', padding: 12 }}>{JSON.stringify(items, null, 2)}</pre>
      <h2>PayPal</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={createOrder}>Create $5.00 Order</button>
        <button disabled={!orderId} onClick={capture}>Capture Order</button>
      </div>
      {orderId && <p>Order ID: {orderId}</p>}
    </div>
  )
}

