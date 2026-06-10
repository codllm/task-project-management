import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TasksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0F0E17]">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-white text-3xl font-bold mb-6">My Tasks</Text>
        <View className="bg-[#1C1B2E] rounded-2xl p-6 items-center border border-[#252438]">
          <Text className="text-4xl mb-3">✅</Text>
          <Text className="text-[#9B9BAE] text-base text-center">
            No tasks assigned to you yet.{"\n"}Tasks will appear here once created.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
