export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2018\u2019\u0060]/g, "'")
    .replace(/\s+/g, ' ');
}

export function answersMatch(userInput: string, correctAnswer: string): boolean {
  const normUser = normalizeAnswer(userInput);
  const normCorrect = normalizeAnswer(correctAnswer);
  if (normUser === normCorrect) return true;
  const alternatives = correctAnswer.split('/').map(a => normalizeAnswer(a.trim()));
  return alternatives.some(a => normUser === a);
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getPreviousDay(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calculateDailyStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const daySet = new Set(days);
  const today = getTodayKey();
  let streak = 0;
  let current = today;
  while (daySet.has(current)) {
    streak++;
    current = getPreviousDay(current);
  }
  return streak;
}

export function getStreakMessage(streak: number): string {
  if (streak >= 30) return `Un mese! Thirty days of pure dedication!`;
  if (streak >= 21) return `Tre settimane! Twenty-one days — you're a linguist!`;
  if (streak >= 14) return `Due settimane! Two incredible weeks straight!`;
  if (streak >= 10) return `Dieci giorni! Ten days strong — you're on fire!`;
  if (streak >= 7) return `Una settimana! One full week — absolutely unstoppable!`;
  if (streak >= 5) return `Cinque giorni! Five days of hard work pays off!`;
  if (streak >= 4) return `Quattro giorni! Four days and going strong!`;
  if (streak >= 3) return `Tre giorni! Three days in — a habit is forming!`;
  if (streak >= 2) return `Due giorni! Two days in a row — keep the momentum!`;
  return `Primo giorno! Today is just the beginning!`;
}

export function getStreakFireEmojis(streak: number): string {
  if (streak >= 30) return '🔥🔥🔥🔥🔥';
  if (streak >= 14) return '🔥🔥🔥🔥';
  if (streak >= 7) return '🔥🔥🔥';
  if (streak >= 3) return '🔥🔥';
  return '🔥';
}
