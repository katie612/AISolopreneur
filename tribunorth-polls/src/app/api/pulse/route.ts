import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPoll, isValidVote } from '@/lib/polls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Service-role client. Server-only — this key must never reach the browser,
// so it is read from a non-NEXT_PUBLIC env var and this file is never imported
// by a client component.
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type Results = { counts: Record<string, number>; total: number; revealed: boolean };

async function readResults(pollId: string): Promise<Results | null> {
  const poll = getPoll(pollId);
  const db = supabase();
  if (!poll || !db) return null;

  const { data, error } = await db.rpc('pulse_results', { p_poll_id: pollId });
  if (error) return null;

  const counts: Record<string, number> = {};
  for (const option of poll.options) counts[option.id] = 0;

  let total = 0;
  for (const row of (data ?? []) as { option_id: string; votes: number }[]) {
    // Ignore rows for options that have since been removed from the config,
    // so a renamed option can't skew the percentages.
    if (!(row.option_id in counts)) continue;
    counts[row.option_id] = Number(row.votes);
    total += Number(row.votes);
  }

  return { counts, total, revealed: total >= poll.revealAfter };
}

export async function GET(request: NextRequest) {
  const pollId = request.nextUrl.searchParams.get('poll');
  if (!pollId || !getPoll(pollId)) {
    return NextResponse.json({ error: 'unknown poll' }, { status: 404 });
  }

  const results = await readResults(pollId);
  if (!results) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' },
  });
}

export async function POST(request: NextRequest) {
  let body: { poll?: unknown; option?: unknown; token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const pollId = typeof body.poll === 'string' ? body.poll : '';
  const optionId = typeof body.option === 'string' ? body.option : '';
  const token = typeof body.token === 'string' ? body.token : '';

  if (!isValidVote(pollId, optionId)) {
    return NextResponse.json({ error: 'unknown poll or option' }, { status: 400 });
  }
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'bad token' }, { status: 400 });
  }

  const db = supabase();
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const { error } = await db
    .from('pulse_votes')
    .insert({ poll_id: pollId, option_id: optionId, device_token: token });

  // 23505 = unique violation, i.e. this device already voted on this poll.
  // That is a normal outcome, not a failure: fall through and return results.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'could not record vote' }, { status: 500 });
  }

  const results = await readResults(pollId);
  if (!results) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
}
