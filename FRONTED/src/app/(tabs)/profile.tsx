import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("token");
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0F0E17]">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-white text-3xl font-bold mb-6">Profile</Text>

        {/* Avatar placeholder */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-[#6C63FF] items-center justify-center mb-4">
            <Text className="text-white text-4xl font-bold">U</Text>
          </View>
          <Text className="text-white text-xl font-bold">User</Text>
          <Text className="text-[#9B9BAE] text-sm mt-1">user@example.com</Text>
        </View>

        {/* Menu Items */}
        <View className="bg-[#1C1B2E] rounded-2xl border border-[#252438] overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-[#252438]">
            <Text className="text-lg mr-3">⚙️</Text>
            <Text className="text-white text-base flex-1">Settings</Text>
            <Text className="text-[#555468]">→</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4 border-b border-[#252438]">
            <Text className="text-lg mr-3">🎨</Text>
            <Text className="text-white text-base flex-1">Appearance</Text>
            <Text className="text-[#555468]">→</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4">
            <Text className="text-lg mr-3">❓</Text>
            <Text className="text-white text-base flex-1">Help & Support</Text>
            <Text className="text-[#555468]">→</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl py-4 items-center"
        >
          <Text className="text-red-400 font-bold text-base">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
