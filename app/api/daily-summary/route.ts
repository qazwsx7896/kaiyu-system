import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID
const LINE_TOKEN_2 = process.env.LINE_CHANNEL_ACCESS_TOKEN_2
const LINE_GROUP_ID_2 = process.env.LINE_GROUP_ID_2
const CRON_SECRET = process.env.CRON_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getTaipeiTime() {
  const now = new Date()
  const taipeiOffset = 8 * 60
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + taipeiOffset * 60000)
}

async function sendLine(token: string, groupId: string, message: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('LINE send error:', err)
    return false
  }
  return true
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!LINE_TOKEN || !LINE_GROUP_ID) {
    return NextResponse.json({ error: 'LINE not configured' }, { status: 500 })
  }

  const taipeiNow = getTaipeiTime()
  const year = taipeiNow.getFullYear()
  const month = String(taipeiNow.getMonth() + 1).padStart(2, '0')
  const day = String(taipeiNow.getDate()).padStart(2, '0')
  const today = year + '-' + month + '-' + day
  const hourTW = taipeiNow.getHours()
  const isMorning = hourTW < 14

  const { data: shippedData, error } = await supabase
    .from('shipped').select('*').eq('shipped_date', today)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!shippedData || shippedData.length === 0) {
    return NextResponse.json({ ok: true, message: '今日尚無出貨' })
  }

  const records = isMorning
    ? shippedData.filter((s: any) => {
        const h = parseInt(s.shipped_time?.split(' ')?.[1]?.split(':')?.[0] || '0')
        return h < 12
      })
    : shippedData

  if (records.length === 0) {
    return NextResponse.json({ ok: true, message: '此時段尚無出貨' })
  }

  const period = isMorning ? '早上' : '全天'
  const title = '📦 ' + today + ' ' + period + '出貨匯總（共 ' + records.length + ' 筆）'
  const divider = '────────────────────'

  const fullDetails = records.map((s: any, i: number) => {
    let line = (i + 1) + '. ' + s.customer + '｜' + s.item + (s.qty ? ' × ' + s.qty : '')
    if (s.work_order) line += '\n   派工：' + s.work_order
    if (s.note) line += '\n   備註：' + s.note
    line += '｜' + s.shipped_time
    return line
  }).join('\n')

  const simpleDetails = records.map((s: any, i: number) =>
    (i + 1) + '. ' + s.customer + '｜' + s.item + (s.qty ? ' × ' + s.qty : '')
  ).join('\n')

  const fullMessage = title + '\n' + divider + '\n' + fullDetails
  const simpleMessage = title + '\n' + divider + '\n' + simpleDetails

  await sendLine(LINE_TOKEN, LINE_GROUP_ID, fullMessage)

  if (LINE_TOKEN_2 && LINE_GROUP_ID_2) {
    await sendLine(LINE_TOKEN_2, LINE_GROUP_ID_2, simpleMessage)
  }

  return NextResponse.json({ ok: true, sent: records.length, date: today })
}
