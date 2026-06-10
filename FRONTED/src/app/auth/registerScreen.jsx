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
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { registerApi } from "../../api/user.api";

const USER_TYPES = ["individual", "team", "admin"];
const GENDERS = ["male", "female", "other"];

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "male",
    usertype: "individual",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    const {
      firstname,
      lastname,
      email,
      password,
      confirmPassword,
      age,
      gender,
      usertype,
    } = form;

    if (!firstname || !lastname || !email || !password || !age) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (isNaN(Number(age)) || Number(age) < 1) {
      setError("Please enter a valid age.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await registerApi({
        firstname,
        lastname,
        email: email.trim(),
        password,
        age: Number(age),
        gender,
        usertype: usertype,
      });

      if (data.success && data.token) {
        await SecureStore.setItemAsync("token", data.token);
        await SecureStore.setItemAsync("User", JSON.stringify(data.user));
        router.replace("/(tabs)/home");
      } else {
        setError(data.message || "Registration failed. Try again.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Registration failed. Check your connection.";
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
        showsVerticalScrollIndicator={false}
      >
        {/* Background blob */}
        <View className="absolute top-0 left-0 right-0 h-64 bg-[#6C63FF] opacity-20 rounded-b-[80px]" />

        <View className="flex-1 px-6 pt-16 pb-10">
          {/* Header */}
          <View className="mb-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
              <Text className="text-[#6C63FF] text-base">← Back</Text>
            </TouchableOpacity>
            <View className="w-14 h-14 rounded-2xl bg-[#6C63FF] items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">T</Text>
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">
              Create account
            </Text>
            <Text className="text-[#9B9BAE] text-base mt-2">
              Join TaskFlow and manage work smarter
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-[#1C1B2E] rounded-3xl p-6 shadow-xl">
            {/* Name Row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                  First Name *
                </Text>
                <View className="bg-[#252438] rounded-2xl px-4">
                  <TextInput
                    className="text-white py-4 text-base"
                    placeholder="John"
                    placeholderTextColor="#555468"
                    value={form.firstname}
                    onChangeText={(v) => update("firstname", v)}
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                  Last Name *
                </Text>
                <View className="bg-[#252438] rounded-2xl px-4">
                  <TextInput
                    className="text-white py-4 text-base"
                    placeholder="Doe"
                    placeholderTextColor="#555468"
                    value={form.lastname}
                    onChangeText={(v) => update("lastname", v)}
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Email Address *
              </Text>
              <View className="bg-[#252438] rounded-2xl px-4">
                <TextInput
                  className="text-white py-4 text-base"
                  placeholder="you@example.com"
                  placeholderTextColor="#555468"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={form.email}
                  onChangeText={(v) => update("email", v)}
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Password *
              </Text>
              <View className="bg-[#252438] rounded-2xl flex-row items-center px-4">
                <TextInput
                  className="flex-1 text-white py-4 text-base"
                  placeholder="Min. 3 characters"
                  placeholderTextColor="#555468"
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(v) => update("password", v)}
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

            {/* Confirm Password */}
            <View className="mb-4">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Confirm Password *
              </Text>
              <View className="bg-[#252438] rounded-2xl px-4">
                <TextInput
                  className="text-white py-4 text-base"
                  placeholder="Repeat password"
                  placeholderTextColor="#555468"
                  secureTextEntry={!showPassword}
                  value={form.confirmPassword}
                  onChangeText={(v) => update("confirmPassword", v)}
                />
              </View>
            </View>

            {/* Age */}
            <View className="mb-4">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Age *
              </Text>
              <View className="bg-[#252438] rounded-2xl px-4">
                <TextInput
                  className="text-white py-4 text-base"
                  placeholder="e.g. 25"
                  placeholderTextColor="#555468"
                  keyboardType="numeric"
                  value={form.age}
                  onChangeText={(v) => update("age", v)}
                />
              </View>
            </View>

            {/* Gender Selector */}
            <View className="mb-4">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Gender
              </Text>
              <View className="flex-row gap-2">
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => update("gender", g)}
                    className={`flex-1 py-3 rounded-xl items-center border ${
                      form.gender === g
                        ? "bg-[#6C63FF] border-[#6C63FF]"
                        : "bg-[#252438] border-[#252438]"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold capitalize ${
                        form.gender === g ? "text-white" : "text-[#9B9BAE]"
                      }`}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* User Type Selector */}
            <View className="mb-6">
              <Text className="text-[#9B9BAE] text-sm mb-2 font-medium">
                Account Type
              </Text>
              <View className="flex-row gap-2">
                {USER_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => update("usertype", t)}
                    className={`flex-1 py-3 rounded-xl items-center border ${
                      form.usertype === t
                        ? "bg-[#6C63FF] border-[#6C63FF]"
                        : "bg-[#252438] border-[#252438]"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold capitalize ${
                        form.usertype === t ? "text-white" : "text-[#9B9BAE]"
                      }`}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
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
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-[#9B9BAE] text-base">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text className="text-[#6C63FF] font-bold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
