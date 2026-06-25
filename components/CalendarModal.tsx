'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type EventItem = { id: string; date: string; type: string; text: string }

const typeOptions = [
  { value: 'delivery', label: '供應商送貨' },
  { value: 'oil', label: '換油' },
  { value: 'unload', label: '拆櫃' },
  { value: 'load', label: '裝櫃' },
  { value: 'urgent', label: '緊急事項' },
  { value: 'other', label: '其他' },
]

function typeLabel(t: string) {
  return typeOptions.find((o) => o.value === t)?.label || t
}

function dotColor(t: string) {
  return ({ delivery: '#378ADD', oil: '#EF9F27', unload: '#639922', load: '#7F77DD', urgent: '#E24B4A', other: '#aaa' } as any)[t] || '#aaa'
}

export default function CalendarModal({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [calY, setCalY] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [selDate, setSelDate] = useState<string | null>(null)
  const [newType, setNewType] = useState('delivery')
  const [newText, setNewText] = useState('')

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true })
    if (data) setEvents(data as EventItem[])
  }

  useEffect(() => {
    loadEvents()
  }, [])

  async function addEvent() {
    if (!newText.trim() || !selDate) {
      alert('請輸入行程內容')
      return
    }
    await supabase.from('events').insert({ date: selDate, type: newType, text: newText })
    setNewText('')
    loadEvents()
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    loadEvents()
  }

  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(calY, calM, 1).getDay()
  const daysInMonth = new Date(calY, calM + 1, 0).getDate()
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  function calPrev() {
    if (calM === 0) { setCalM(11); setCalY(calY - 1) } else setCalM(calM - 1)
  }
  function calNext() {
    if (calM === 11) { setCalM(0); setCalY(calY + 1) } else setCalM(calM + 1)
  }

  const dayEvents = selDate ? events.filter((e) => e.date === selDate) : []

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 540 }}>
        <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>📅 行事曆公告管理</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={calPrev} style={navBtn}>‹</button>
          <span style={{ fontSize: 17, fontWeight: 500 }}>{calY}年 {monthNames[calM]}</span>
          <button onClick={calNext} style={navBtn}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 12 }}>
          {['日', '一', '二', '三', '四', '五', '六'].map((h) => (
            <div key={h} style={{ textAlign: 'center', fontSize: 12, color: '#aaa', padding: '4px 0', fontWeight: 500 }}>{h}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1
            const ds = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const de = events.filter((e) => e.date === ds)
            const isToday = ds === today
            const isSel = ds === selDate
            return (
              <div
                key={ds}
                onClick={() => setSelDate(ds)}
                style={{
                  minHeight: 44, borderRadius: 7, border: isSel ? '2px solid #378ADD' : isToday ? '0.5px solid #378ADD' : '0.5px solid #eee',
                  padding: 4, cursor: 'pointer', background: isToday ? '#E6F1FB' : de.length ? '#fff8e6' : '#fff',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: isToday ? '#185FA5' : '#333' }}>{d}</div>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                  {de.slice(0, 3).map((e) => (
                    <span key={e.id} style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(e.type) }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {selDate && (
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 12, border: '0.5px solid #eee' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 8 }}>{selDate} 行程</div>
            {dayEvents.length === 0 ? (
              <p style={{ fontSize: 13, color: '#bbb', padding: '4px 0' }}>此日尚無行程</p>
            ) : (
              dayEvents.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                  <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 8, background: '#FAEEDA', color: '#633806', border: '0.5px solid #FAC775' }}>{typeLabel(e.type)}</span>
                  <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{e.text}</span>
                  <button onClick={() => deleteEvent(e.id)} style={delBtn}>🗑️ 刪除</button>
                </div>
              ))
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #eee' }}>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} style={selectStyle}>
                {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="行程內容…" style={inputStyle} />
              <button onClick={addEvent} style={addEvBtn}>新增</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} style={btnPrimary}>完成</button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 14 }
const modal: React.CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid #ddd', padding: 20, width: '100%', maxHeight: '90vh', overflowY: 'auto', color: '#1a1a1a' }
const navBtn: React.CSSProperties = { background: '#fff', border: '0.5px solid #ccc', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', fontSize: 16, color: '#555' }
const delBtn: React.CSSProperties = { background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 6, cursor: 'pointer', color: '#A32D2D', fontSize: 13, padding: '4px 10px' }
const selectStyle: React.CSSProperties = { fontSize: 13, padding: '6px 9px', border: '1px solid #ccc', borderRadius: 7, background: '#fff', color: '#333' }
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 120, fontSize: 13, padding: '6px 9px', border: '1px solid #ccc', borderRadius: 7, background: '#fff', color: '#333' }
const addEvBtn: React.CSSProperties = { fontSize: 13, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }
const btnPrimary: React.CSSProperties = { fontSize: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }
