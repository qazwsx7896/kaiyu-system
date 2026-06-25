import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'kaiyu2026'
const COOKIE_NAME = 'kaiyu_auth'

export function middleware(request: NextRequest) {
  // 登入頁、登入 API 不需要驗證，避免無限重導向
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/api/login'
  ) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(COOKIE_NAME)

  if (authCookie?.value === SITE_PASSWORD) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * 排除 Next.js 內部檔案與靜態資源，其他全部都要過密碼驗證
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|manifest.json|sw.js).*)',
  ],
}
