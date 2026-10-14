// Same-origin portal: HTTPS gets Secure cookies; loopback HTTP remains usable.
export const adminSessionCookie = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' ? true : 'auto',
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 8,
});
