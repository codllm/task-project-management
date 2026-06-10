// HomeScreen.tsx = fixed
import { View, Text, ScrollView,TouchableOpacity,Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { getUserWorkspace } from "../../api/workspace.api";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export default function HomeScreen() {
  const [workspaces, setWorkspaces] = useState([]);

  // ✅ Fix 1: fetchWorkspaces was defined but never called – added useEffect
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const userString = await SecureStore.getItemAsync("User");

      if (!token || !userString) {
        console.warn("No token or user found");
        return;
      }

      const user = JSON.parse(userString);

      const response = await getUserWorkspace(user._id);

      setWorkspaces(response.workspaces);
    } catch (err) {
      console.error("Error fetching workspaces:", err);
    }
  };
  const handleCreateWorkspace=()=>{
    router.push("/(tabs)/createWorkspace");
  }


  return (
    <SafeAreaView className="flex-1 bg-[#0F0E17]">
      <ScrollView className="flex-1 px-5 pt-4">
        {workspaces.length === 0 && (
          // ✅ Fix 2: removed stray '` after opening View tag
          <View className="flex-1 items-center justify-center px-6 mt-10">
            <Image
              source={{
                uri: "https://res.cloudinary.com/dju008haw/image/upload/v1780851712/ChatGPT_Image_Jun_7_2026_10_29_48_PM_av8r68.png",
              }}
              className="w-full h-64"
              resizeMode="contain"
            />

            <Text className="text-white text-2xl font-bold mt-4 text-center">
              Create Your First Workspace
            </Text>

            <Text className="text-[#909BAE] text-base text-center mt-3 leading-6">
              Collaborate with your team, manage projects, assign tasks, and
              track progress all in one place.
            </Text>

            <TouchableOpacity
              className="bg-[#6C63FF] px-8 py-4 rounded-2xl mt-8"
              onPress={handleCreateWorkspace}
              
            >
              <Text className="text-white font-semibold text-base">
                + Create Workspace
              </Text>
            </TouchableOpacity>

            <View className="flex-row mt-8 gap-6">
              <View className="items-center">
                <Text className="text-xl">👥</Text>
                <Text className="text-[#909BAE] text-xs mt-1">Team Work</Text>
              </View>

              <View className="items-center">
                <Text className="text-xl">📋</Text>
                <Text className="text-[#909BAE] text-xs mt-1">Tasks</Text>
              </View>

              <View className="items-center">
                <Text className="text-xl">🚀</Text>
                <Text className="text-[#909BAE] text-xs mt-1">
                  Productivity
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ✅ Fix 3: wrapped multiple JSX elements in a Fragment – can't put JSX after '&&' without a single root */}
        {workspaces.length > 0 && (
          <>
            {/* Greeting */}
            <View className="mb-6">
              <Text className="text-[#909BAE] text-base">Good evening 👋</Text>
              <Text className="text-white text-3xl font-bold mt-1">
                Dashboard
              </Text>
            </View>

            {/* Stats Cards */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 bg-[#6C63FF] rounded-2xl p-4">
                <Text className="text-white/70 text-sm">Total Tasks</Text>
                <Text className="text-white text-3xl font-bold mt-1">0</Text>
              </View>
              <View className="flex-1 bg-[#1C1B2E] border border-[#252438] rounded-2xl p-4">
                <Text className="text-[#909BAE] text-sm">Completed</Text>
                <Text className="text-white text-3xl font-bold mt-1">0</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mb-8">
              <View className="flex-1 bg-[#1C1B2E] border border-[#252438] rounded-2xl p-4">
                <Text className="text-[#909BAE] text-sm">In Progress</Text>
                <Text className="text-[#FFA840] text-3xl font-bold mt-1">
                  0
                </Text>
              </View>
              <View className="flex-1 bg-[#1C1B2E] border border-[#252438] rounded-2xl p-4">
                <Text className="text-[#909BAE] text-sm">Workspaces</Text>
                <Text className="text-[#66BB6A] text-3xl font-bold mt-1">
                  {workspaces.length}
                </Text>
              </View>
            </View>

            {/* Recent Activity */}
            <View className="mb-6">
              <Text className="text-white text-xl font-bold mb-4">
                Recent Activity
              </Text>
              <View className="bg-[#1C1B2E] rounded-2xl p-6 items-center border border-[#252438]">
                <Text className="text-4xl mb-3">📭</Text>
                <Text className="text-[#909BAE] text-base text-center">
                  No recent activity yet.{"\n"}Create your first workspace to
                  get started!
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
