import { withPasswordProtect } from '@tommyvez/passfort/next';

export const proxy = withPasswordProtect({
  protectAll: true,
  sessionDuration: 60 * 60 * 24, // 1 天（單位：秒）
});

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};