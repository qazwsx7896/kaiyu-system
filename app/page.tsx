'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import OrderModal from '@/components/OrderModal'
import ShipModal from '@/components/ShipModal'
import CalendarModal from '@/components/CalendarModal'

type Order = {
  id: string
  col: 'todo' | 'wip' | 'done'
  customer: string
  item: string
  qty: string
  date: string
  process: string
  note: string
  urgent: boolean
  created_at: string
  sort_order: number | null
}

type Shipped = {
  id: string
  customer: string
  item: string
  qty: string
  work_order: string | null
  note: string | null
  shipped_date: string
  shipped_time: string
}

type EventItem = {
  id: string
  date: string
  type: string
  text: string
}

const typeLabel: Record<string, string> = {
  delivery: '供應商送貨',
  oil: '換油',
  unload: '拆櫃',
  load: '裝櫃',
  urgent: '緊急事項',
  other: '其他',
}

function todayStr() {
  const now = new Date()
  const taipeiOffset = 8 * 60
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const taipei = new Date(utc + taipeiOffset * 60000)
  const y = taipei.getFullYear()
  const m = String(taipei.getMonth() + 1).padStart(2, '0')
  const d = String(taipei.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekdayChinese(dateStr: string): string {
  const labels = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr + 'T00:00:00')
  return labels[d.getDay()]
}

function fmtDateWithWeekday(s: string): string {
  if (!s) return ''
  const p = s.split('-')
  return `${p[1]}/${p[2]}（${weekdayChinese(s)}）`
}

function fmtDate(s: string) {
  if (!s) return ''
  const p = s.split('-')
  return `${p[1]}/${p[2]}`
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([])
  const [shipped, setShipped] = useState<Shipped[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [defaultCol, setDefaultCol] = useState<'todo' | 'wip' | 'done'>('todo')

  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null)

  const [calModalOpen, setCalModalOpen] = useState(false)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  async function loadAll() {
    const today = todayStr()

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    const { data: shippedData } = await supabase
      .from('shipped')
      .select('*')
      .eq('shipped_date', today)
      .order('created_at', { ascending: true })

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })

    if (ordersData) setOrders(ordersData as Order[])
    if (shippedData) setShipped(shippedData as Shipped[])
    if (eventsData) setEvents(eventsData as EventItem[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()

    const channel = supabase
      .channel('kaiyu-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipped' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadAll())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function openAddOrder(col: 'todo' | 'wip' | 'done') {
    setEditingOrder(null)
    setDefaultCol(col)
    setOrderModalOpen(true)
  }

  function openEditOrder(o: Order) {
    setEditingOrder(o)
    setOrderModalOpen(true)
  }

  async function moveOrder(id: string, col: string) {
    await supabase.from('orders').update({ col }).eq('id', id)
  }

  // 同一欄內拖拉排序：dragId 拖到 targetId 的位置
  // 急單只能在急單區塊內排序，一般單只能在一般區塊內排序
  async function reorderWithinColumn(colOrders: Order[], dragId: string, targetId: string) {
    if (dragId === targetId) return
    const dragOrder = colOrders.find((o) => o.id === dragId)
    const targetOrder = colOrders.find((o) => o.id === targetId)
    if (!dragOrder || !targetOrder) return
    // 急單與非急單不能混拖
    if (dragOrder.urgent !== targetOrder.urgent) return

    const group = colOrders.filter((o) => o.urgent === dragOrder.urgent)
    const withoutDrag = group.filter((o) => o.id !== dragId)
    const targetIndex = withoutDrag.findIndex((o) => o.id === targetId)
    if (targetIndex === -1) return

    const newGroup = [...withoutDrag]
    newGroup.splice(targetIndex, 0, dragOrder)

    // 重新計算這個群組（急單組或一般組）的 sort_order，間距 10 方便之後插入
    const updates = newGroup.map((o, idx) => ({ id: o.id, sort_order: (idx + 1) * 10 }))

    // 樂觀更新本地畫面，避免等待網路造成跳動
    setOrders((prev) =>
      prev.map((o) => {
        const found = updates.find((u) => u.id === o.id)
        return found ? { ...o, sort_order: found.sort_order } : o
      })
    )

    for (const u of updates) {
      await supabase.from('orders').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
  }

  async function toggleUrgent(o: Order) {
    await supabase.from('orders').update({ urgent: !o.urgent }).eq('id', o.id)
  }

  async function deleteOrder(id: string) {
    if (!confirm('確定要刪除這張訂單？')) return
    await supabase.from('orders').delete().eq('id', id)
  }

  function openShip(o: Order) {
    setShippingOrder(o)
    setShipModalOpen(true)
  }

  async function confirmShip(o: Order) {
    const now = new Date()
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    await supabase.from('shipped').insert({
      customer: o.customer,
      item: o.item,
      qty: o.qty,
      work_order: o.process || null,
      note: o.note || null,
      shipped_date: todayStr(),
      shipped_time: timeStr,
    })
    await supabase.from('orders').delete().eq('id', o.id)
    setShipModalOpen(false)

  }

  async function recallShipped(s: Shipped) {
    await supabase.from('orders').insert({
      col: 'done',
      customer: s.customer,
      item: s.item,
      qty: s.qty || '',
      date: '',
      process: s.work_order || '',
      note: s.note || '',
      urgent: false,
    })
    await supabase.from('shipped').delete().eq('id', s.id)
  }

  function onDrop(col: string) {
    if (dragId) {
      const dragged = orders.find((o) => o.id === dragId)
      if (dragged && dragged.col !== col) {
        moveOrder(dragId, col)
      }
      setDragId(null)
      setDragOverId(null)
    }
  }

  function onDropOnCard(targetOrder: Order) {
    if (!dragId) return
    const dragged = orders.find((o) => o.id === dragId)
    if (!dragged) return

    if (dragged.col !== targetOrder.col) {
      // 跨欄拖到某張卡片上：先換欄，再排到該卡片附近（同樣限制急單/一般單分區）
      moveOrder(dragId, targetOrder.col)
      setDragId(null)
      setDragOverId(null)
      return
    }

    const colOrders = orders.filter((o) => o.col === targetOrder.col)
    reorderWithinColumn(colOrders, dragId, targetOrder.id)
    setDragId(null)
    setDragOverId(null)
  }

  function sortByUrgentThenOrder(list: Order[]) {
    return [...list].sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
      const sa = a.sort_order ?? 0
      const sb = b.sort_order ?? 0
      if (sa !== sb) return sa - sb
      return a.created_at.localeCompare(b.created_at)
    })
  }

  const todoList = sortByUrgentThenOrder(orders.filter((o) => o.col === 'todo'))
  const wipList = sortByUrgentThenOrder(orders.filter((o) => o.col === 'wip'))
  const doneList = sortByUrgentThenOrder(orders.filter((o) => o.col === 'done'))
  const today = todayStr()
  const todayEvents = events.filter((e) => e.date === today)
  const weekEndDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })()
  const weekEvents = events
    .filter((e) => e.date > today && e.date <= weekEndDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (loading) {
    return <div style={{ padding: 40, fontSize: 18, color: '#888' }}>載入中...</div>
  }

  return (
    <div style={{ padding: 14, maxWidth: 1400, margin: '0 auto', fontFamily: 'sans-serif', color: '#1a1a1a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 500 }}>凱淯內勤生產系統</span>
          <span style={{ fontSize: 14, color: '#888', background: '#f0f0f0', padding: '4px 12px', borderRadius: 99, border: '0.5px solid #e0e0e0' }}>
            {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCalModalOpen(true)} style={btnSm}>📅 行事曆</button>
          <button onClick={() => openAddOrder('todo')} style={btnSm}>＋ 新增訂單</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#555', marginBottom: 8 }}>📢 今日公告</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {todayEvents.length === 0 ? (
              <span style={{ fontSize: 14, color: '#bbb', fontStyle: 'italic' }}>今日無排定行程</span>
            ) : (
              todayEvents.map((e) => (
                <span key={e.id} style={{ fontSize: 13, fontWeight: 500, padding: '6px 12px', borderRadius: 8, background: '#FAEEDA', color: '#633806', border: '0.5px solid #FAC775' }}>
                  {typeLabel[e.type] || e.type}：{e.text}
                </span>
              ))
            )}
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#555', marginBottom: 8 }}>🗓 本週公告（近7日）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {weekEvents.length === 0 ? (
              <span style={{ fontSize: 14, color: '#bbb', fontStyle: 'italic' }}>近7日無排定行程</span>
            ) : (
              weekEvents.map((e) => (
                <span key={e.id} style={{ fontSize: 13, fontWeight: 500, padding: '6px 12px', borderRadius: 8, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #B5D4F4' }}>
                  {fmtDateWithWeekday(e.date)} {typeLabel[e.type] || e.type}：{e.text}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 230px', gap: 10, alignItems: 'start' }}>
        <KanbanCol
          title="待生產" dotColor="#378ADD" badgeBg="#E6F1FB" badgeColor="#0C447C"
          list={todoList} onDropCol={() => onDrop('todo')} setDragId={setDragId}
          onDropOnCard={onDropOnCard} dragOverId={dragOverId} setDragOverId={setDragOverId}
          renderCard={(o: Order) => (
            <OrderCard key={o.id} o={o} onEdit={openEditOrder} onDelete={deleteOrder} onToggleUrgent={toggleUrgent}
              onMove={() => moveOrder(o.id, 'wip')} moveLabel="生產中 →" showUrgentBtn />
          )}
          footer={<button onClick={() => openAddOrder('todo')} style={addBtn}>＋ 新增訂單</button>}
        />
        <KanbanCol
          title="生產中" dotColor="#EF9F27" badgeBg="#FAEEDA" badgeColor="#633806"
          list={wipList} onDropCol={() => onDrop('wip')} setDragId={setDragId}
          onDropOnCard={onDropOnCard} dragOverId={dragOverId} setDragOverId={setDragOverId}
          renderCard={(o: Order) => (
            <OrderCard key={o.id} o={o} onEdit={openEditOrder} onDelete={deleteOrder}
              onMove={() => moveOrder(o.id, 'done')} moveLabel="待出貨 →" />
          )}
        />
        <KanbanCol
          title="待出貨" dotColor="#639922" badgeBg="#EAF3DE" badgeColor="#27500A"
          list={doneList} onDropCol={() => onDrop('done')} setDragId={setDragId}
          onDropOnCard={onDropOnCard} dragOverId={dragOverId} setDragOverId={setDragOverId}
          renderCard={(o: Order) => (
            <OrderCard key={o.id} o={o} onEdit={openEditOrder} onDelete={deleteOrder}
              onShip={() => openShip(o)} />
          )}
        />

        <div style={{ background: '#f0faf2', borderRadius: 12, border: '0.5px solid #C0DD97', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid #C0DD97', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#27500A' }}>🚛 今日出貨</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 12, background: '#C0DD97', color: '#27500A', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{shipped.length}</span>
              {shipped.length > 0 && <CopyButtons shipped={shipped} />}
            </div>
          </div>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', maxHeight: 600 }}>
            {shipped.length === 0 ? (
              <p style={{ fontSize: 13, color: '#bbb', padding: 12, textAlign: 'center' }}>今日尚無出貨</p>
            ) : (
              shipped.map((s) => (
                <div key={s.id} style={{ background: '#fff', border: '0.5px solid #C0DD97', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.customer}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{s.item}</div>
                  {s.qty && <div style={{ fontSize: 14, color: '#185FA5' }}>{s.qty}</div>}
                  <div style={{ fontSize: 12, color: '#639922', background: '#EAF3DE', padding: '2px 7px', borderRadius: 6, display: 'inline-flex', marginTop: 3, marginBottom: 6 }}>🕐 {s.shipped_time}</div>
                  <button onClick={() => recallShipped(s)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '0.5px solid #C0DD97', background: '#fff', color: '#27500A', cursor: 'pointer', width: '100%' }}>↩ 拉回待出貨</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {orderModalOpen && (
        <OrderModal
          editingOrder={editingOrder}
          defaultCol={defaultCol}
          onClose={() => setOrderModalOpen(false)}
          onSaved={() => setOrderModalOpen(false)}
        />
      )}
      {shipModalOpen && shippingOrder && (
        <ShipModal order={shippingOrder} onClose={() => setShipModalOpen(false)} onConfirm={() => confirmShip(shippingOrder)} />
      )}
      {calModalOpen && <CalendarModal onClose={() => setCalModalOpen(false)} />}
    </div>
  )
}

function KanbanCol({ title, dotColor, badgeBg, badgeColor, list, onDropCol, setDragId, renderCard, footer, onDropOnCard, dragOverId, setDragOverId }: any) {
  return (
    <div
      style={{ background: '#f7f7f7', borderRadius: 12, border: '0.5px solid #e0e0e0', display: 'flex', flexDirection: 'column', minHeight: 440 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropCol}
    >
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor }} />
          {title}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: badgeBg, color: badgeColor }}>{list.length}</span>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 60 }}>
        {list.map((o: Order) => (
          <div
            key={o.id}
            draggable
            onDragStart={() => setDragId(o.id)}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOverId(o.id)
            }}
            onDragLeave={() => setDragOverId((prev: any) => (prev === o.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDropOnCard(o)
            }}
            style={{
              outline: dragOverId === o.id ? '2px solid #378ADD' : 'none',
              borderRadius: 10,
              transition: 'outline 0.1s',
            }}
          >
            {renderCard(o)}
          </div>
        ))}
      </div>
      {footer}
    </div>
  )
}

function OrderCard({ o, onEdit, onDelete, onToggleUrgent, onMove, onShip, moveLabel, showUrgentBtn }: any) {
  const over = o.date && o.date < todayStr() && o.col !== 'done'
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 10, padding: 12, borderLeft: o.urgent ? '4px solid #E24B4A' : undefined, cursor: 'grab' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{o.customer}</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {o.urgent && <span style={badge('#FCEBEB', '#A32D2D', '#F7C1C1')}>！急單</span>}
          {o.process && <span style={badge('#FAEEDA', '#633806', '#FAC775')}>派工</span>}
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: '#111', marginBottom: 4, whiteSpace: 'pre-line' }}>{o.item}</div>
      {o.qty && <div style={{ fontSize: 20, fontWeight: 500, color: '#185FA5', background: '#E6F1FB', padding: '2px 10px', borderRadius: 8, display: 'inline-block', marginBottom: 6 }}>{o.qty}</div>}
      {o.process && <div style={{ fontSize: 15, color: '#444', marginTop: 4, fontWeight: 500 }}>⚙ {o.process}</div>}
      {o.date && <div style={{ fontSize: 13, color: over ? '#A32D2D' : '#27500A', marginTop: 4 }}>📅 {fmtDate(o.date)} 出貨{over ? ' ⚠' : ''}</div>}
      {o.note && <div style={{ fontSize: 12, color: '#555', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid #f0f0f0', fontStyle: 'italic' }}>{o.note}</div>}
      <PrintCheck orderId={o.id} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #f0f0f0', alignItems: 'center' }}>
        {onMove && (
          <button onClick={onMove} style={{ fontSize: 17, fontWeight: 500, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', flex: 1, background: '#FAEEDA', color: '#633806' }}>{moveLabel}</button>
        )}
        {onShip && (
          <button onClick={onShip} style={{ fontSize: 17, fontWeight: 500, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#639922', color: '#fff', cursor: 'pointer', flex: 1 }}>🚛 出貨</button>
        )}
        <button onClick={() => onEdit(o)} style={btnCard} title="編輯">✏️</button>
        {showUrgentBtn && (
          <button onClick={() => onToggleUrgent(o)} style={o.urgent ? { ...btnCard, background: '#FCEBEB', color: '#A32D2D', borderColor: '#F7C1C1' } : btnCard} title="設為急單">！</button>
        )}
        <button onClick={() => onDelete(o.id)} style={btnCard} title="刪除">🗑️</button>
      </div>
    </div>
  )
}

function CopyButtons({ shipped }: { shipped: any[] }) {
  const [copied, setCopied] = React.useState<string | null>(null)

  function buildFull() {
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' })
    const lines = shipped.map((s, i) => {
      let line = (i + 1) + '. ' + s.customer + '｜' + s.item + (s.qty ? ' × ' + s.qty : '')
      if (s.work_order) line += '\n   派工：' + s.work_order
      if (s.note) line += '\n   備註：' + s.note
      return line
    })
    return '📦 ' + today + ' 出貨記錄（共 ' + shipped.length + ' 筆）\n────────────────────\n' + lines.join('\n')
  }

  function buildSimple() {
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' })
    const lines = shipped.map((s, i) =>
      (i + 1) + '. ' + s.customer + '｜' + s.item + (s.qty ? ' × ' + s.qty : '')
    )
    return '📦 ' + today + ' 出貨記錄（共 ' + shipped.length + ' 筆）\n────────────────────\n' + lines.join('\n')
  }

  async function copy(type) {
    const text = type === 'full' ? buildFull() : buildSimple()
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button onClick={() => copy('simple')} title='複製簡版（客戶+品項）'
        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '0.5px solid #C0DD97', background: copied === 'simple' ? '#C0DD97' : '#fff', color: '#27500A', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {copied === 'simple' ? '✓ 已複製' : '📋 簡版'}
      </button>
      <button onClick={() => copy('full')} title='複製完整版（含派工單備註）'
        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '0.5px solid #C0DD97', background: copied === 'full' ? '#C0DD97' : '#fff', color: '#27500A', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {copied === 'full' ? '✓ 已複製' : '📋 完整'}
      </button>
    </div>
  )
}

function CopyButtons({ shipped }) {
  const [copied, setCopied] = React.useState(null)
  function buildSimple() {
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' })
    const lines = shipped.map((s, i) => (i + 1) + '. ' + s.customer + '｜' + s.item + (s.qty ? ' × ' + s.qty : ''))
    return '📦 ' + today + ' 出貨記錄（共 ' + shipped.length + ' 筆）
────────────────────
' + lines.join('
')
  }
  function buildFull() {
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' })
    const lines = shipped.map((s, i) => {
      let line = (i + 1) + '. ' + s.customer + '｜' + s.item + (s.qty ? ' × ' + s.qty : '')
      if (s.work_order) line += '
   派工：' + s.work_order
      if (s.note) line += '
   備註：' + s.note
      return line
    })
    return '📦 ' + today + ' 出貨記錄（共 ' + shipped.length + ' 筆）
────────────────────
' + lines.join('
')
  }
  async function copy(type) {
    const text = type === 'full' ? buildFull() : buildSimple()
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }
  return React.createElement('div', { style: { display: 'flex', gap: 4 } },
    React.createElement('button', { onClick: () => copy('simple'), title: '複製簡版', style: { fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '0.5px solid #C0DD97', background: copied === 'simple' ? '#C0DD97' : '#fff', color: '#27500A', cursor: 'pointer', whiteSpace: 'nowrap' } }, copied === 'simple' ? '✓ 已複製' : '📋 簡版'),
    React.createElement('button', { onClick: () => copy('full'), title: '複製完整版', style: { fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '0.5px solid #C0DD97', background: copied === 'full' ? '#C0DD97' : '#fff', color: '#27500A', cursor: 'pointer', whiteSpace: 'nowrap' } }, copied === 'full' ? '✓ 已複製' : '📋 完整')
  )
}

function CopyButtons({ shipped }) {
  const [copied, setCopied] = React.useState(null)
  function buildSimple() {
    const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" })
    const lines = shipped.map((s, i) => (i + 1) + ". " + s.customer + "｜" + s.item + (s.qty ? " × " + s.qty : ""))
    return "📦 " + today + " 出貨記錄（共 " + shipped.length + " 筆）
────────────────────
" + lines.join("
")
  }
  function buildFull() {
    const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" })
    const lines = shipped.map((s, i) => {
      let line = (i + 1) + ". " + s.customer + "｜" + s.item + (s.qty ? " × " + s.qty : "")
      if (s.work_order) line += "\n   派工：" + s.work_order
      if (s.note) line += "\n   備註：" + s.note
      return line
    })
    return "📦 " + today + " 出貨記錄（共 " + shipped.length + " 筆）
────────────────────
" + lines.join("\n")
  }
  async function copy(type) {
    const text = type === "full" ? buildFull() : buildSimple()
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={() => copy("simple")} title="複製簡版"
        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "0.5px solid #C0DD97", background: copied === "simple" ? "#C0DD97" : "#fff", color: "#27500A", cursor: "pointer", whiteSpace: "nowrap" }}>
        {copied === "simple" ? "✓ 已複製" : "📋 簡版"}
      </button>
      <button onClick={() => copy("full")} title="複製完整版"
        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "0.5px solid #C0DD97", background: copied === "full" ? "#C0DD97" : "#fff", color: "#27500A", cursor: "pointer", whiteSpace: "nowrap" }}>
        {copied === "full" ? "✓ 已複製" : "📋 完整"}
      </button>
    </div>
  )
}

function CopyButtons({ shipped }) {
  const [copied, setCopied] = React.useState(null)
  function buildSimple() {
    const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" })
    const lines = shipped.map((s, i) => (i + 1) + ". " + s.customer + "｜" + s.item + (s.qty ? " × " + s.qty : ""))
    return "📦 " + today + " 出貨記錄（共 " + shipped.length + " 筆）
────────────────────
" + lines.join("
")
  }
  function buildFull() {
    const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" })
    const lines = shipped.map((s, i) => {
      let line = (i + 1) + ". " + s.customer + "｜" + s.item + (s.qty ? " × " + s.qty : "")
      if (s.work_order) line += "\n   派工：" + s.work_order
      if (s.note) line += "\n   備註：" + s.note
      return line
    })
    return "📦 " + today + " 出貨記錄（共 " + shipped.length + " 筆）
────────────────────
" + lines.join("\n")
  }
  async function copy(type) {
    const text = type === "full" ? buildFull() : buildSimple()
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={() => copy("simple")} title="複製簡版"
        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "0.5px solid #C0DD97", background: copied === "simple" ? "#C0DD97" : "#fff", color: "#27500A", cursor: "pointer", whiteSpace: "nowrap" }}>
        {copied === "simple" ? "✓ 已複製" : "📋 簡版"}
      </button>
      <button onClick={() => copy("full")} title="複製完整版"
        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "0.5px solid #C0DD97", background: copied === "full" ? "#C0DD97" : "#fff", color: "#27500A", cursor: "pointer", whiteSpace: "nowrap" }}>
        {copied === "full" ? "✓ 已複製" : "📋 完整"}
      </button>
    </div>
  )
}

function PrintCheck({ orderId }: { orderId: string }) {
  const key = `printed_${orderId}`
  const [checked, setChecked] = React.useState(() => {
    try { return localStorage.getItem(key) === '1' } catch { return false }
  })
  function toggle() {
    const next = !checked
    setChecked(next)
    try { if (next) localStorage.setItem(key, '1'); else localStorage.removeItem(key) } catch {}
  }
  return (
    <div onClick={toggle} title={checked ? '已印出貨單（點擊取消）' : '尚未印出貨單（點擊確認）'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
        fontSize: 12, color: checked ? '#27500A' : '#bbb', marginTop: 4, marginBottom: 2, userSelect: 'none' }}>
      <span style={{ fontSize: 16 }}>{checked ? '☑️' : '⬜'}</span>
      <span>{checked ? '出貨單已印' : '出貨單未印'}</span>
    </div>
  )
}

function badge(bg: string, color: string, border: string) {
  return { fontSize: 12, fontWeight: 500, padding: '3px 8px', borderRadius: 99, border: `0.5px solid ${border}`, background: bg, color }
}

const btnSm: React.CSSProperties = { fontSize: 14, padding: '6px 14px', borderRadius: 8, border: '0.5px solid #ccc', background: '#f5f5f5', color: '#555', cursor: 'pointer' }
const addBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#bbb', cursor: 'pointer', padding: 10, borderRadius: 8, border: '0.5px dashed #ddd', margin: '0 10px 10px', background: 'transparent', width: 'calc(100% - 20px)', justifyContent: 'center' }
const btnCard: React.CSSProperties = { fontSize: 13, padding: '7px 12px', borderRadius: 8, border: '0.5px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }
