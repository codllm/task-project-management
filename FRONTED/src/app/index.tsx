import { View, ActivityIndicator } from "react-native";

// This screen is only visible for a brief moment while _layout.tsx
// determines auth state and redirects. Show a branded splash.
export default function IndexScreen() {
  return (
    <View className="flex-1 bg-[#0F0E17] items-center justify-center">
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}