import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";

import { AppProvider, useApp } from "../context/AppContext";

function RootLayoutContent() {
  const { token, loading, themeColor } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (token) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/(auth)/login");
    }
  }, [loading, token]);

  if (loading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center" style={{ backgroundColor: "#0B0F19" }}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutContent />
    </AppProvider>
  );
}