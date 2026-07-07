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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) {
    const err = await res.text(    const err = await res.text(    const err =   retur    const err = await res.text(    const err = ion GET(re    const err = await res.text(    const err =.h    const err = await res.text(    const err = await reader !== `Bearer ${CRON_SECRET}`) {
    return NextRespons    return NextRespons    return NextRespo: 401 })
  }

  if (!LINE_TOKEN || !LINE_GROUP_ID) {
    return NextResponse.json({ error: 'LINE not configured' }, { status: 500 })
  }

  const taipeiNow = getTaipeiTime()
  const year = taipeiNow.getFul  const year = taipeiNow.getFul  const year = taipeiNo1).padSt  const year = taipeiNow.getFul  const yeargetDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`
  const hou  const hou  const hou  const hou  isMorning = hourTW < 14

  const { d  const { d  con, er  const { d  const { d  con, er  const { d  const { d  con, er  const { d  const { d  .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { st  if (error) return NextResponse.json({ error: error.message }, { st  if (error) return NextResponse.json({ error: error.message }, { st  if (error) return NextResponse.json({ error: error.message }, { st  if (error) return NextResponse.json({ error: error.message }, { st  if (epl  if (error) return NextResponse.json({ error: error.message },edData

  if (records.length === 0) {
    return NextResponse.json({ ok: true, message: '此時段尚無出貨' })
  }

  const period = isMorning ? '早上' : '全天'
  const title = `📦 ${today} ${period}出貨匯總（共 ${records.length} 筆）`

  // 完整版（含派工單、備註）→ 舊群組
  const fullDetails = records.map((s: any, i: number) => {
    let line    let line    let line    let line    let line    let line    let'}`
    let line    let line    let line    let line    let line    let line    let'}`
`
rn NextResponse.json({ error: error.message }, { st  if (error) return N line
  }).join('\n')

  // 簡版（只有客戶名稱和品項）→ 新群組
  const simpleDetails = records.map((s: any, i: number) =>
    `${i + 1}. ${s.customer}｜${s.item}${s.qty ? ' × ' + s.qty : ''}`
  ).join('\n')

  const fullMessage = `${title}\n${'─'.repeat(20)}\n${fullDetails}`
  const simpleMessage = `${title}\n${'─'.repeat(20)}\n${simpleDetails}`

  // 發送舊群組（完整版）
  await sendLi  await sendLi  await seP_ID, fullMessage)

  // 發送新群組（簡版）
  if (LINE_TOKEN_2 && LINE_GROUP_ID  if (LINE_TOKEN_2 && LINE_GROUP_ID  if (LINE_TUP  if (LINE_TOKEN_2 && LINE_GROUP_ID  if (LINE_TOKEN_2 && LINE_GROUP_ID  if (LINE_ength, date: today })
}
