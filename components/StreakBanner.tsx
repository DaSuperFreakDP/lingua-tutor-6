import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getStreakMessage, getStreakFireEmojis } from "@/lib/utils";

interface StreakBannerProps {
  streak: number;
  visible: boolean;
  onHide: () => void;
}

export default function StreakBanner({ streak, visible, onHide }: StreakBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hide();
      }, 5000);
    } else {
      hide();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const fires = getStreakFireEmojis(streak);
  const message = getStreakMessage(streak);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          paddingTop: topPad + 10,
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity style={styles.inner} onPress={hide} activeOpacity={0.9}>
        <View style={styles.leftSection}>
          <Text style={styles.fires}>{fires}</Text>
          <View>
            <Text style={styles.streakNum}>{streak}-day streak!</Text>
            <Text style={styles.message} numberOfLines={2}>{message}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: Colors.palette.wine,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  fires: {
    fontSize: 28,
  },
  streakNum: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 1,
    flex: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
