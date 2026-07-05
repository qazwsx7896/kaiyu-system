import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID
const CRON_SECRET = process.env.CRON_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  // 驗證這個請求是來自 Vercel Cron，不是外部隨便呼叫的
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!LINE_TOKEN || !LINE_GROUP_ID) {
    return NextResponse.json({ error: 'LINE not configured' }, { status: 500 })
  }

  // 撈今天的出貨記錄
  const today = new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')

  // 判斷現在是早上場（12:00）還是下午場（17:30）
  const hour = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: 'numeric',
    hour12: false,
  })
  const isMorning = parseInt(hour) < 14

  // 撈當天出貨記錄
  const { data: shippedData, error } = await supabase
    .from('shipped')
    .select('*')
    .eq('shipped_date', today)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!shippedData || shippedData.length === 0) {
    return NextResponse.json({ ok: true, message: '今日尚無出貨，略過通知' })
  }

  // 如果是中午場，只取上午的出貨（時間在 12:00 以前）
  const records = isMorning
    ? shippedData.filter((s) => {
        const hour = parseInt(s.shipped_time?.split(' ')?.[1]?.split(':')?.[0] || '0')
        return hour < 12
      })
    : shippedData

  if (records.length === 0) {
    return NextResponse.json({ ok: true, message: '此時段尚無出貨，略過通知' })
  }

  const period = isMorning ? '早上' : '全天'
  const title = `📦 ${today} ${period}出貨匯總（共 ${records.length} 筆）`
  const details = records
    .map((s, idx) =>
      `${idx + 1}. ${s.customer}｜${s.item}${s.qty ? ' × ' + s.qty : ''}｜${s.shipped_time}`
    )
    .join('\n')

  const message = `${title}\n${'─'.repeat(20)}\n${details}`

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_GROUP_ID,
      messages: [{ type: 'text', text: message }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ ok: false, error: errText }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: records.length })
}
