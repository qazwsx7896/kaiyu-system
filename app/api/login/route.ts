import { NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'kaiyu2026'
const COOKIE_NAME = 'kaiyu_auth'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (password === SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, SITE_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    })
    return res
  }

  return NextResponse.json({ ok: false }, { status: 401 })
}
