import { withPasswordProtect } from '@tommyvez/passfort/next';

export const proxy = withPasswordProtect({ protectAll: true });

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
