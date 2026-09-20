import { hydrationStreak, summarize, trackingStreak } from '../streaks/streaks';

describe('tracking streak', () => {
  const today = '2026-09-20';

  it('counts consecutive fully recorded days and skips days without doses', () => {
    const days = [
      { date: '2026-09-15', scheduled: 2, recorded: 2, taken: 2 },
      { date: '2026-09-16', scheduled: 0, recorded: 0, taken: 0 }, // neutral
      { date: '2026-09-17', scheduled: 2, recorded: 2, taken: 1 }, // one skipped still counts as recorded
      { date: '2026-09-18', scheduled: 1, recorded: 1, taken: 1 },
      { date: '2026-09-19', scheduled: 1, recorded: 1, taken: 1 },
      { date: today, scheduled: 2, recorded: 1, taken: 1 }, // in progress
    ];
    expect(trackingStreak(days, today)).toBe(4);
  });

  it('breaks on a past day with an unrecorded dose', () => {
    const days = [
      { date: '2026-09-17', scheduled: 1, recorded: 1, taken: 1 },
      { date: '2026-09-18', scheduled: 2, recorded: 1, taken: 1 },
      { date: '2026-09-19', scheduled: 1, recorded: 1, taken: 1 },
      { date: today, scheduled: 1, recorded: 1, taken: 0 }, // skipped today but recorded
    ];
    expect(trackingStreak(days, today)).toBe(2);
  });

  it('never lets an unrecorded dose look taken and ignores extra doses', () => {
    const summary = summarize({ scheduled: 2, taken: 1, skipped: 1, missed: 0 });
    expect(summary.takenRatio).toBe(0.5);
    expect(summary.recordedRatio).toBe(1);
    const extra = summarize({ scheduled: 1, taken: 3, skipped: 0, missed: 0 });
    expect(extra.recordedRatio).toBe(1);
    expect(summarize({ scheduled: 0, taken: 0, skipped: 0, missed: 0 }).takenRatio).toBeNull();
  });
});

describe('hydration streak', () => {
  const today = '2026-09-20';

  it('counts days where the goal in force was met and treats today as in progress', () => {
    const days = [
      { date: '2026-09-17', totalMl: 2000, goalMl: 2000 },
      { date: '2026-09-18', totalMl: 2600, goalMl: 2500 }, // goal changed on the 18th
      { date: '2026-09-19', totalMl: 2500, goalMl: 2500 },
      { date: today, totalMl: 400, goalMl: 2500 },
    ];
    expect(hydrationStreak(days, today)).toBe(3);
    expect(hydrationStreak([...days.slice(0, 3), { date: today, totalMl: 2500, goalMl: 2500 }], today)).toBe(4);
  });

  it('breaks on a missed day and gives no extra credit for excess water', () => {
    const days = [
      { date: '2026-09-17', totalMl: 4000, goalMl: 2000 },
      { date: '2026-09-18', totalMl: 500, goalMl: 2000 },
      { date: '2026-09-19', totalMl: 2000, goalMl: 2000 },
    ];
    expect(hydrationStreak(days, today)).toBe(1);
  });
});
