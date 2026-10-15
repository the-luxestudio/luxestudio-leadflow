import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { linkTelegramAccount, unlinkTelegramAccount } from '@/lib/services/telegram';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { token, chatId, username } = await request.json();

    if (!token || !chatId) {
      return NextResponse.json({ error: 'Token and chatId are required' }, { status: 400 });
    }

    const result = await linkTelegramAccount(token, chatId, username);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Telegram account successfully linked' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    await unlinkTelegramAccount(session.user.id);
    return NextResponse.json({ success: true, message: 'Telegram account unlinked' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
