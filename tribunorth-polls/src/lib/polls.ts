/**
 * Poll definitions. This file is the single source of truth and is imported by
 * both the component and the API route, so a vote for an option that doesn't
 * exist here is rejected server-side. Never trust the posted option id.
 *
 * Keep this list short. Three polls across a landing page is a texture; six is
 * a survey, and a survey is something people leave.
 */

export type PollOption = {
  id: string;
  /** Shown on the button before voting. */
  label: string;
  /** Shown on the results bar after voting, when the button label is too long. */
  shortLabel?: string;
};

export type Poll = {
  id: string;
  /** The question. Keep it under ~60 characters so it holds one line on mobile. */
  question: string;
  /** Optional line under the question. Use it to earn the answer, not to explain the poll. */
  context?: string;
  options: PollOption[];
  /**
   * Results stay hidden until this many people have answered. Below it, a vote
   * still counts but the voter sees a holding state.
   *
   * This matters: "100% of families don't have a will" off a single vote is
   * both meaningless and actively bad copy to have sitting on a landing page.
   */
  revealAfter: number;
  /** Line shown above the bars once results are visible. */
  resultIntro?: string;
};

export const POLLS: Poll[] = [
  {
    id: 'where-it-lives',
    question: 'Where does your family’s information actually live?',
    context: 'Anonymous. One tap, no email, and you’ll see how everyone else answered.',
    revealAfter: 15,
    resultIntro: 'How other families answered',
    options: [
      { id: 'scattered', label: 'Spread across apps, drives and inboxes', shortLabel: 'Spread across apps and drives' },
      { id: 'one-folder', label: 'One folder someone set up', shortLabel: 'One folder' },
      { id: 'one-head', label: 'Mostly in one person’s head', shortLabel: 'In one person’s head' },
      { id: 'sorted', label: 'We’ve got it sorted', shortLabel: 'Sorted' },
    ],
  },
  {
    id: 'first-vault',
    question: 'Which vault would you open first?',
    context: 'Anonymous. Your answer helps decide what gets built first.',
    revealAfter: 15,
    resultIntro: 'Where other families would start',
    options: [
      { id: 'housing', label: 'Housing' },
      { id: 'insurance', label: 'Insurance' },
      { id: 'legacy', label: 'Legacy' },
    ],
  },
  {
    id: 'will-status',
    question: 'Do you have a will that’s current?',
    context: 'Anonymous. Nothing is recorded about you — only the answer.',
    revealAfter: 15,
    resultIntro: 'You’re not the only one',
    options: [
      { id: 'current', label: 'Yes, and it’s up to date' },
      { id: 'outdated', label: 'Yes, but it’s out of date' },
      { id: 'none', label: 'No' },
      { id: 'unsure', label: 'I’m not sure' },
    ],
  },
];

export const POLLS_BY_ID: Record<string, Poll> = Object.fromEntries(
  POLLS.map((poll) => [poll.id, poll]),
);

export function getPoll(id: string): Poll | undefined {
  return POLLS_BY_ID[id];
}

export function isValidVote(pollId: string, optionId: string): boolean {
  const poll = getPoll(pollId);
  return !!poll && poll.options.some((option) => option.id === optionId);
}
