import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import React from "react";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }} />
        <Label>Flashcards</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conjugation">
        <Icon sf={{ default: "pencil.and.outline", selected: "pencil.and.outline" }} />
        <Label>Conjugate</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tenses">
        <Icon sf={{ default: "text.book.closed", selected: "text.book.closed.fill" }} />
        <Label>Tenses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#1A0A05" : "#FAF6F0",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#1A0A05" : "#FAF6F0" }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Flashcards",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="rectangle.stack" tintColor={color} size={size} />
            ) : (
              <Ionicons name="layers-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="conjugation"
        options={{
          title: "Conjugate",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="pencil.and.outline" tintColor={color} size={size} />
            ) : (
              <Ionicons name="pencil-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tenses"
        options={{
          title: "Tenses",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="text.book.closed" tintColor={color} size={size} />
            ) : (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person.circle" tintColor={color} size={size} />
            ) : (
              <Ionicons name="person-circle-outline" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
