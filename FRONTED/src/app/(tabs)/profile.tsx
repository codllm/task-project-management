import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../../context/AppContext";
import { updateProfileApi } from "../../api/user.api";

const GENDERS = ["male", "female", "other"];

const THEME_COLORS = [
  { name: "Lime", color: "#C2F193" },
  { name: "Blue", color: "#3A76E1" },
  { name: "Purple", color: "#E8D4F5" },
  { name: "Orange", color: "#FED7AA" },
];

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg: "#15171C",
  card: "#15171C",
  input: "#1C1E24",
  border: "#232630",
  borderSubtle: "#1E2028",
  textPrimary: "#F0F2F8",
  textSecondary: "#D8DCE8",
  textMuted: "#5E6A85",
  textLabel: "#7A86A0",
  danger: "#E54848",
  dangerBg: "rgba(229,72,72,0.08)",
  dangerBorder: "rgba(229,72,72,0.2)",
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function ProfileScreen() {
  const { user, setUser, logout, themeColor, setThemeColor } = useApp();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstname, setFirstname] = useState(user?.username?.firstname || "");
  const [lastname, setLastname] = useState(user?.username?.lastname || "");
 
  const [phone, setPhone] = useState(user?.phone || "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const handleOpenEdit = () => {
    setFirstname(user?.username?.firstname || "");
    setLastname(user?.username?.lastname || "");
    setPhone(user?.phone || "");
    setError("");
    setEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!firstname.trim() || !lastname.trim()) {
      setError("First and last name are required.");
      return;
    }
   
    setUpdating(true);
    setError("");
    try {
      const res = await updateProfileApi({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        phone: phone.trim() || undefined,
      });
      if (res.success) {
        Alert.alert("Success", "Profile updated successfully!");
        await setUser(res.user);
        setEditModalVisible(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  const getInitials = () => {
    if (!user?.username) return "U";
    return `${user.username.firstname[0]}${user.username.lastname[0]}`.toUpperCase();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Avatar card ── */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 0.5,
            borderColor: C.border,
            paddingVertical: 28,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: themeColor,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#0C1208", fontSize: 26, fontWeight: "500" }}>
              {getInitials()}
            </Text>
          </View>

          <Text
            style={{
              color: C.textPrimary,
              fontSize: 18,
              fontWeight: "500",
              marginBottom: 3,
            }}
          >
            {user?.username?.firstname} {user?.username?.lastname}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>
            {user?.email}
          </Text>

          <View
            style={{
              backgroundColor: "#15171C",
              borderRadius: 20,
              borderWidth: 0.5,
              borderColor: C.border,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: "#9BA3B8", fontSize: 11, fontWeight: "500" }}>
              💼 {user?.usertype} Account
            </Text>
          </View>
        </View>

        {/* ── Section: About me ── */}
        <SectionLabel label="About me" />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: C.border,
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <DetailRow label="Phone" value={user?.phone || "Not specified"} last />
        </View>

        {/* ── Section: App theme ── */}
        <SectionLabel label="App theme" />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: C.border,
            padding: 14,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            Choose a global accent color
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 12,
            }}
          >
            {THEME_COLORS.map((tc) => {
              const isSelected = themeColor === tc.color;
              return (
                <TouchableOpacity
                  key={tc.color}
                  onPress={() => setThemeColor(tc.color)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: tc.color,
                    borderWidth: 2,
                    borderColor: isSelected ? "#FFFFFF" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel={`${tc.name} theme`}
                  accessibilityState={{ selected: isSelected }}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "rgba(0,0,0,0.25)",
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Section: Account ── */}
        <SectionLabel label="Account" />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: C.border,
            overflow: "hidden",
          }}
        >
          {/* Edit profile */}
          <TouchableOpacity
            onPress={handleOpenEdit}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: C.borderSubtle,
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: `${themeColor}14`,
                  borderWidth: 0.5,
                  borderColor: `${themeColor}26`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 15 }}>✏️</Text>
              </View>
              <Text style={{ color: C.textSecondary, fontSize: 14, fontWeight: "500" }}>
                Edit profile
              </Text>
            </View>
            <Text style={{ color: C.border, fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: C.dangerBg,
                  borderWidth: 0.5,
                  borderColor: C.dangerBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 15 }}>🚪</Text>
              </View>
              <Text style={{ color: C.danger, fontSize: 14, fontWeight: "500" }}>
                Sign out
              </Text>
            </View>
            <Text style={{ color: `${C.danger}66`, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity activeOpacity={1}>
              <View
                style={{
                  backgroundColor: C.card,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderTopWidth: 0.5,
                  borderColor: C.border,
                  paddingHorizontal: 18,
                  paddingTop: 16,
                  paddingBottom: Platform.OS === "ios" ? 36 : 24,
                }}
              >
                {/* Handle */}
                <View
                  style={{
                    width: 36,
                    height: 3,
                    backgroundColor: C.border,
                    borderRadius: 2,
                    alignSelf: "center",
                    marginBottom: 18,
                  }}
                />

                <Text
                  style={{
                    color: C.textPrimary,
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 2,
                  }}
                >
                  Edit profile
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 20 }}>
                  Update your account details
                </Text>

                <ScrollView
                  style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Name row */}
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <FieldLabel text="First name *" />
                      <FieldInput value={firstname} onChangeText={setFirstname} placeholder="First name" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FieldLabel text="Last name *" />
                      <FieldInput value={lastname} onChangeText={setLastname} placeholder="Last name" />
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={{ marginBottom: 4 }}>
                    <FieldLabel text="Phone" />
                    <FieldInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Phone number"
                      keyboardType="phone-pad"
                    />
                  </View>
                </ScrollView>

                {/* Error */}
                {error ? (
                  <View
                    style={{
                      backgroundColor: C.dangerBg,
                      borderWidth: 0.5,
                      borderColor: C.dangerBorder,
                      borderRadius: 10,
                      padding: 10,
                      marginTop: 14,
                    }}
                  >
                    <Text
                      style={{ color: C.danger, fontSize: 12, textAlign: "center" }}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Buttons */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 14,
                      backgroundColor: C.input,
                      borderWidth: 0.5,
                      borderColor: C.border,
                      alignItems: "center",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: C.textSecondary, fontSize: 14, fontWeight: "500" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleUpdateProfile}
                    disabled={updating}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 14,
                      backgroundColor: themeColor,
                      alignItems: "center",
                      opacity: updating ? 0.7 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {updating ? (
                      <ActivityIndicator color="#0C1208" />
                    ) : (
                      <Text style={{ color: "#0C1208", fontSize: 14, fontWeight: "500" }}>
                        Save changes
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        color: "#5E6A85",
        fontSize: 11,
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 16,
      }}
    >
      {label}
    </Text>
  );
}

function DetailRow({
  label,
  value,
  capitalize,
  last,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: "#1A2030",
      }}
    >
      <Text style={{ color: "#5E6A85", fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: "#D8DCE8",
          fontSize: 13,
          fontWeight: "500",
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: "#7A86A0",
        fontSize: 11,
        fontWeight: "500",
        marginBottom: 5,
      }}
    >
      {text}
    </Text>
  );
}

function FieldInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#3A4460"
      keyboardType={keyboardType}
      style={{
        backgroundColor: "#0E1422",
        borderWidth: 0.5,
        borderColor: "#1E2438",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        color: "#D8DCE8",
        fontSize: 14,
      }}
    />
  );
}