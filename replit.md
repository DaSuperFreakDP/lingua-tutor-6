# Italiano - Italian Learning App

An Expo React Native app for learning Italian, featuring flashcards, conjugation exercises, tense reference, and a global profile.

## Architecture

- **Framework**: Expo SDK 54 with Expo Router (file-based routing)
- **Backend**: Express.js (TypeScript) on port 5000
- **Database**: PostgreSQL via Drizzle ORM
- **State**: AsyncStorage for local persistence, React state for UI
- **Navigation**: 4-tab structure (Flashcards, Conjugation, Tenses, Profile) using NativeTabs (liquid glass on iOS 26+) with classic Tabs fallback
- **Fonts**: Inter (400, 500, 600, 700) pre-loaded in _layout.tsx

## Project Structure

```
app/              - Expo Router screens (file-based routing)
  (tabs)/         - Tab screens (index, conjugation, tenses, profile)
  _layout.tsx     - Root layout with providers
assets/           - Images and app icons
components/       - Shared UI components (ErrorBoundary, StreakBanner, etc.)
constants/        - App-wide constants (colors)
lib/              - Utilities (query-client, progress-storage, italian-data, utils)
server/           - Express backend
  index.ts        - Server entry point
  routes.ts       - API routes
  storage.ts      - Data access layer
  templates/      - Landing page HTML
shared/           - Shared types (schema.ts for Drizzle)
scripts/          - Build scripts
```

## Workflows

- **Start Backend**: `npm run server:dev` - Express server on port 3000 (console)
- **Start Frontend**: `npm run expo:dev` - Expo Metro bundler on port 5000 (webview)

## Deployment

- Build: `npm run server:build && npm run expo:static:build`
- Run: `npm run server:prod`
- Target: autoscale

## Features

### Flashcards (app/(tabs)/index.tsx)
- 48 cards: nouns, verbs, adjectives
- Flip animation (tap to flip, shows Italian front / English back with example sentence)
- **Swipe right** = Learned, **swipe left** = Still Learning (PanResponder gestures with visual overlays)
- Buttons also available for marking cards
- Progress bar showing mastery %
- Text-to-speech for both languages
- Filter by category (All / Nouns / Verbs / Adjectives)

### Conjugation (app/(tabs)/conjugation.tsx)
- **Setup screen**: multi-select tenses (minimum 1), choose question count (10/20/50/100)
- **Test screen**: pre-generated queue strictly from selected tenses only
- Progress bar showing question position, live score chip
- Accent-insensitive answer checking (è → e, ò → o etc. all accepted)
- Correct/wrong feedback with the right answer shown
- Text-to-speech for each question
- Reveal button to see answer without counting as wrong
- **Results screen**: accuracy circle, score summary, retry same settings or change settings

### Tenses (app/(tabs)/tenses.tsx)
- 7 essential tense cards: Presente, Passato Prossimo, Imperfetto, Futuro Semplice, Condizionale, Congiuntivo, Imperativo
- Each expandable: when-to-use, trigger words, formation rule, 3 examples with audio, conjugation table for "parlare"

### Profile (app/(tabs)/profile.tsx)
- Proficiency level: Principiante → Elementare → Intermedio → Avanzato
- Days studied counter
- Stat blocks: Cards Learned, Practicing, Accuracy, Best Streak, Total Practice, Current Streak
- Flashcard mastery progress bar
- Conjugation score progress bar
- Recent 7 sessions with date + accuracy
- Learning tips
- Full reset button

## Data & Storage

- `lib/italian-data.ts`: All vocabulary (18 nouns, 15 verb flashcards, 15 adjectives), 14 verbs with conjugations in 7 tenses, 7 tense info entries
- `lib/progress-storage.ts`: AsyncStorage for mastered/practice cards, conjugation score/streak/sessions, days studied, profile stats
- `lib/utils.ts`: Accent-insensitive answer normalization (strips diacritics via NFD)

## Key Implementation Details

- Swipe gestures: PanResponder handles swipe left/right and tap-to-flip on the same card (disambiguated by dx threshold)
- Answer matching: NFD normalization strips all accents so "sono stato" matches "sono stato" without accent marks
- Tense filtering in conjugation: `buildQueue()` pre-generates the full queue from only the selected tenses
- Profile refreshes on every tab focus using `useFocusEffect`
