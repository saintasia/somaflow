export const countSessionsThisWeek = (history: { date: string }[]): number => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  // Get the start of the week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get the end of the week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 8);
  endOfWeek.setHours(23, 59, 59, 999);

  return history.filter((session) => {
    const sessionDate = new Date(session.date);
    return sessionDate >= startOfWeek && sessionDate < endOfWeek;
  }).length;
};
