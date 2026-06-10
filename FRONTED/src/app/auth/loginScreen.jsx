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
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { loginApi } from "../../api/user.api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await loginApi({ email: email.trim(), password });
      console.log("Login response:", data);
      if (data.success && data.token) {
        await SecureStore.setItemAsync("token", data.token);
        await SecureStore.setItemAsync("User", JSON.stringify(data.user));
        router.replace("/(tabs)/home");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Login failed. Check your connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0F0E17]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Gradient Blob */}
        <View className="absolute top-0 left-0 right-0 h-72 bg-[#6C63FF] opacity-20 rounded-b-[80px]" />

        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo / Header */}
          <View className="mb-10">
            <View className="w-14 h-14 rounded-2xl bg-[#6C63FF] items-center justify-center mb-5">
              <Text className="text-white text-2xl font-bold">T</Text>
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">
              Welcome back
            </Text>
            <Text className="text-[#9B9BAE] text-base mt-2">
              Sign in to continue to TaskFlow
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-[#1C1B2E] rounded-3xl p-6 shadow-xl">
            {/* Email */}
            <View className="mb-4">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Email Address
              </Text>
              <View className="bg-[#252438] rounded-2xl flex-row items-center px-4">
                <TextInput
                  className="flex-1 text-white py-4 text-base"
                  placeholder="you@example.com"
                  placeholderTextColor="#555468"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-2">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Password
              </Text>
              <View className="bg-[#252438] rounded-2xl flex-row items-center px-4">
                <TextInput
                  className="flex-1 text-white py-4 text-base"
                  placeholder="Min. 3 characters"
                  placeholderTextColor="#555468"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text className="text-[#6C63FF] text-sm font-semibold">
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity className="self-end mb-5">
              <Text className="text-[#6C63FF] text-sm font-medium">
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Error */}
            {error ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-[#6C63FF] rounded-2xl py-4 items-center shadow-lg"
              style={{
                shadowColor: "#6C63FF",
                shadowOpacity: 0.5,
                shadowRadius: 12,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base tracking-wide">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="flex-row items-center my-7">
            <View className="flex-1 h-px bg-[#252438]" />
            <Text className="text-[#555468] mx-4 text-sm">
              or continue with
            </Text>
            <View className="flex-1 h-px bg-[#252438]" />
          </View>

          {/* Social placeholder */}
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 bg-[#1C1B2E] border border-[#252438] rounded-2xl py-3 items-center">
              <Text className="text-white font-semibold">🌐 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-[#1C1B2E] border border-[#252438] rounded-2xl py-3 items-center">
              <Text className="text-white font-semibold">🍎 Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-[#9B9BAE] text-base">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text className="text-[#6C63FF] font-bold text-base">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
