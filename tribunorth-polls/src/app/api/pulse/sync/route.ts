import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POLLS, type Poll } from '@/lib/polls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weekly roll-up: one aggregate Signal row per poll into the Notion Feedback Hub.
 *
 * Raw votes stay in Supabase. Notion gets the finding, not 400 rows — which is
 * the whole point of the hub. Wire it to a Vercel cron in vercel.json:
 *
 *   { "crons": [{ "path": "/api/pulse/sync", "schedule": "0 22 * * 0" }] }
 *
 * (Sundays 22:00 UTC = Monday ~8am Melbourne, give or take daylight saving.)
 */

const NOTION_VERSION = '2022-06-28';
const SIGNALS_DB_ID = '550ac3ce44e44d23ae97af0f548e111f';

type VoteRow = { poll_id: string; option_id: string };

function isoWeekAgo(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}

function summarise(poll: Poll, rows: VoteRow[]) {
  const counts = new Map<string, number>();
  for (const option of poll.options) counts.set(option.id, 0);

  let total = 0;
  for (const row of rows) {
    if (!counts.has(row.option_id)) continue;
    counts.set(row.option_id, (counts.get(row.option_id) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return null;

  const ranked = poll.options
    .map((option) => ({
      label: option.shortLabel ?? option.label,
      votes: counts.get(option.id) ?? 0,
      percent: Math.round(((counts.get(option.id) ?? 0) / total) * 100),
    }))
    .sort((a, b) => b.votes - a.votes);

  const headline = ranked.map((r) => `${r.label} ${r.percent}%`).join(', ');
  const breakdown = ranked.map((r) => `${r.label}: ${r.votes} (${r.percent}%)`).join(' | ');

  return { total, headline, breakdown, top: ranked[0] };
}

async function createSignal(token: string, poll: Poll, summary: NonNullable<ReturnType<typeof summarise>>) {
  const today = new Date().toISOString().slice(0, 10);

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: SIGNALS_DB_ID },
      properties: {
        Signal: {
          title: [{ text: { content: `${poll.question} — ${summary.headline} (week to ${today})` } }],
        },
        Source: { select: { name: 'Landing page poll' } },
        Type: { select: { name: 'Stat' } },
        Consent: { select: { name: 'Not applicable — anonymous' } },
        Date: { date: { start: today } },
        'Sample size': { number: summary.total },
        Verbatim: { rich_text: [{ text: { content: summary.breakdown } }] },
        'Raw link': { url: 'https://www.tribunorth.com.au' },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Notion ${response.status}: ${await response.text()}`);
  }
}

export async function GET(request: NextRequest) {
  // Vercel cron sends this header; reject anything else so the route can't be
  // triggered by a stranger hitting the URL.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const notionToken = process.env.NOTION_TOKEN;
  if (!supabaseUrl || !supabaseKey || !notionToken) {
    return NextResponse.json({ error: 'missing configuration' }, { status: 503 });
  }

  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data, error } = await db
    .from('pulse_votes')
    .select('poll_id, option_id')
    .gte('created_at', isoWeekAgo());

  if (error) return NextResponse.json({ error: 'query failed' }, { status: 500 });

  const rows = (data ?? []) as VoteRow[];
  const written: string[] = [];
  const skipped: string[] = [];

  for (const poll of POLLS) {
    const summary = summarise(poll, rows.filter((r) => r.poll_id === poll.id));
    if (!summary) {
      skipped.push(poll.id);
      continue;
    }
    // One poll failing should not stop the others being written.
    try {
      await createSignal(notionToken, poll, summary);
      written.push(poll.id);
    } catch {
      skipped.push(poll.id);
    }
  }

  return NextResponse.json({ written, skipped, votesInWindow: rows.length });
}
