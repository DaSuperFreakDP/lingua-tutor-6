import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useColorScheme,
  Dimensions,
  PanResponder,
  Animated as RNAnimated,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import Colors from "@/constants/colors";
import { FLASHCARDS, WordType, Flashcard } from "@/lib/italian-data";
import {
  getMasteredCards,
  getNeedsPracticeCards,
  markCardMastered,
  markCardNeedsPractice,
  resetCardProgress,
  checkAndRecordStudyDay,
} from "@/lib/progress-storage";
import StreakBanner from "@/components/StreakBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const SWIPE_THRESHOLD = 80;

type FilterType = 'all' | WordType;
type DeckMode = 'all' | 'practice';
type Phase = 'setup' | 'study';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'noun', label: 'Nouns' },
  { key: 'verb', label: 'Verbs' },
  { key: 'adjective', label: 'Adjectives' },
  { key: 'adverb', label: 'Adverbs' },
];

function SwipeableFlipCard({
  card,
  onMastered,
  onNeedsPractice,
  mastered,
  needsPractice,
  isEnglishFirst,
}: {
  card: Flashcard;
  onMastered: () => void;
  onNeedsPractice: () => void;
  mastered: boolean;
  needsPractice: boolean;
  isEnglishFirst: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const flipAnim = useSharedValue(0);
  const isFlippedRef = useRef(false);
  const [showBack, setShowBack] = useState(false);

  const dragX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    flipAnim.value = 0;
    isFlippedRef.current = false;
    setShowBack(false);
  }, [card.id]);

  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isFlippedRef.current) {
      isFlippedRef.current = true;
      flipAnim.value = withTiming(180, { duration: 380 }, () => {
        runOnJS(setShowBack)(true);
      });
    } else {
      isFlippedRef.current = false;
      flipAnim.value = withTiming(0, { duration: 380 }, () => {
        runOnJS(setShowBack)(false);
      });
    }
  };

  const speak = () => {
    let text, lang;
    if (isEnglishFirst) {
      text = showBack ? card.italian : card.english;
      lang = showBack ? "it-IT" : "en-US";
    } else {
      text = showBack ? card.english : card.italian;
      lang = showBack ? "en-US" : "it-IT";
    }
    Speech.speak(text.replace(/\//g, ' or '), { language: lang, rate: 0.85 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
      onPanResponderGrant: () => { dragX.setValue(0); },
      onPanResponderMove: (_, g) => { dragX.setValue(g.dx); },
      onPanResponderRelease: (_, g) => {
        const dx = g.dx;
        const dy = g.dy;
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) * 1.5;
        if (isHorizontalSwipe && Math.abs(dx) >= SWIPE_THRESHOLD) {
          const toValue = dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;
          RNAnimated.timing(dragX, { toValue, duration: 220, useNativeDriver: true }).start(() => {
            dragX.setValue(0);
            if (dx > 0) onMastered(); else onNeedsPractice();
          });
        } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          RNAnimated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
          flip();
        } else {
          RNAnimated.spring(dragX, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
        }
      },
    })
  ).current;

  const cardRotate = dragX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const rightOverlayOpacity = dragX.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const leftOverlayOpacity = dragX.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipAnim.value, [0, 180], [0, 180])}deg` }],
    backfaceVisibility: "hidden",
    position: "absolute",
    width: "100%",
    height: "100%",
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipAnim.value, [0, 180], [180, 360])}deg` }],
    backfaceVisibility: "hidden",
    position: "absolute",
    width: "100%",
    height: "100%",
  }));

  const typeColor = card.type === 'noun' ? Colors.palette.wine : card.type === 'verb' ? Colors.palette.gold : card.type === 'adjective' ? Colors.palette.terracotta : Colors.palette.terracotta;
  const typeLabel = card.type === 'noun' ? 'Sostantivo' : card.type === 'verb' ? 'Verbo' : card.type === 'adjective' ? 'Aggettivo' : 'Avverbo';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.swipeHints}>
        <View style={styles.swipeHintLeft}>
          <Ionicons name="refresh" size={14} color={Colors.palette.gold} />
          <Text style={[styles.swipeHintText, { color: Colors.palette.gold }]}>Still Learning</Text>
        </View>
        <View style={styles.swipeHintRight}>
          <Text style={[styles.swipeHintText, { color: Colors.palette.success }]}>Learned</Text>
          <Ionicons name="checkmark" size={14} color={Colors.palette.success} />
        </View>
      </View>

      <RNAnimated.View
        style={[styles.cardPressable, { transform: [{ translateX: dragX }, { rotate: cardRotate }] }]}
        {...panResponder.panHandlers}
      >
        <RNAnimated.View style={[styles.swipeOverlay, styles.swipeOverlayRight, { opacity: rightOverlayOpacity }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={48} color={Colors.palette.success} />
          <Text style={[styles.swipeOverlayText, { color: Colors.palette.success }]}>Learned!</Text>
        </RNAnimated.View>
        <RNAnimated.View style={[styles.swipeOverlay, styles.swipeOverlayLeft, { opacity: leftOverlayOpacity }]} pointerEvents="none">
          <Ionicons name="refresh-circle" size={48} color={Colors.palette.gold} />
          <Text style={[styles.swipeOverlayText, { color: Colors.palette.gold }]}>Practicing</Text>
        </RNAnimated.View>

        <Animated.View style={frontStyle}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            {mastered && <View style={styles.statusBadge}><Ionicons name="checkmark-circle" size={20} color={Colors.palette.success} /></View>}
            {needsPractice && !mastered && <View style={styles.statusBadge}><Ionicons name="refresh-circle" size={20} color={Colors.palette.gold} /></View>}
            <View style={[styles.typePill, { backgroundColor: typeColor + "18" }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <Text style={[styles.cardMain, { color: theme.text }]}>{isEnglishFirst ? card.english : card.italian}</Text>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>Tap to reveal · Swipe to judge</Text>
          </View>
        </Animated.View>

        <Animated.View style={backStyle}>
          <View style={[styles.card, { backgroundColor: isDark ? Colors.palette.wineDark : Colors.palette.wine }]}>
            <View style={[styles.typePill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={[styles.typeText, { color: "rgba(255,255,255,0.9)" }]}>{typeLabel}</Text>
            </View>
            <Text style={[styles.cardMain, { color: "#FFF" }]}>{isEnglishFirst ? card.italian : card.english}</Text>
            {card.example && (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleItalian}>{card.example}</Text>
                <Text style={styles.exampleEnglish}>{card.exampleTranslation}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </RNAnimated.View>

      <View style={styles.belowCard}>
        <TouchableOpacity style={[styles.speakBtn, { backgroundColor: theme.backgroundSecondary }]} onPress={speak}>
          <Ionicons name="volume-high-outline" size={18} color={theme.tint} />
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: needsPractice ? Colors.palette.gold + "22" : theme.backgroundSecondary, borderColor: needsPractice ? Colors.palette.gold : theme.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNeedsPractice(); }}
          >
            <Ionicons name="refresh" size={18} color={Colors.palette.gold} />
            <Text style={[styles.actionLabel, { color: Colors.palette.gold }]}>Still Learning</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: mastered ? Colors.palette.success + "22" : theme.backgroundSecondary, borderColor: mastered ? Colors.palette.success : theme.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onMastered(); }}
          >
            <Ionicons name="checkmark" size={18} color={Colors.palette.success} />
            <Text style={[styles.actionLabel, { color: Colors.palette.success }]}>Learned</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function FlashcardsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('setup');
  const [filter, setFilter] = useState<FilterType>('all');
  const [deckMode, setDeckMode] = useState<DeckMode>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [needsPracticeIds, setNeedsPracticeIds] = useState<Set<string>>(new Set());
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [isEnglishFirst, setIsEnglishFirst] = useState(false);

  // Undo history: tracks each card's state changes
  const [history, setHistory] = useState<Array<{ cardId: string; wasMastered: boolean; wasPractice: boolean }>>([]);

  const [streakVisible, setStreakVisible] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const streakChecked = useRef(false);

  const loadProgress = useCallback(async () => {
    const [mastered, needsPractice] = await Promise.all([getMasteredCards(), getNeedsPracticeCards()]);
    setMasteredIds(mastered);
    setNeedsPracticeIds(needsPractice);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      streakChecked.current = false;
    }, [loadProgress])
  );

  const filtered = FLASHCARDS.filter(c => filter === 'all' || c.type === filter);
  const practiceInFilter = filtered.filter(c => needsPracticeIds.has(c.id));
  const masteredCount = filtered.filter(c => masteredIds.has(c.id)).length;

  const startStudy = () => {
    let cards: Flashcard[];
    if (deckMode === 'practice') {
      cards = [...practiceInFilter];
    } else {
      cards = [...filtered];
    }
    if (cards.length === 0) return;
    
    // Always shuffle for the session
    cards.sort(() => Math.random() - 0.5);
    
    setDeck(cards);
    setCurrentIndex(0);
    setHistory([]);
    setPhase('study');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const shuffleDeck = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startStudy();
  };

  const handleFirstActivity = useCallback(async () => {
    if (streakChecked.current) return;
    streakChecked.current = true;
    const result = await checkAndRecordStudyDay();
    if (result.shouldCelebrate) {
      setStreakCount(result.streak);
      setStreakVisible(true);
    }
  }, []);

  const card = deck[Math.min(currentIndex, deck.length - 1)];

  const handleMastered = async (cardId: string) => {
    await handleFirstActivity();
    // Add to history before marking
    setHistory(prev => [...prev, { cardId, wasMastered: masteredIds.has(cardId), wasPractice: needsPracticeIds.has(cardId) }]);
    await markCardMastered(cardId);
    setMasteredIds(prev => new Set([...prev, cardId]));
    setNeedsPracticeIds(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    setTimeout(() => {
      if (currentIndex < deck.length - 1) setCurrentIndex(i => i + 1);
    }, 200);
  };

  const handleNeedsPractice = async (cardId: string) => {
    await handleFirstActivity();
    // Add to history before marking
    setHistory(prev => [...prev, { cardId, wasMastered: masteredIds.has(cardId), wasPractice: needsPracticeIds.has(cardId) }]);
    await markCardNeedsPractice(cardId);
    setNeedsPracticeIds(prev => new Set([...prev, cardId]));
    setMasteredIds(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    setTimeout(() => {
      if (currentIndex < deck.length - 1) setCurrentIndex(i => i + 1);
    }, 200);
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    // Revert the card state to what it was before
    if (lastAction.wasMastered) {
      await markCardMastered(lastAction.cardId);
      setMasteredIds(prev => new Set([...prev, lastAction.cardId]));
      setNeedsPracticeIds(prev => { const s = new Set(prev); s.delete(lastAction.cardId); return s; });
    } else if (lastAction.wasPractice) {
      await markCardNeedsPractice(lastAction.cardId);
      setNeedsPracticeIds(prev => new Set([...prev, lastAction.cardId]));
      setMasteredIds(prev => { const s = new Set(prev); s.delete(lastAction.cardId); return s; });
    } else {
      // Card was not marked before, so remove it from both
      setMasteredIds(prev => { const s = new Set(prev); s.delete(lastAction.cardId); return s; });
      setNeedsPracticeIds(prev => { const s = new Set(prev); s.delete(lastAction.cardId); return s; });
    }
    
    // Go back to the card before this action
    setCurrentIndex(i => Math.max(0, i - 1));
  };

  const handleShuffleDuring = () => {
    // Shuffle remaining cards while keeping current position
    const cardsBeforeCurrent = deck.slice(0, currentIndex);
    const remainingCards = deck.slice(currentIndex);
    
    // Shuffle the remaining cards
    remainingCards.sort(() => Math.random() - 0.5);
    
    // Combine back
    const newDeck = [...cardsBeforeCurrent, ...remainingCards];
    setDeck(newDeck);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetLabels = () => {
    Alert.alert(
      'Clear Card Labels',
      'This will remove all "Learned" and "Still Learning" labels from your flashcards. Your overall profile stats and conjugation progress will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Labels',
          style: 'destructive',
          onPress: async () => {
            await resetCardProgress();
            await loadProgress();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  if (phase === 'setup') {
    const practiceCount = practiceInFilter.length;
    const allCount = filtered.length;

    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.setupContent, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.setupHeaderRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Flashcards</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Choose your deck</Text>
          </View>
          <TouchableOpacity
            onPress={handleResetLabels}
            style={[styles.resetChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          >
            <Ionicons name="refresh" size={14} color={theme.textMuted} />
            <Text style={[styles.resetChipText, { color: theme.textMuted }]}>Reset Labels</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.palette.success }]}>{masteredCount}</Text>
            <Text style={[styles.statLbl, { color: theme.textMuted }]}>Learned</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.palette.gold }]}>{practiceCount}</Text>
            <Text style={[styles.statLbl, { color: theme.textMuted }]}>Practicing</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: theme.text }]}>{allCount - masteredCount - practiceCount}</Text>
            <Text style={[styles.statLbl, { color: theme.textMuted }]}>Unseen</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
          <View style={styles.filterGrid}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterOption, {
                  backgroundColor: filter === f.key ? Colors.palette.wine : theme.backgroundSecondary,
                  borderColor: filter === f.key ? Colors.palette.wine : theme.border,
                }]}
                onPress={() => { setFilter(f.key); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.filterOptionText, { color: filter === f.key ? '#FFF' : theme.text }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Deck Mode</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeOption, {
                backgroundColor: deckMode === 'all' ? Colors.palette.wine : theme.backgroundSecondary,
                borderColor: deckMode === 'all' ? Colors.palette.wine : theme.border,
                flex: 1,
              }]}
              onPress={() => { setDeckMode('all'); Haptics.selectionAsync(); }}
            >
              <Ionicons name="layers" size={20} color={deckMode === 'all' ? '#FFF' : theme.textSecondary} />
              <Text style={[styles.modeTitle, { color: deckMode === 'all' ? '#FFF' : theme.text }]}>All Cards</Text>
              <Text style={[styles.modeCount, { color: deckMode === 'all' ? 'rgba(255,255,255,0.75)' : theme.textMuted }]}>
                {allCount} cards
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, {
                backgroundColor: deckMode === 'practice' ? Colors.palette.gold : theme.backgroundSecondary,
                borderColor: deckMode === 'practice' ? Colors.palette.gold : theme.border,
                flex: 1,
                opacity: practiceCount === 0 ? 0.4 : 1,
              }]}
              onPress={() => { if (practiceCount > 0) { setDeckMode('practice'); Haptics.selectionAsync(); } }}
              disabled={practiceCount === 0}
            >
              <Ionicons name="refresh-circle" size={20} color={deckMode === 'practice' ? '#FFF' : theme.textSecondary} />
              <Text style={[styles.modeTitle, { color: deckMode === 'practice' ? '#FFF' : theme.text }]}>Still Learning</Text>
              <Text style={[styles.modeCount, { color: deckMode === 'practice' ? 'rgba(255,255,255,0.75)' : theme.textMuted }]}>
                {practiceCount === 0 ? 'None yet' : `${practiceCount} cards`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: Colors.palette.wine }]}
          onPress={startStudy}
        >
          <Ionicons name="play" size={18} color="#FFF" />
          <Text style={styles.startBtnText}>Start Studying</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, marginTop: -4 }]}
          onPress={shuffleDeck}
        >
          <Ionicons name="shuffle" size={18} color={theme.text} />
          <Text style={[styles.outlineBtnText, { color: theme.text }]}>Shuffle & Start</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const progress = deck.length > 0 ? (deck.filter(c => masteredIds.has(c.id)).length) / deck.length : 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <StreakBanner
        streak={streakCount}
        visible={streakVisible}
        onHide={() => setStreakVisible(false)}
      />

      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => { setPhase('setup'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Ionicons name="chevron-back" size={18} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {filter === 'all' ? 'All Cards' : filter === 'noun' ? 'Nouns' : filter === 'verb' ? 'Verbs' : 'Adjectives'}
            {deckMode === 'practice' ? ' · Reviewing' : ''}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {currentIndex + 1} of {deck.length}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary, opacity: history.length > 0 ? 1 : 0.4 }]}
          onPress={handleUndo}
          disabled={history.length === 0}
        >
          <Ionicons name="arrow-undo" size={18} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary, marginLeft: 8 }]}
          onPress={handleShuffleDuring}
        >
          <Ionicons name="shuffle" size={18} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary, marginLeft: 8 }]}
          onPress={() => { setCurrentIndex(0); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Ionicons name="refresh" size={18} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isEnglishFirst ? Colors.palette.gold : Colors.palette.wine }]}
          onPress={() => { setIsEnglishFirst(!isEnglishFirst); Haptics.selectionAsync(); }}
        >
          <Ionicons name={isEnglishFirst ? "language" : "book"} size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: Colors.palette.success }]} />
        </View>
      </View>

      <View style={styles.cardArea}>
        {card && (
          <SwipeableFlipCard
            key={`${card.id}-${currentIndex}`}
            card={card}
            mastered={masteredIds.has(card.id)}
            needsPractice={needsPracticeIds.has(card.id)}
            onMastered={() => handleMastered(card.id)}
            onNeedsPractice={() => handleNeedsPractice(card.id)}
            isEnglishFirst={isEnglishFirst}
          />
        )}
      </View>

      <View style={[styles.navRow, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          style={[styles.navBtn, { opacity: currentIndex > 0 ? 1 : 0.3, backgroundColor: theme.backgroundSecondary }]}
          onPress={() => { setCurrentIndex(i => i - 1); Haptics.selectionAsync(); }}
          disabled={currentIndex === 0}
        >
          <Ionicons name="chevron-back" size={22} color={theme.tint} />
        </TouchableOpacity>
        <View style={styles.dotRow}>
          {deck.slice(Math.max(0, currentIndex - 3), Math.min(deck.length, currentIndex + 4)).map((_, i) => {
            const actualIdx = Math.max(0, currentIndex - 3) + i;
            return (
              <View key={actualIdx} style={[styles.dot, { backgroundColor: actualIdx === currentIndex ? theme.tint : theme.border, width: actualIdx === currentIndex ? 16 : 6 }]} />
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.navBtn, { opacity: currentIndex < deck.length - 1 ? 1 : 0.3, backgroundColor: theme.backgroundSecondary }]}
          onPress={() => { setCurrentIndex(i => i + 1); Haptics.selectionAsync(); }}
          disabled={currentIndex === deck.length - 1}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.tint} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  setupContent: { paddingHorizontal: 20, gap: 14 },
  setupHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  resetChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  resetChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", borderRadius: 16, padding: 16, gap: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLbl: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  sectionCard: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterOption: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  filterOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modeRow: { flexDirection: "row", gap: 10 },
  modeOption: { borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  modeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modeCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  startBtn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  startBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  progressBar: { paddingHorizontal: 24, marginBottom: 8 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  cardArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardContainer: { width: CARD_WIDTH, alignItems: "center" },
  swipeHints: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 4, marginBottom: 8 },
  swipeHintLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  swipeHintRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  swipeHintText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardPressable: { width: CARD_WIDTH, height: 240, position: "relative" },
  swipeOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 8 },
  swipeOverlayRight: { backgroundColor: Colors.palette.success + "28" },
  swipeOverlayLeft: { backgroundColor: Colors.palette.gold + "28" },
  swipeOverlayText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  card: { width: "100%", height: "100%", borderRadius: 20, padding: 24, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
  statusBadge: { position: "absolute", top: 14, right: 14 },
  typePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 16 },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  cardMain: { fontSize: 30, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  cardHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 10, opacity: 0.6 },
  exampleBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center", paddingHorizontal: 8 },
  exampleItalian: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.95)", textAlign: "center", fontStyle: "italic" },
  exampleEnglish: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 3 },
  belowCard: { width: "100%", alignItems: "center" },
  speakBtn: { marginTop: 10, padding: 10, borderRadius: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 13, borderWidth: 1 },
  actionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 8 },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dotRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  dot: { height: 6, borderRadius: 3 },
});
