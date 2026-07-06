'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OrderModal({ editingOrder, defaultCol, onClose, onSaved }: any) {
  const [customer, setCustomer] = useState(editingOrder?.customer || '')
  const [item, setItem] = useState(editingOrder?.item || '')
  const [qty, setQty] = useState(editingOrder?.qty || '')
  const [date, setDate] = useState(editingOrder?.date || '')
  const [process, setProcessVal] = useState(editingOrder?.process || '')
  const [note, setNote] = useState(editingOrder?.note || '')
  const [urgent, setUrgent] = useState(editingOrder?.urgent || false)
  const [col, setCol] = useState(editingOrder?.col || defaultCol)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!customer.trim() || !item.trim()) {
      alert('請填寫客戶名稱與品項')
      return
    }
    setSaving(true)
    const payload = { customer, item, qty, date, process, note, urgent, col }

    if (editingOrder) {
      await supabase.from('orders').update(payload).eq('id', editingOrder.id)
    } else {
      await supabase.from('orders').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
          {editingOrder ? '✏️ 編輯訂單' : '新增訂單'}
        </h3>

        <Field label="客戶名稱 *">
          <input style={input} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="例：台積電、台塑" />
        </Field>
        <Field label="品項 *">
          <textarea style={{...textarea, minHeight: 80}} value={item} onChange={(e) => setItem(e.target.value)} placeholder="例：AW-68、HD-150、VG-46" rows={3} onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation() }} />
        </Field>
        <Field label="數量">
          <input style={input} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="例：1D、1P、200L" />
        </Field>
        <Field label="預計出貨日">
          <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="加工需求（派工單）">
          <textarea style={textarea} value={process} onChange={(e) => setProcessVal(e.target.value)} placeholder="例：消泡劑、分裝20L×5桶、添加防鏽劑"
          onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation() }} />
        </Field>
        <Field label="備註">
          <textarea style={textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="其他備注"
          onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation() }} />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, marginBottom: 12 }}>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <label>急單（優先處理）</label>
        </div>

        <Field label="加入欄位">
          <select style={input} value={col} onChange={(e) => setCol(e.target.value)}>
            <option value="todo">待生產</option>
            <option value="wip">生產中</option>
            <option value="done">待出貨</option>
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={btnCancel}>取消</button>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? '儲存中...' : '儲存'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 14, color: '#555', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 14 }
const modal: React.CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid #ddd', padding: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', color: '#1a1a1a' }
const input: React.CSSProperties = { width: '100%', fontSize: 15, padding: '9px 11px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#1a1a1a' }
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56 }
const btnPrimary: React.CSSProperties = { fontSize: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }
const btnCancel: React.CSSProperties = { fontSize: 14, padding: '8px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#555', cursor: 'pointer' }
