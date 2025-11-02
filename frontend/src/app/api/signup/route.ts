import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,                // <-- server-only
  process.env.SUPABASE_SERVICE_ROLE_KEY!    // <-- server-only (DO NOT expose)
);

export async function POST(req: NextRequest) {
  try {
    const { name, email, comment, map_center } = await req.json();

    // minimal validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const referrer = req.headers.get('referer') || null;
    const user_agent = req.headers.get('user-agent') || null;

    const { error } = await supabase.from('signups').insert({
      name: name || null,
      email,
      comment: comment || null,
      map_center: map_center ?? null,
      referrer,
      user_agent
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('duplicate key')) {
        return NextResponse.json({ ok: true, message: 'Already signed up' });
      }
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Thanks — you’re on the list!' });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
