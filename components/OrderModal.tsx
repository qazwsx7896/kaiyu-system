'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type ItemRow = { item: string; qty: string }

export default function OrderModal({ editingOrder, defaultCol, onClose, onSaved }: any) {
  const [customer, setCustomer] = useState(editingOrder?.customer || '')
  const [items, setItems] = useState<ItemRow[]>(
    editingOrder ? [{ item: editingOrder.item || '', qty: editingOrder.qty || '' }] : [{ item: '', qty: '' }]
  )
  const [date, setDate] = useState(editingOrder?.date || '')
  const [process, setProcessVal] = useState(editingOrder?.process || '')
  const [note, setNote] = useState(editingOrder?.note || '')
  const [urgent, setUrgent] = useState(editingOrder?.urgent || false)
  const [col, setCol] = useState(editingOrder?.col || defaultCol)
  const [saving, setSaving] = useState(false)

  function updateItem(index: number, field: 'item' | 'qty', value: string) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addItemRow() {
    setItems((prev) => [...prev, { item: '', qty: '' }])
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function save() {
    const validItems = items.filter((row) => row.item.trim())

    if (!customer.trim() || validItems.length === 0) {
      alert('請填寫客戶名稱，並至少填寫一個品項')
      return
    }

    setSaving(true)

    const shared = { customer, date, process, note, urgent, col }

    if (editingOrder) {
      const o = validItems[0]
      await supabase.from('orders').update({ ...shared, item: o.item, qty: o.qty }).eq('id', editingOrder.id)
    } else {
      const rows = validItems.map((row) => ({ ...shared, item: row.item, qty: row.qty }))
      await supabase.from('orders').insert(rows)
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
          <input style={input} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="例：永盛潤滑油行" />
        </Field>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>
              品項 *（可換行輸入多行文字）
            </label>
            {!editingOrder && (
              <button onClick={addItemRow} style={addItemBtnInline}>
                ＋ 新增品項
              </button>
            )}
          </div>

          {items.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'stretch' }}>
              <textarea
                style={{ ...textarea, flex: 2, minHeight: 80 }}
                value={row.item}
                onChange={(e) => updateItem(idx, 'item', e.target.value)}
                placeholder={'例：AW-68\nHD-150\n(按 Enter 換行)'}
                rows={3}
              />
              <input
                style={{ ...input, flex: 1, minWidth: 0, alignSelf: 'flex-start' }}
                value={row.qty}
                onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                placeholder="數量 1D"
              />
              {!editingOrder && items.length > 1 && (
                <button
                  onClick={() => removeItemRow(idx)}
                  style={{ ...btnCard, padding: '9px 10px', flexShrink: 0, alignSelf: 'flex-start' }}
                  title="移除此品項"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>

        <Field label="預計出貨日">
          <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="加工需求（派工單）">
          <textarea style={textarea} value={process} onChange={(e) => setProcessVal(e.target.value)} placeholder="例：消泡劑、分裝20L×5桶、添加防鏽劑" />
        </Field>
        <Field label="備註">
          <textarea style={textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="其他備注" />
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
const modal: React.CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid #ddd', padding: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', color: '#1a1a1a' }
const input: React.CSSProperties = { width: '100%', fontSize: 15, padding: '9px 11px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#1a1a1a', boxSizing: 'border-box' }
const textarea: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, fontFamily: 'inherit', lineHeight: 1.5 }
const btnPrimary: React.CSSProperties = { fontSize: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }
const btnCancel: React.CSSProperties = { fontSize: 14, padding: '8px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#555', cursor: 'pointer' }
const btnCard: React.CSSProperties = { fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '0.5px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }
const addItemBtnInline: React.CSSProperties = { fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '0.5px solid #378ADD', background: '#E6F1FB', color: '#185FA5', cursor: 'pointer', fontWeight: 500, flexShrink: 0 }
