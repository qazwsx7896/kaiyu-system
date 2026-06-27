import { NextResponse } from 'next/server'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID

export async function POST(request: Request) {
  try {
    const { customer, item, qty, time } = await request.json()

    if (!LINE_TOKEN || !LINE_GROUP_ID) {
      console.error('LINE 環境變數未設定，略過發送')
      return NextResponse.json({ ok: false, error: 'LINE not configured' }, { status: 500 })
    }

    const message = `📦 出貨通知\n客戶：${customer}\n品項：${item}${qty ? ' × ' + qty : ''}\n時間：${time}`

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
      console.error('LINE 發送失敗:', errText)
      return NextResponse.json({ ok: false, error: errText }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('notify-shipment error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
