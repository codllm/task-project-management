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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { loginApi } from "../../api/user.api";
import { useApp } from "../../context/AppContext";

// Design tokens — feel free to lift these into a theme file and reuse
// across both Login and Register so the two screens always stay in sync.
// Ice blue two-tone palette: the whole screen is the gradient, the card
// floats on top as frosted glass rather than a flat white panel.
const COLORS = {
  gradientFrom: "#BEE3F8", // pale ice blue
  gradientVia: "#6FB6E0",
  gradientTo: "#2E7FB8", // deep ocean blue
  cardGlass: "rgba(255,255,255,0.16)",
  cardBorder: "rgba(255,255,255,0.35)",
  input: "rgba(255,255,255,0.92)",
  inputBorder: "rgba(255,255,255,0.6)",
  inputFocused: "#FFFFFF",
  textOnGlassPrimary: "#FFFFFF",
  textOnGlassSecondary: "#EAF6FD",
  textInInput: "#16313D",
  placeholder: "#9CB9C7",
  iconMuted: "#6FA8CC",
  divider: "rgba(255,255,255,0.35)",
  accentText: "#2E7FB8", // used for text/icons that sit on white surfaces
  danger: "#FFE3DC",
  dangerBg: "rgba(255,255,255,0.18)",
  dangerBorder: "rgba(255,255,255,0.4)",
  white: "#FFFFFF",
};

export default function LoginScreen() {
  const router = useRouter();
  const { setToken, setUser } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await loginApi({ email: email.trim(), password });
      if (data.success && data.token) {
        await setToken(data.token);
        await setUser(data.user);
        router.replace("/(tabs)/home");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      let msg = "Login failed. Check your connection.";
      if (err?.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        msg = err.response.data.errors.map((e) => e.msg).join(", ");
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBorderColor = (field) =>
    focusedField === field ? COLORS.inputFocused : "transparent";

  return (
    <LinearGradient
      colors={[COLORS.gradientFrom, COLORS.gradientVia, COLORS.gradientTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 }}>
            {/* Logo badge — solid white so it pops against the gradient */}
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: COLORS.white,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#0C3C5A",
                shadowOpacity: 0.25,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
              }}
            >
              <Ionicons name="flash" size={26} color={COLORS.accentText} />
            </View>

            <Text
              style={{
                color: COLORS.textOnGlassPrimary,
                fontSize: 30,
                fontWeight: "700",
                marginTop: 20,
                letterSpacing: -0.5,
              }}
            >
              Welcome back
            </Text>
            <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 15, marginTop: 6, marginBottom: 28 }}>
              Sign in to continue to TaskFlow
            </Text>

            {/* Frosted glass card */}
            <View
              style={{
                backgroundColor: COLORS.cardGlass,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: COLORS.cardBorder,
                padding: 22,
              }}
            >
              {/* Email */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" }}>
                  Email address
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: COLORS.input,
                    borderWidth: 1.5,
                    borderColor: inputBorderColor("email"),
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    gap: 10,
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={COLORS.iconMuted} />
                  <TextInput
                    style={{ flex: 1, color: COLORS.textInInput, paddingVertical: 14, fontSize: 15 }}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" }}>
                  Password
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: COLORS.input,
                    borderWidth: 1.5,
                    borderColor: inputBorderColor("password"),
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    gap: 10,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.iconMuted} />
                  <TextInput
                    style={{ flex: 1, color: COLORS.textInInput, paddingVertical: 14, fontSize: 15 }}
                    placeholder="Min. 3 characters"
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={COLORS.accentText}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: 18, marginTop: 4 }}>
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "600" }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {error ? (
                <View
                  style={{
                    backgroundColor: COLORS.dangerBg,
                    borderWidth: 1,
                    borderColor: COLORS.dangerBorder,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: COLORS.white,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  shadowColor: "#0C3C5A",
                  shadowOpacity: 0.25,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.accentText} />
                ) : (
                  <Text style={{ color: COLORS.accentText, fontWeight: "700", fontSize: 15, letterSpacing: 0.3 }}>
                    Sign in
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 26 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.divider }} />
              <Text style={{ color: COLORS.textOnGlassSecondary, marginHorizontal: 14, fontSize: 12 }}>
                or continue with
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.divider }} />
            </View>

            {/* Social */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: COLORS.input,
                  borderRadius: 16,
                  paddingVertical: 13,
                }}
              >
                <Ionicons name="logo-google" size={17} color={COLORS.accentText} />
                <Text style={{ color: COLORS.textInInput, fontWeight: "600", fontSize: 14 }}>
                  Google
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: COLORS.input,
                  borderRadius: 16,
                  paddingVertical: 13,
                }}
              >
                <Ionicons name="logo-apple" size={18} color={COLORS.accentText} />
                <Text style={{ color: COLORS.textInInput, fontWeight: "600", fontSize: 14 }}>
                  Apple
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer link */}
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 30 }}>
              <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 14 }}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={{ color: COLORS.white, fontWeight: "700", fontSize: 14 }}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}