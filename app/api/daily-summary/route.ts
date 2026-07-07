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
    headers: { 'Content-Type': 'application/json', Authorization: "Bearer " + token },
    body: JSON.stringif    body: JSON.stringif    body: JSON.stringif    body: JSON.stringif    f (!res.ok) {
    const err = await res.text(    const err = await res.text(    const err = awaitur    const err = await res.text(    const err = awaiGET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !  if (CRON_SECRET && authHeader !  if (CRON_SECRpons  if (CRON_SECRET && authHeader !  istatus: 4  if (CRON_SECRET && a_TOKEN ||  if (CRON_SECRET && authHeader !  if (ns  if (CRON_SECRET && authHeader !  if (CRONstatus: 500 })
  }

  const taipeiNow = getTaipeiTime()
  const year = taipeiNow.getFullYear()
  const month = String(taipeiNow.getMonth() + 1).padStart(2, '0')
  const day = String(taipeiNow.getDat  const day = String(taipeiNow.getDat  const day = String(taipeiNow.getDons  const day = String(taipeiNow.getDat  const day = String(taipei
  cons  cons  cons  cedData, error } = await supabase
    .from('shipped').select('*').eq('shipped_date', today)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message },  if (error) return NextResponse.json({ error: error.message },  if (error) return NextResponse.json({ error: error.message },  if (error) return NextResponseor  if (error) return NextResponse.json({ errorny) => {
                                                                                                                                                                                                                                                                       isMorn                            const ti                                   d +                                                               ider                                                                                                                                                                            ｜' + s.item + (s.qty ? ' × ' + s.qty : '')
    if (s.work_order) line += '\n   派工：' + s.work_order
    if (s.    if (s.    if (s.    if (s.    if (s.    lin    if (s.    if (s.    if (s.    if (s.    if (s.    lin    if (s.    if (s.    if (s.    if (s.    if (s.    lin    if (s.    if (s.    if (s.    if (s.    if (s.    lin    if (s.    if (s.    if (s.    if (s.    if (s.    lin    if (s.    if (s.    if (s.    if (s.    illDetails
  const simpleMessage = title + '\n' + divider + '\n' + simpleDetails

  await sendLine(LINE_TOKEN, LINE_GROUP_ID, fullMessage)

  if (LINE_TOKEN_2 && LINE_GROUP_ID_2) {
    await sendLine(LINE_TOKEN_2, LINE_GROUP_ID_2, simpleMessage)
  }

  return NextResponse.json({ ok: true, sent: records.length, date: today })
}
