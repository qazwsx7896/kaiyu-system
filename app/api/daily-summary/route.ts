import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID
const CRON_SECRET = process.env.CRON_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getTaipeiTime() {
  const now = new Date()
  // 台灣時間 UTC+8
  const taipeiOffset = 8 * 60
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + taipeiOffset * 60000)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!LINE_TOKEN || !LINE_GROUP_ID) {
    return NextResponse.json({ error: 'LINE not configured' }, { status: 500 })
  }

  const taipeiNow = getTaipeiTime()
  const year = taipeiNow.getFullYear()
  const month = String(taipeiNow.getMonth() + 1).padStart(2, '0')
  const day = String(taipeiNow.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}` // 格式跟 page.tsx 的 todayStr() 一致

  const hourTW = taipeiNow.getHours()
  const isMorning = hourTW < 14

  const { data: shippedData, error } = await supabase
    .from('shipped').select('*').eq('shipped_date', today)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!shippedData || shippedData.length === 0) {
    return NextResponse.json({ ok: true, message: `今日（${today}）尚無出貨` })
  }

  const records = isMorning
    ? shippedData.filter((s) => {
        const h = parseInt(s.shipped_time?.split(' ')?.[1]?.split(':')?.[0] || '0')
        return h < 12
      })
    : shippedData

  if (records.length === 0) {
    return NextResponse.json({ ok: true, message: '此時段尚無出貨' })
  }

  const period = isMorning ? '早上' : '全天'
  const title = `📦 ${today} ${period}出貨匯總（共 ${records.length} 筆）`

  const details = records.map((s: any, i: number) => {
    let line = `${i + 1}. ${s.customer}｜${s.item}${s.qty ? ' × ' + s.qty : ''}`
    if (s.work_order) line += `\n   派工：${s.work_order}`
    if (s.note) line += `\n   備註：${s.note}`
    line += `｜${s.shipped_time}`
    return line
  }).join('\n')

  const message = `${title}\n${'─'.repeat(20)}\n${details}`

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: LINE_GROUP_ID, messages: [{ type: 'text', text: message }] }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ ok: false, error: errText }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: records.length, date: today })
}
