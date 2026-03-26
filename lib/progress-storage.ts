import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey, calculateDailyStreak } from './utils';

const KEYS = {
  MASTERED_CARDS: 'mastered_cards',
  NEEDS_PRACTICE: 'needs_practice',
  CONJUGATION_SCORE: 'conjugation_score',
  CONJUGATION_TOTAL: 'conjugation_total',
  CONJUGATION_STREAK: 'conjugation_streak',
  BEST_STREAK: 'best_streak',
  SESSIONS: 'sessions',
  DAYS_STUDIED: 'days_studied',
  LAST_STREAK_SHOWN: 'last_streak_shown',
  ENABLED_VERBS: 'enabled_verbs',
  CONJUGATION_MODE: 'conjugation_mode',
};

export async function getMasteredCards(): Promise<Set<string>> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MASTERED_CARDS);
    return new Set(data ? JSON.parse(data) : []);
  } catch {
    return new Set();
  }
}

export async function getNeedsPracticeCards(): Promise<Set<string>> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NEEDS_PRACTICE);
    return new Set(data ? JSON.parse(data) : []);
  } catch {
    return new Set();
  }
}

export async function markCardMastered(cardId: string): Promise<void> {
  try {
    const [mastered, needsPractice] = await Promise.all([getMasteredCards(), getNeedsPracticeCards()]);
    mastered.add(cardId);
    needsPractice.delete(cardId);
    await Promise.all([
      AsyncStorage.setItem(KEYS.MASTERED_CARDS, JSON.stringify(Array.from(mastered))),
      AsyncStorage.setItem(KEYS.NEEDS_PRACTICE, JSON.stringify(Array.from(needsPractice))),
    ]);
    await recordStudyDayInternal();
  } catch {}
}

export async function markCardNeedsPractice(cardId: string): Promise<void> {
  try {
    const [mastered, needsPractice] = await Promise.all([getMasteredCards(), getNeedsPracticeCards()]);
    needsPractice.add(cardId);
    mastered.delete(cardId);
    await Promise.all([
      AsyncStorage.setItem(KEYS.MASTERED_CARDS, JSON.stringify(Array.from(mastered))),
      AsyncStorage.setItem(KEYS.NEEDS_PRACTICE, JSON.stringify(Array.from(needsPractice))),
    ]);
    await recordStudyDayInternal();
  } catch {}
}

export async function resetCardProgress(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.MASTERED_CARDS),
      AsyncStorage.removeItem(KEYS.NEEDS_PRACTICE),
    ]);
  } catch {}
}

export interface ConjugationStats {
  score: number;
  total: number;
  streak: number;
}

export async function getConjugationStats(): Promise<ConjugationStats> {
  try {
    const [scoreStr, totalStr, streakStr] = await Promise.all([
      AsyncStorage.getItem(KEYS.CONJUGATION_SCORE),
      AsyncStorage.getItem(KEYS.CONJUGATION_TOTAL),
      AsyncStorage.getItem(KEYS.CONJUGATION_STREAK),
    ]);
    return {
      score: scoreStr ? parseInt(scoreStr, 10) : 0,
      total: totalStr ? parseInt(totalStr, 10) : 0,
      streak: streakStr ? parseInt(streakStr, 10) : 0,
    };
  } catch {
    return { score: 0, total: 0, streak: 0 };
  }
}

export async function recordConjugationAnswer(correct: boolean): Promise<ConjugationStats> {
  try {
    const stats = await getConjugationStats();
    const newTotal = stats.total + 1;
    const newScore = correct ? stats.score + 1 : stats.score;
    const newStreak = correct ? stats.streak + 1 : 0;
    const bestStreakStr = await AsyncStorage.getItem(KEYS.BEST_STREAK);
    const bestStreak = bestStreakStr ? parseInt(bestStreakStr, 10) : 0;
    await Promise.all([
      AsyncStorage.setItem(KEYS.CONJUGATION_SCORE, String(newScore)),
      AsyncStorage.setItem(KEYS.CONJUGATION_TOTAL, String(newTotal)),
      AsyncStorage.setItem(KEYS.CONJUGATION_STREAK, String(newStreak)),
      ...(newStreak > bestStreak ? [AsyncStorage.setItem(KEYS.BEST_STREAK, String(newStreak))] : []),
    ]);
    await recordStudyDayInternal();
    return { score: newScore, total: newTotal, streak: newStreak };
  } catch {
    return { score: 0, total: 0, streak: 0 };
  }
}

export async function recordSessionResult(score: number, total: number): Promise<void> {
  try {
    const sessionsStr = await AsyncStorage.getItem(KEYS.SESSIONS);
    const sessions: { date: string; score: number; total: number }[] = sessionsStr ? JSON.parse(sessionsStr) : [];
    sessions.push({ date: getTodayKey(), score, total });
    if (sessions.length > 100) sessions.splice(0, sessions.length - 100);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    await recordStudyDayInternal();
  } catch {}
}

export async function resetConjugationStats(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.CONJUGATION_SCORE),
      AsyncStorage.removeItem(KEYS.CONJUGATION_TOTAL),
      AsyncStorage.removeItem(KEYS.CONJUGATION_STREAK),
    ]);
  } catch {}
}

export interface DailyStreakResult {
  isNewDay: boolean;
  streak: number;
  shouldCelebrate: boolean;
}

export async function checkAndRecordStudyDay(): Promise<DailyStreakResult> {
  try {
    const today = getTodayKey();
    const [daysStr, lastShownStr] = await Promise.all([
      AsyncStorage.getItem(KEYS.DAYS_STUDIED),
      AsyncStorage.getItem(KEYS.LAST_STREAK_SHOWN),
    ]);
    const days: string[] = daysStr ? JSON.parse(daysStr) : [];
    const isNewDay = !days.includes(today);

    if (isNewDay) {
      days.push(today);
      await AsyncStorage.setItem(KEYS.DAYS_STUDIED, JSON.stringify(days));
    }

    const streak = calculateDailyStreak(days);
    const lastShown = lastShownStr ?? '';
    const shouldCelebrate = isNewDay && streak >= 2 && lastShown !== today;

    if (shouldCelebrate) {
      await AsyncStorage.setItem(KEYS.LAST_STREAK_SHOWN, today);
    }

    return { isNewDay, streak, shouldCelebrate };
  } catch {
    return { isNewDay: false, streak: 0, shouldCelebrate: false };
  }
}

export async function getDailyStreak(): Promise<number> {
  try {
    const daysStr = await AsyncStorage.getItem(KEYS.DAYS_STUDIED);
    const days: string[] = daysStr ? JSON.parse(daysStr) : [];
    return calculateDailyStreak(days);
  } catch {
    return 0;
  }
}

export async function getDaysStudied(): Promise<string[]> {
  try {
    const daysStr = await AsyncStorage.getItem(KEYS.DAYS_STUDIED);
    return daysStr ? JSON.parse(daysStr) : [];
  } catch {
    return [];
  }
}

export interface ProfileStats {
  masteredCards: number;
  needsPracticeCards: number;
  conjugationScore: number;
  conjugationTotal: number;
  conjugationStreak: number;
  bestStreak: number;
  dailyStreak: number;
  daysStudied: number;
  recentSessions: { date: string; score: number; total: number }[];
  accuracy: number;
  recentDays: string[];
}

export async function getProfileStats(): Promise<ProfileStats> {
  try {
    const [
      mastered,
      needsPractice,
      scoreStr,
      totalStr,
      streakStr,
      bestStreakStr,
      daysStr,
      sessionsStr,
    ] = await Promise.all([
      getMasteredCards(),
      getNeedsPracticeCards(),
      AsyncStorage.getItem(KEYS.CONJUGATION_SCORE),
      AsyncStorage.getItem(KEYS.CONJUGATION_TOTAL),
      AsyncStorage.getItem(KEYS.CONJUGATION_STREAK),
      AsyncStorage.getItem(KEYS.BEST_STREAK),
      AsyncStorage.getItem(KEYS.DAYS_STUDIED),
      AsyncStorage.getItem(KEYS.SESSIONS),
    ]);

    const score = scoreStr ? parseInt(scoreStr, 10) : 0;
    const total = totalStr ? parseInt(totalStr, 10) : 0;
    const sessions: { date: string; score: number; total: number }[] = sessionsStr ? JSON.parse(sessionsStr) : [];
    const daysArr: string[] = daysStr ? JSON.parse(daysStr) : [];
    const dailyStreak = calculateDailyStreak(daysArr);

    return {
      masteredCards: mastered.size,
      needsPracticeCards: needsPractice.size,
      conjugationScore: score,
      conjugationTotal: total,
      conjugationStreak: streakStr ? parseInt(streakStr, 10) : 0,
      bestStreak: bestStreakStr ? parseInt(bestStreakStr, 10) : 0,
      dailyStreak,
      daysStudied: daysArr.length,
      recentSessions: sessions.slice(-7).reverse(),
      accuracy: total > 0 ? Math.round((score / total) * 100) : 0,
      recentDays: daysArr.slice(-14),
    };
  } catch {
    return {
      masteredCards: 0,
      needsPracticeCards: 0,
      conjugationScore: 0,
      conjugationTotal: 0,
      conjugationStreak: 0,
      bestStreak: 0,
      dailyStreak: 0,
      daysStudied: 0,
      recentSessions: [],
      accuracy: 0,
      recentDays: [],
    };
  }
}

async function recordStudyDayInternal(): Promise<void> {
  try {
    const today = getTodayKey();
    const daysStr = await AsyncStorage.getItem(KEYS.DAYS_STUDIED);
    const days: string[] = daysStr ? JSON.parse(daysStr) : [];
    if (!days.includes(today)) {
      days.push(today);
      await AsyncStorage.setItem(KEYS.DAYS_STUDIED, JSON.stringify(days));
    }
  } catch {}
}

export async function getEnabledVerbs(): Promise<Set<string> | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ENABLED_VERBS);
    return data ? new Set(JSON.parse(data)) : null;
  } catch {
    return null;
  }
}

export async function setEnabledVerbs(verbIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ENABLED_VERBS, JSON.stringify(verbIds));
  } catch {}
}

export async function resetAllProgress(): Promise<void> {
  try {
    await Promise.all(Object.values(KEYS).map(k => AsyncStorage.removeItem(k)));
  } catch {}
}

export async function getConjugationMode(): Promise<'italian' | 'english'> {
  try {
    const mode = await AsyncStorage.getItem(KEYS.CONJUGATION_MODE);
    return (mode as 'italian' | 'english') || 'italian';
  } catch {
    return 'italian';
  }
}

export async function setConjugationMode(mode: 'italian' | 'english'): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CONJUGATION_MODE, mode);
  } catch {}
}
