import { NextResponse } from 'next/server';
import crypto from 'crypto';

const DEV_FALLBACK = 'leverkusen!25';
const PASS_PLAIN = process.env.MAINTENANCE_PASSWORD || process.env.MAINT_PASSWORD || '';
const PASS_HASH = process.env.MAINTENANCE_PASSWORD_HASH || process.env.MAINT_PASSWORD_HASH || '';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function subtleHash(input: string): string {
  const mask = 0x5a;
  const bytes = Array.from(Buffer.from(input, 'utf8'), (b) => b ^ mask);
  return Buffer.from(Uint8Array.from(bytes)).toString('base64');
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (typeof password !== 'string' || !password.length) {
      return NextResponse.json({ success: false, error: 'INVALID' }, { status: 400 });
    }

    let ok = false;
    if (PASS_HASH) ok = sha256Hex(password) === PASS_HASH;
    else if (PASS_PLAIN) ok = password === PASS_PLAIN;
    else ok = password === DEV_FALLBACK;

    if (!ok) return NextResponse.json({ success: false, error: 'DENIED' }, { status: 401 });

    const tag = sha256Hex('m:' + Date.now()).slice(0, 16);
    const token = `v1:${subtleHash(tag + ':' + Date.now())}`;

    const res = NextResponse.json({ success: true, token });
    res.cookies.set('m_access', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER', message: e?.message },
      { status: 500 },
    );
  }
}
