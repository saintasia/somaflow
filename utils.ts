// Returns the sessions that fall within the current week (Sunday 00:00 up to,
// but not including, the next Sunday). Shared by the Progress and Summary
// screens so their "this week" figures always agree.
export const getSessionsThisWeek = <T extends { date: string }>(history: T[]): T[] => {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday of this week
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // next Sunday

  return history.filter((session) => {
    const sessionDate = new Date(session.date);
    return sessionDate >= startOfWeek && sessionDate < endOfWeek;
  });
};

export const countSessionsThisWeek = (history: { date: string }[]): number =>
  getSessionsThisWeek(history).length;
