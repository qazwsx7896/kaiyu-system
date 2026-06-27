import { NextResponse } from 'next/server'

// 這是臨時工具：只要在 LINE 群組裡發一句話，這裡就會把「群組 ID」印在終端機上
// 取得群組 ID 後，這個 webhook 可以繼續保留（之後不會用到主動發送，只是被動接收用，留著無妨）

export async function POST(request: Request) {
  const body = await request.json()

  console.log('========== LINE Webhook 收到事件 ==========')
  console.log(JSON.stringify(body, null, 2))

  if (body.events && body.events.length > 0) {
    for (const event of body.events) {
      if (event.source && event.source.type === 'group') {
        console.log('🎯 找到群組 ID：', event.source.groupId)
      }
      if (event.source && event.source.type === 'user') {
        console.log('👤 這是個人訊息，使用者 ID：', event.source.userId)
      }
    }
  }
  console.log('==========================================')

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'LINE webhook is running' })
}
