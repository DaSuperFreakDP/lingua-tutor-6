import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useColorScheme,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { FLASHCARDS } from "@/lib/italian-data";
import { getProfileStats, resetAllProgress, ProfileStats } from "@/lib/progress-storage";
import { getStreakMessage, getStreakFireEmojis, getTodayKey, getPreviousDay } from "@/lib/utils";

const TOTAL_CARDS = FLASHCARDS.length;

function getLast14Days(): string[] {
  const days: string[] = [];
  let current = getTodayKey();
  for (let i = 0; i < 14; i++) {
    days.unshift(current);
    current = getPreviousDay(current);
  }
  return days;
}

function getShortDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<ProfileStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfileStats().then(setStats);
    }, [])
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const flashcardPct = stats ? Math.round((stats.masteredCards / TOTAL_CARDS) * 100) : 0;
  const dailyStreak = stats?.dailyStreak ?? 0;
  const fires = getStreakFireEmojis(dailyStreak);
  const streakMsg = getStreakMessage(dailyStreak);

  const level = !stats ? 'Principiante' :
    stats.masteredCards >= 40 && stats.accuracy >= 80 ? 'Avanzato' :
    stats.masteredCards >= 20 && stats.accuracy >= 60 ? 'Intermedio' :
    stats.masteredCards >= 5 || stats.conjugationTotal >= 10 ? 'Elementare' : 'Principiante';

  const handleReset = () => {
    Alert.alert(
      'Reset All Progress',
      'This will erase all your flashcard and conjugation progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllProgress();
            const fresh = await getProfileStats();
            setStats(fresh);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const last14Days = getLast14Days();
  const studiedSet = new Set(stats?.recentDays ?? []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Il Mio Profilo</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Your language journey</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={[styles.resetBtn, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="trash-outline" size={17} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {dailyStreak > 0 && (
          <View style={[styles.streakCard, { backgroundColor: Colors.palette.wine }]}>
            <View style={styles.streakTop}>
              <Text style={styles.streakFires}>{fires}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.streakDays}>{dailyStreak}-Day Streak</Text>
                <Text style={styles.streakMsg} numberOfLines={2}>{streakMsg}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeNum}>{dailyStreak}</Text>
                <Text style={styles.streakBadgeLbl}>days</Text>
              </View>
            </View>

            <View style={styles.calendarRow}>
              {last14Days.map((dateKey, i) => {
                const studied = studiedSet.has(dateKey);
                const isToday = dateKey === getTodayKey();
                const dayLabel = getShortDayLabel(dateKey);
                return (
                  <View key={i} style={styles.calendarDay}>
                    <Text style={[styles.calendarLetter, { color: isToday ? '#FFF' : 'rgba(255,255,255,0.5)' }]}>{dayLabel}</Text>
                    <View style={[
                      styles.calendarDot,
                      {
                        backgroundColor: studied ? '#FFF' : 'rgba(255,255,255,0.15)',
                        borderWidth: isToday ? 2 : 0,
                        borderColor: '#FFF',
                      }
                    ]}>
                      {studied && <Text style={styles.calendarDotFire}>🔥</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {dailyStreak === 0 && (
          <View style={[styles.noStreakCard, { backgroundColor: theme.card }]}>
            <Text style={styles.noStreakEmoji}>🌱</Text>
            <View>
              <Text style={[styles.noStreakTitle, { color: theme.text }]}>Start your streak today!</Text>
              <Text style={[styles.noStreakSub, { color: theme.textMuted }]}>Study every day to build a 🔥 streak</Text>
            </View>
          </View>
        )}

        <View style={[styles.levelCard, { backgroundColor: isDark ? Colors.palette.wineDark : Colors.palette.wine }]}>
          <View style={styles.levelLeft}>
            <View style={[styles.levelBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="ribbon" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.levelLabel}>Current Level</Text>
              <Text style={styles.levelName}>{level}</Text>
            </View>
          </View>
          <View style={styles.levelRight}>
            <Text style={styles.daysNum}>{stats?.daysStudied ?? 0}</Text>
            <Text style={styles.daysLabel}>total days</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.palette.success + "18" }]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.palette.success} />
            </View>
            <Text style={[styles.statBlockVal, { color: Colors.palette.success }]}>{stats?.masteredCards ?? 0}</Text>
            <Text style={[styles.statBlockLbl, { color: theme.textMuted }]}>Cards Learned</Text>
          </View>
          <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.palette.gold + "18" }]}>
              <Ionicons name="refresh-circle" size={20} color={Colors.palette.gold} />
            </View>
            <Text style={[styles.statBlockVal, { color: Colors.palette.gold }]}>{stats?.needsPracticeCards ?? 0}</Text>
            <Text style={[styles.statBlockLbl, { color: theme.textMuted }]}>Practicing</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.palette.terracotta + "18" }]}>
              <Ionicons name="analytics" size={20} color={Colors.palette.terracotta} />
            </View>
            <Text style={[styles.statBlockVal, { color: Colors.palette.terracotta }]}>{stats?.accuracy ?? 0}%</Text>
            <Text style={[styles.statBlockLbl, { color: theme.textMuted }]}>Accuracy</Text>
          </View>
          <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.palette.wine + "18" }]}>
              <Ionicons name="flame" size={20} color={Colors.palette.wine} />
            </View>
            <Text style={[styles.statBlockVal, { color: Colors.palette.wine }]}>{stats?.bestStreak ?? 0}</Text>
            <Text style={[styles.statBlockLbl, { color: theme.textMuted }]}>Best Answer Streak</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.palette.gold + "18" }]}>
              <Ionicons name="pencil" size={20} color={Colors.palette.gold} />
            </View>
            <Text style={[styles.statBlockVal, { color: Colors.palette.gold }]}>{stats?.conjugationTotal ?? 0}</Text>
            <Text style={[styles.statBlockLbl, { color: theme.textMuted }]}>Total Practice</Text>
          </View>
          <View style={[styles.statBlock, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.palette.terracottaLight + "18" }]}>
              <Ionicons name="trending-up" size={20} color={Colors.palette.terracottaLight} />
            </View>
            <Text style={[styles.statBlockVal, { color: Colors.palette.terracottaLight }]}>{stats?.conjugationStreak ?? 0}</Text>
            <Text style={[styles.statBlockLbl, { color: theme.textMuted }]}>Current Answer Streak</Text>
          </View>
        </View>

        <View style={[styles.progressSection, { backgroundColor: theme.card }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Flashcard Mastery</Text>
            <Text style={[styles.progressPct, { color: Colors.palette.wine }]}>{flashcardPct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${flashcardPct}%`, backgroundColor: Colors.palette.wine }]} />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressSub, { color: theme.textMuted }]}>{stats?.masteredCards ?? 0} of {TOTAL_CARDS} learned</Text>
            <Text style={[styles.progressSub, { color: theme.textMuted }]}>{TOTAL_CARDS - (stats?.masteredCards ?? 0)} remaining</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.separator }]} />

          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Conjugation Score</Text>
            <Text style={[styles.progressPct, { color: Colors.palette.gold }]}>{stats?.conjugationScore ?? 0}/{stats?.conjugationTotal ?? 0}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${stats?.accuracy ?? 0}%`, backgroundColor: Colors.palette.gold }]} />
          </View>
          <Text style={[styles.progressSub, { color: theme.textMuted, marginTop: 4 }]}>
            {stats?.accuracy ?? 0}% overall accuracy
          </Text>
        </View>

        {stats && stats.recentSessions.length > 0 && (
          <View style={[styles.sessionsCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sessionTitle, { color: theme.text }]}>Recent Sessions</Text>
            {stats.recentSessions.map((s, i) => {
              const acc = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              const color = acc >= 80 ? Colors.palette.success : acc >= 60 ? Colors.palette.gold : Colors.palette.error;
              return (
                <View key={i} style={[styles.sessionRow, i < stats.recentSessions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.separator }]}>
                  <View>
                    <Text style={[styles.sessionDate, { color: theme.text }]}>{s.date}</Text>
                    <Text style={[styles.sessionDetail, { color: theme.textMuted }]}>{s.score}/{s.total} correct</Text>
                  </View>
                  <View style={[styles.sessionBadge, { backgroundColor: color + "22" }]}>
                    <Text style={[styles.sessionAcc, { color }]}>{acc}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.tipsCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.tipTitle, { color: theme.text }]}>Tips for Learning Italian</Text>
          {[
            'Study 10–15 minutes daily — consistency beats long sessions',
            'Focus on one tense at a time before moving to the next',
            'Swipe right on cards you know, left on ones to review',
            'Speak every word aloud using the audio button',
            'Presente and Passato Prossimo cover 80% of conversation',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: Colors.palette.wine }]} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  resetBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  streakCard: { borderRadius: 20, padding: 18, gap: 14 },
  streakTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  streakFires: { fontSize: 32 },
  streakDays: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -0.3 },
  streakMsg: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  streakBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  streakBadgeNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -0.5 },
  streakBadgeLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  calendarRow: { flexDirection: "row", justifyContent: "space-between" },
  calendarDay: { alignItems: "center", gap: 3 },
  calendarLetter: { fontSize: 9, fontFamily: "Inter_500Medium" },
  calendarDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  calendarDotFire: { fontSize: 10 },
  noStreakCard: { borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  noStreakEmoji: { fontSize: 36 },
  noStreakTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  noStreakSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  levelCard: { borderRadius: 18, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  levelBadge: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  levelLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  levelName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -0.3 },
  levelRight: { alignItems: "flex-end" },
  daysNum: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -1 },
  daysLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  statsGrid: { flexDirection: "row", gap: 12 },
  statBlock: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statBlockVal: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statBlockLbl: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center" },
  progressSection: { borderRadius: 16, padding: 18, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressPct: { fontSize: 16, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressFooter: { flexDirection: "row", justifyContent: "space-between" },
  progressSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginVertical: 6 },
  sessionsCard: { borderRadius: 16, padding: 16, gap: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sessionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  sessionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  sessionDate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sessionDetail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  sessionBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  sessionAcc: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tipsCard: { borderRadius: 16, padding: 16, gap: 10 },
  tipTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
