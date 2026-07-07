import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  console.log('========== LINE Webhook ==========')
  console.log(JSON.stringify(body, null, 2))
  if (body.events) {
    for (const event of body.events) {
      if (event.source?.type === 'group') {
        console.log('🎯 群組 ID：', event.source.groupId)
      }
    }
  }
  console.log('==================================')
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
