import { View, ActivityIndicator } from "react-native";

// This screen is only visible for a brief moment while _layout.tsx
// determines auth state and redirects. Show a branded splash.
export default function IndexScreen() {
  return (
    <View className="flex-1 bg-dark-bg items-center justify-center" style={{ backgroundColor: "#0B0F19" }}>
      <ActivityIndicator size="large" color="#C2F193" />
    </View>
  );
}