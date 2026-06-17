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
import { registerApi } from "../../api/user.api";
import { useApp } from "../../context/AppContext";

const USER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
  { value: "admin", label: "Admin" },
];
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// Keep these tokens identical to login.jsx so both screens read as one flow.
// Ice blue two-tone palette: the whole screen is the gradient, the card
// floats on top as frosted glass rather than a flat white panel.
const COLORS = {
  gradientFrom: "#BEE3F8",
  gradientVia: "#6FB6E0",
  gradientTo: "#2E7FB8",
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
  accentText: "#2E7FB8",
  dangerBg: "rgba(255,255,255,0.18)",
  dangerBorder: "rgba(255,255,255,0.4)",
  white: "#FFFFFF",
  segmentActiveBg: "#FFFFFF",
  segmentInactiveBg: "rgba(255,255,255,0.22)",
  segmentInactiveBorder: "rgba(255,255,255,0.4)",
};

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken, setUser } = useApp();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    phone: "",
    gender: "male",
    usertype: "individual",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    const { firstname, lastname, email, password, phone, gender, usertype } = form;

    if (!firstname || !lastname || !email || !password || !phone) {
      setError("Please fill in all required fields.");
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
        phone: phone.trim(),
        gender,
        usertype,
      });

      if (data.success && data.token) {
        await setToken(data.token);
        await setUser(data.user);
        router.replace("/(tabs)/home");
      } else {
        setError(data.message || "Registration failed. Try again.");
      }
    } catch (err) {
      let msg = "Registration failed. Check your connection.";
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

  const renderInput = ({ field, label, icon, placeholder, keyboardType, secure, autoCapitalize = "sentences" }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.input,
          borderWidth: 1.5,
          borderColor: inputBorderColor(field),
          borderRadius: 16,
          paddingHorizontal: 14,
          gap: 10,
        }}
      >
        <Ionicons name={icon} size={18} color={COLORS.iconMuted} />
        <TextInput
          style={{ flex: 1, color: COLORS.textInInput, paddingVertical: 14, fontSize: 15 }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={form[field]}
          onChangeText={(v) => update(field, v)}
          onFocus={() => setFocusedField(field)}
          onBlur={() => setFocusedField(null)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure && !showPassword}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.accentText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSegmented = (options, field) => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((opt) => {
        const active = form[field] === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => update(field, opt.value)}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 13,
              alignItems: "center",
              backgroundColor: active ? COLORS.segmentActiveBg : COLORS.segmentInactiveBg,
              borderWidth: 1.5,
              borderColor: active ? COLORS.segmentActiveBg : COLORS.segmentInactiveBorder,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: active ? COLORS.accentText : COLORS.white,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

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
          <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}>Back</Text>
            </TouchableOpacity>

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

            <Text style={{ color: COLORS.textOnGlassPrimary, fontSize: 28, fontWeight: "700", marginTop: 18, letterSpacing: -0.5 }}>
              Create account
            </Text>
            <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 15, marginTop: 6, marginBottom: 28 }}>
              Join TaskFlow and manage work smarter
            </Text>

            <View
              style={{
                backgroundColor: COLORS.cardGlass,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: COLORS.cardBorder,
                padding: 22,
              }}
            >
              {/* Name row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  {renderInput({ field: "firstname", label: "First name", icon: "person-outline", placeholder: "John" })}
                </View>
                <View style={{ flex: 1 }}>
                  {renderInput({ field: "lastname", label: "Last name", icon: "person-outline", placeholder: "Doe" })}
                </View>
              </View>

              {renderInput({
                field: "email",
                label: "Email address",
                icon: "mail-outline",
                placeholder: "you@example.com",
                keyboardType: "email-address",
                autoCapitalize: "none",
              })}

              {renderInput({
                field: "password",
                label: "Password",
                icon: "lock-closed-outline",
                placeholder: "Min. 3 characters",
                secure: true,
                autoCapitalize: "none",
              })}

              {renderInput({
                field: "phone",
                label: "Phone number",
                icon: "call-outline",
                placeholder: "e.g. 9876543210",
                keyboardType: "phone-pad",
              })}

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" }}>
                  Gender
                </Text>
                {renderSegmented(GENDERS, "gender")}
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" }}>
                  Account type
                </Text>
                {renderSegmented(USER_TYPES, "usertype")}
              </View>

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
                onPress={handleRegister}
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
                    Create account
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 26 }}>
              <Text style={{ color: COLORS.textOnGlassSecondary, fontSize: 14 }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={{ color: COLORS.white, fontWeight: "700", fontSize: 14 }}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}