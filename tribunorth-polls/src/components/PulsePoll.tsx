'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPoll, type Poll } from '@/lib/polls';
import styles from './PulsePoll.module.css';

type Results = { counts: Record<string, number>; total: number; revealed: boolean };
type Phase = 'idle' | 'sending' | 'done' | 'thanks';

const TOKEN_KEY = 'tribu.pulse.token';
const votedKey = (pollId: string) => `tribu.pulse.voted.${pollId}`;

/**
 * A random per-browser id used only to stop one device voting twice.
 * It is not derived from anything about the person and is never sent anywhere
 * except this site's own poll endpoint. Private mode / blocked storage throws,
 * in which case we fall back to a throwaway id for this page view only.
 */
function deviceToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

function readVoted(pollId: string): string | null {
  try {
    return localStorage.getItem(votedKey(pollId));
  } catch {
    return null;
  }
}

function writeVoted(pollId: string, optionId: string): void {
  try {
    localStorage.setItem(votedKey(pollId), optionId);
  } catch {
    /* storage unavailable — the vote still counted server-side */
  }
}

/** Largest-remainder rounding, so the percentages shown always total 100. */
function toPercentages(counts: Record<string, number>, ids: string[], total: number) {
  if (total <= 0) return Object.fromEntries(ids.map((id) => [id, 0]));

  const exact = ids.map((id) => ({ id, value: ((counts[id] ?? 0) / total) * 100 }));
  const rounded = exact.map((entry) => ({ ...entry, floor: Math.floor(entry.value) }));
  let remaining = 100 - rounded.reduce((sum, entry) => sum + entry.floor, 0);

  const byRemainder = [...rounded].sort(
    (a, b) => (b.value - b.floor) - (a.value - a.floor),
  );
  const bump = new Set<string>();
  for (const entry of byRemainder) {
    if (remaining <= 0) break;
    bump.add(entry.id);
    remaining -= 1;
  }

  return Object.fromEntries(
    rounded.map((entry) => [entry.id, entry.floor + (bump.has(entry.id) ? 1 : 0)]),
  );
}

export type PulsePollProps = {
  /** Must match an id in src/lib/polls.ts */
  pollId: string;
  className?: string;
};

export default function PulsePoll({ pollId, className }: PulsePollProps) {
  const poll: Poll | undefined = getPoll(pollId);

  const [phase, setPhase] = useState<Phase>('idle');
  const [choice, setChoice] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // A returning visitor who already voted sees the result, not the question again.
  useEffect(() => {
    if (!poll) return;
    const previous = readVoted(poll.id);
    if (!previous) return;

    setChoice(previous);
    setPhase('done');

    let cancelled = false;
    fetch(`/api/pulse?poll=${encodeURIComponent(poll.id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Results | null) => {
        if (!cancelled && data) setResults(data);
        else if (!cancelled) setPhase('thanks');
      })
      .catch(() => {
        if (!cancelled) setPhase('thanks');
      });

    return () => {
      cancelled = true;
    };
  }, [poll]);

  const vote = useCallback(
    async (optionId: string) => {
      if (!poll || phase !== 'idle') return;

      setChoice(optionId);
      setPhase('sending');
      writeVoted(poll.id, optionId);

      try {
        const response = await fetch('/api/pulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll: poll.id, option: optionId, token: deviceToken() }),
        });
        if (!response.ok) throw new Error(String(response.status));
        setResults((await response.json()) as Results);
        setPhase('done');
      } catch {
        // A poll is never allowed to look broken on a landing page. If the
        // write fails, thank them quietly and move on.
        setPhase('thanks');
      }
    },
    [poll, phase],
  );

  const percentages = useMemo(() => {
    if (!poll || !results) return null;
    return toPercentages(results.counts, poll.options.map((o) => o.id), results.total);
  }, [poll, results]);

  if (!poll) return null;

  const showResults = phase === 'done' && results?.revealed && percentages;
  const showHolding = phase === 'done' && results && !results.revealed;

  return (
    <section
      className={className ? `${styles.poll} ${className}` : styles.poll}
      aria-labelledby={`pulse-q-${poll.id}`}
    >
      <h3 className={styles.question} id={`pulse-q-${poll.id}`}>
        {poll.question}
      </h3>
      {poll.context && <p className={styles.context}>{poll.context}</p>}

      {(phase === 'idle' || phase === 'sending') && (
        <div className={styles.options} role="group" aria-labelledby={`pulse-q-${poll.id}`}>
          {poll.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={styles.option}
              disabled={phase === 'sending'}
              onClick={() => vote(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <>
          {poll.resultIntro && <p className={styles.resultIntro}>{poll.resultIntro}</p>}
          <ul className={styles.bars}>
            {poll.options.map((option) => {
              const percent = percentages[option.id] ?? 0;
              const mine = option.id === choice;
              return (
                <li key={option.id} className={styles.bar}>
                  <span className={styles.barHead}>
                    <span className={mine ? styles.barLabelMine : undefined}>
                      {option.shortLabel ?? option.label}
                      {mine && <span className={styles.srOnly}> (your answer)</span>}
                    </span>
                    <span className={styles.barPercent}>{percent}%</span>
                  </span>
                  <span className={styles.barTrack}>
                    <span
                      className={mine ? `${styles.barFill} ${styles.barFillMine}` : styles.barFill}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={styles.footnote} ref={liveRef} aria-live="polite">
            {results.total.toLocaleString('en-AU')} answers. Nothing about you was recorded.
          </p>
        </>
      )}

      {showHolding && (
        <p className={styles.holding}>
          <span className={styles.holdingLead}>Thank you — that’s counted.</span>
          You’re one of the first to answer this one. Results appear here once{' '}
          {poll.revealAfter} families have.
        </p>
      )}

      {phase === 'thanks' && (
        <p className={styles.holding}>
          <span className={styles.holdingLead}>Thank you.</span>
          That’s been noted.
        </p>
      )}
    </section>
  );
}
