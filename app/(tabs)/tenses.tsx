import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { TENSE_INFO, VERBS } from "@/lib/italian-data";
import { checkAndRecordStudyDay } from "@/lib/progress-storage";

export default function TensesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [expandedTense, setExpandedTense] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      checkAndRecordStudyDay();
    }, [])
  );

  const getVerbExample = (tenseId: string, verbType: "are" | "ere" | "ire") => {
    let verbName;
    if (verbType === "are") verbName = "parlare";
    else if (verbType === "ere") verbName = "mettere";
    else verbName = "dormire";

    const verb = VERBS.find((v) => v.infinitive === verbName);
    if (!verb) return null;

    const conjugation = verb.tenses[tenseId as any];
    if (!conjugation) return null;

    return { verb, conjugation };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>Italian Tenses</Text>

        {TENSE_INFO.map((tense) => {
          const isExpanded = expandedTense === tense.id;

          return (
            <View key={tense.id}>
              <Pressable
                onPress={() =>
                  setExpandedTense(isExpanded ? null : tense.id)
                }
                style={[
                  styles.tenseButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tenseName, { color: theme.tint }]}>
                    {tense.italianName}
                  </Text>
                  <Text style={[styles.englishName, { color: theme.textSecondary }]}>
                    {tense.name}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>

              {isExpanded && (
                <View
                  style={[
                    styles.expandedContent,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                  ]}
                >
                  {/* When to use */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      When to use
                    </Text>
                    <Text style={[styles.sectionText, { color: theme.tabIconDefault }]}>
                      {tense.when}
                    </Text>
                  </View>

                  {/* Formation */}
                  {tense.formation && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Formation
                      </Text>
                      <Text style={[styles.sectionText, { color: theme.tabIconDefault }]}>
                        {tense.formation}
                      </Text>
                    </View>
                  )}

                  {/* Examples */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Examples
                    </Text>
                    {tense.examples.map((example, idx) => (
                      <View key={idx} style={styles.exampleBox}>
                        <Text style={[styles.exampleItalian, { color: theme.text }]}>
                          {example.italian}
                        </Text>
                        <Text style={[styles.exampleEnglish, { color: theme.textSecondary }]}>
                          {example.english}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Conjugation Tables */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Conjugation Examples
                    </Text>

                    {getVerbExample(tense.id, "are") && (
                      <View style={styles.verbSection}>
                        <Text style={[styles.verbLabel, { color: theme.tint }]}>
                          ARE verb: {getVerbExample(tense.id, "are")?.verb.infinitive}
                        </Text>
                        <ConjugationTable
                          conjugation={getVerbExample(tense.id, "are")!.conjugation}
                          theme={theme}
                        />
                      </View>
                    )}

                    {getVerbExample(tense.id, "ere") && (
                      <View style={styles.verbSection}>
                        <Text style={[styles.verbLabel, { color: theme.tint }]}>
                          ERE verb: {getVerbExample(tense.id, "ere")?.verb.infinitive}
                        </Text>
                        <ConjugationTable
                          conjugation={getVerbExample(tense.id, "ere")!.conjugation}
                          theme={theme}
                        />
                      </View>
                    )}

                    {getVerbExample(tense.id, "ire") && (
                      <View style={styles.verbSection}>
                        <Text style={[styles.verbLabel, { color: theme.tint }]}>
                          IRE verb: {getVerbExample(tense.id, "ire")?.verb.infinitive}
                        </Text>
                        <ConjugationTable
                          conjugation={getVerbExample(tense.id, "ire")!.conjugation}
                          theme={theme}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ConjugationTable({
  conjugation,
  theme,
}: {
  conjugation: any;
  theme: typeof Colors.light | typeof Colors.dark;
}) {
  const pronouns = ["io", "tu", "lui", "lei", "noi", "voi", "loro"];
  const keys = ["io", "tu", "lui", "noi", "voi", "loro"] as const;

  return (
    <View style={styles.table}>
      {keys.map((key, idx) => (
        <View key={key} style={[styles.tableRow, { borderBottomColor: theme.separator }]}>
          <Text style={[styles.tableLabel, { color: theme.tint }]}>{pronouns[idx]}</Text>
          <Text style={[styles.tableValue, { color: theme.text }]}>{conjugation[key] || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  tenseButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tenseName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  englishName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  expandedContent: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    marginTop: -10,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  exampleBox: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  exampleItalian: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  exampleEnglish: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  verbSection: {
    marginBottom: 12,
  },
  verbLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  table: {
    borderRadius: 8,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  tableLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    minWidth: 50,
  },
  tableValue: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "right",
  },
});
