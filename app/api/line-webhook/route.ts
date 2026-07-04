import { NextResponse } from 'next/server'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_GROUP_ID = process.env.LINE_GROUP_ID

export async function POST(request: Request) {
  try {
    const { customer, item, qty, process, note, time } = await request.json()

    if (!LINE_TOKEN || !LINE_GROUP_ID) {
      return NextResponse.json({ ok: false, error: 'LINE not configured' }, { status: 500 })
    }

    let message = `📦 出貨通知\n客戶：${customer}\n品項：${item}${qty ? ' × ' + qty : ''}`
    if (process) message += `\n派工：${process}`
    if (note) message += `\n備註：${note}`
    message += `\n時間：${time}`

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

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
