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
  Switch,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useApp } from "../../context/AppContext";
import { updateProfileApi, updatePreferencesApi, uploadAvatarApi } from "../../api/user.api";

const GENDERS = ["male", "female", "other"];

const THEME_COLORS = [
  { name: "Indigo", color: "#5865F2" },
  { name: "Lime", color: "#C2F193" },
  { name: "Blue", color: "#3A76E1" },
  { name: "Purple", color: "#E8D4F5" },
  { name: "Orange", color: "#FED7AA" },
];

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function ProfileScreen() {
  const { user, setUser, logout, themeColor, setThemeColor, isDarkMode, setIsDarkMode, C } = useApp();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstname, setFirstname] = useState(user?.username?.firstname || "");
  const [lastname, setLastname] = useState(user?.username?.lastname || "");
 
  const [phone, setPhone] = useState(user?.phone || "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need permission to access your photos to set an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImg = result.assets[0];
        await handleUploadImage(selectedImg.uri);
      }
    } catch (err) {
      console.error("Image picking error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const handleUploadImage = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("avatar", {
        uri,
        name: filename,
        type,
      } as any);

      const res = await uploadAvatarApi(formData);
      if (res.success) {
        Alert.alert("Success", "Avatar updated successfully!");
        await setUser(res.user);
      } else {
        Alert.alert("Error", "Failed to upload avatar.");
      }
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      Alert.alert("Error", err?.response?.data?.message || "An error occurred while uploading avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

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

  const handleTogglePreference = async (key: "comments" | "assignments" | "mentions" | "reminders", val: boolean) => {
    try {
      const currentPrefs = user?.notificationPreferences || {
        comments: true,
        assignments: true,
        mentions: true,
        reminders: true,
      };
      const newPrefs = { ...currentPrefs, [key]: val };
      const res = await updatePreferencesApi(newPrefs);
      if (res.success) {
        setUser({ ...user, notificationPreferences: res.user.notificationPreferences });
      }
    } catch (err: any) {
      console.error("Failed to update preferences:", err);
      Alert.alert("Error", "Failed to save notification preferences.");
    }
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
          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            activeOpacity={0.7}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: themeColor,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: C.border,
            }}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Text style={{ color: "#0C1208", fontSize: 26, fontWeight: "500" }}>
                {getInitials()}
              </Text>
            )}
          </TouchableOpacity>

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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <View>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>Dark Mode</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Toggle application styling mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: "#DEE2E6", true: themeColor }}
              thumbColor={Platform.OS === "ios" ? undefined : "#fff"}
            />
          </View>

          <View style={{ height: 0.5, backgroundColor: C.border, marginBottom: 12 }} />

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

        {/* ── Section: Notification Preferences ── */}
        <SectionLabel label="Notification Preferences" />
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: C.border,
            padding: 14,
            marginBottom: 8,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>Comments</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Notify when a task has new comments</Text>
            </View>
            <Switch
              value={user?.notificationPreferences?.comments ?? true}
              onValueChange={(val) => handleTogglePreference("comments", val)}
              trackColor={{ false: "#232630", true: themeColor }}
              thumbColor={Platform.OS === "ios" ? undefined : "#fff"}
            />
          </View>

          <View style={{ height: 0.5, backgroundColor: C.border }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>Assignments</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Notify when you are assigned to a task</Text>
            </View>
            <Switch
              value={user?.notificationPreferences?.assignments ?? true}
              onValueChange={(val) => handleTogglePreference("assignments", val)}
              trackColor={{ false: "#232630", true: themeColor }}
              thumbColor={Platform.OS === "ios" ? undefined : "#fff"}
            />
          </View>

          <View style={{ height: 0.5, backgroundColor: C.border }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>Mentions</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Notify when someone mentions you using @</Text>
            </View>
            <Switch
              value={user?.notificationPreferences?.mentions ?? true}
              onValueChange={(val) => handleTogglePreference("mentions", val)}
              trackColor={{ false: "#232630", true: themeColor }}
              thumbColor={Platform.OS === "ios" ? undefined : "#fff"}
            />
          </View>

          <View style={{ height: 0.5, backgroundColor: C.border }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "600" }}>Reminders & Deadlines</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Notify when deadlines are approaching</Text>
            </View>
            <Switch
              value={user?.notificationPreferences?.reminders ?? true}
              onValueChange={(val) => handleTogglePreference("reminders", val)}
              trackColor={{ false: "#232630", true: themeColor }}
              thumbColor={Platform.OS === "ios" ? undefined : "#fff"}
            />
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
  const { C } = useApp();
  return (
    <Text
      style={{
        color: C.textMuted,
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
  const { C } = useApp();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ color: C.textMuted, fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: C.textSecondary,
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
  const { C } = useApp();
  return (
    <Text
      style={{
        color: C.textLabel || C.textMuted,
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
  const { C } = useApp();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      keyboardType={keyboardType}
      style={{
        backgroundColor: C.input,
        borderWidth: 0.5,
        borderColor: C.inputBorder || C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        color: C.textPrimary,
        fontSize: 14,
      }}
    />
  );
}