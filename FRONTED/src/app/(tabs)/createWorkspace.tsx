import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useApp } from "../../context/AppContext";
import { createWorkspace } from "../../api/workspace.api";

export default function CreateWorkspaceScreen() {
  const router = useRouter();
  const { refreshWorkspaces, themeColor } = useApp();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }
    if (name.trim().length < 3) {
      setError("Workspace name must be at least 3 characters.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (res.success) {
        Alert.alert("Success", `Workspace "${res.workspace.name}" created successfully!`);
        await refreshWorkspaces();
        router.replace("/(tabs)/home");
      } else {
        setError("Failed to create workspace");
      }
    } catch (err: any) {
      console.error("Create Workspace Error Details:", err);
      if (err?.response) {
        console.error("Create Workspace Response Data:", err.response.data);
      }
      const msg = err?.response?.data?.message || "Failed to create workspace. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" style={{ backgroundColor: "#0A0A0C" }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6 pt-4"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <TouchableOpacity onPress={() => router.back()} className="py-2">
              <Text className="text-base font-semibold" style={{ color: themeColor }}>← Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">New Workspace</Text>
            <View className="w-10" />
          </View>

          {/* Form Card */}
          <View className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl mt-4" style={{ backgroundColor: "#141416", borderColor: "#232326" }}>
            <Text className="text-white text-2xl font-bold mb-2">Create Workspace</Text>
            <Text className="text-[#9B9BAE] text-sm mb-6">
              Workspaces are shared areas where teams can manage tasks and projects.
            </Text>

            {/* Name */}
            <View className="mb-5">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">Workspace Name *</Text>
              <View className="bg-dark-input rounded-2xl px-4 border border-dark-input-border" style={{ backgroundColor: "#1C1C1E", borderColor: "#2C2C2E" }}>
                <TextInput
                  className="text-white py-4 text-base"
                  placeholder="e.g. Design Team, Marketing"
                  placeholderTextColor="#555468"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">Description (Optional)</Text>
              <View className="bg-dark-input rounded-2xl px-4 border border-dark-input-border min-h-[100px] justify-start py-2" style={{ backgroundColor: "#1C1C1E", borderColor: "#2C2C2E" }}>
                <TextInput
                  className="text-white text-base"
                  placeholder="What is this workspace for?"
                  placeholderTextColor="#555468"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              className="rounded-2xl py-4 items-center shadow-lg"
              style={{
                backgroundColor: themeColor,
                shadowColor: themeColor,
                shadowOpacity: 0.4,
                shadowRadius: 10,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#0C101B" />
              ) : (
                <Text className="text-[#0C101B] font-bold text-base">Create Workspace</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
