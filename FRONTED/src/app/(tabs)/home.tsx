import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../context/AppContext";
import { getPinnedItemsApi } from "../../api/user.api";
import {
  addMemberToWorkspace,
  removeMemberFromWorkspace,
  changeMemberRole,
  leaveWorkspace,
  deleteWorkspace,
  updateWorkspace,
} from "../../api/workspace.api";
import { getProjectTasks, createTask, updateTask, deleteTask, Task } from "../../api/task.api";
import { searchUsers, SearchUserResult, globalSearch } from "../../api/search.api";
import { getWorkspaceActivities } from "../../api/activity.api";
import { getWorkspaceAnalytics } from "../../api/project.api";
import { uploadFile } from "../../api/upload.api";
import { ConfirmDialog, ConfirmDialogAction } from "../../components/ConfirmDialog";
import { createUploadFormData } from "../../utils/uploadFormData";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TodoModeHomeView } from "../../Screen/TodoMode";

// ─── Theme constants (all #15171C based) ─────────────────────────────────────
const T = {
  // Backgrounds
  bg: "#0D1117",
  card: "#161B22",
  cardBorder: "#30363D",

  // Inputs
  input: "#161B22",
  inputBorder: "#30363D",

  // Dividers
  divider: "#30363D",

  // Accent
  accent: "#5E6AD2",
  accentPress: "#5260C7",
  onAccent: "#FFFFFF",

  // Typography
  textPrimary: "#F0F6FC",
  textSecondary: "#C9D1D9",
  textMuted: "#8B949E",

  // Tags
  tagBg: "#1A1F28",
  tagText: "#8B949E",

  // Green stats
  greenBg: "rgba(63,185,80,0.10)",
  greenBorder: "rgba(63,185,80,0.22)",
  greenText: "#3FB950",

  // Purple stats
  purpleBg: "rgba(94,106,210,0.10)",
  purpleBorder: "rgba(94,106,210,0.22)",
  purpleText: "#5E6AD2",

  // Red stats
  redBg: "rgba(248,81,73,0.10)",
  redBorder: "rgba(248,81,73,0.22)",
  redText: "#F85149",

  // Amber stats
  amberBg: "rgba(210,153,34,0.10)",
  amberBorder: "rgba(210,153,34,0.22)",
  amberText: "#D29922",

  // Danger
  dangerBg: "rgba(248,81,73,0.10)",
  dangerBorder: "rgba(248,81,73,0.22)",
  danger: "#F85149",
};
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    user,
    setUser,
    token,
    workspaces,
    activeWorkspace,
    selectWorkspace,
    refreshWorkspaces,
    projects,
    themeColor,
    selectProject,
    isDarkMode,
    C,
    todoMode,
    setTodoMode,
  } = useApp();

  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [pinnedProjects, setPinnedProjects] = useState<any[]>([]);
  const [pinnedTasks, setPinnedTasks] = useState<any[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);

  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [workspaceMenuVisible, setWorkspaceMenuVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "members">("stats");

  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<any>(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<any | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message?: string;
    actions: ConfirmDialogAction[];
  } | null>(null);

  // ─── All original helper functions unchanged ────────────────────────────────
  const getInitials = (userObj: any): string => {
    if (!userObj?.username) return "?";
    if (typeof userObj.username === "object" && userObj.username.firstname && userObj.username.lastname) {
      return `${userObj.username.firstname[0]}${userObj.username.lastname[0]}`.toUpperCase();
    }
    return String(userObj.username).slice(0, 2).toUpperCase();
  };

  const getFullName = (userObj: any): string => {
    if (!userObj?.username) return "User";
    if (typeof userObj.username === "object" && userObj.username.firstname && userObj.username.lastname) {
      return `${userObj.username.firstname} ${userObj.username.lastname}`;
    }
    return String(userObj.username);
  };

  const getAvatarColors = (username?: string) => {
    const colors = [
      { bg: "#1E1C3A", text: "#C5C2F5" },
      { bg: "#0D1A2A", text: "#85B7EB" },
      { bg: "rgba(93,202,165,0.12)", text: "#5DCAA5" },
      { bg: "rgba(239,159,39,0.12)", text: "#EF9F27" },
      { bg: "rgba(226,75,74,0.12)", text: "#E24B4A" },
    ];
    if (!username) return colors[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleOpenUserProfile = (userObj: any) => {
    setSelectedUserForProfile(userObj);
    setProfileModalVisible(true);
  };

  const selectedUserProjects = projects.filter((proj) =>
    proj.members.some((m: any) => {
      const mId = typeof m.user === "object" ? m.user._id : m.user;
      return mId === selectedUserForProfile?._id;
    })
  );

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceAnalytics();
    } else {
      setAnalytics(null);
      setStats({ total: 0, completed: 0, inProgress: 0 });
    }
  }, [activeWorkspace, projects]);

  useEffect(() => {
    if (activeWorkspace) loadActivities();
    else setActivities([]);
  }, [activeWorkspace]);

  useEffect(() => {
    if (user) loadPinnedItems();
  }, [activeWorkspace, projects, user]);

  useEffect(() => {
    const d = setTimeout(() => {
      if (globalQuery.trim().length >= 2) performGlobalSearch();
      else setGlobalResults(null);
    }, 400);
    return () => clearTimeout(d);
  }, [globalQuery]);

  const performGlobalSearch = async () => {
    setSearchingGlobal(true);
    try {
      const res = await globalSearch(globalQuery);
      if (res.success) setGlobalResults(res.results);
    } catch (err) {
      console.error("Global search error:", err);
    } finally {
      setSearchingGlobal(false);
    }
  };

  const handleSelectWorkspaceFromSearch = async (ws: any) => {
    setSearchModalVisible(false);
    setGlobalQuery("");
    setGlobalResults(null);
    await selectWorkspace(ws);
  };

  const handleSelectProjectFromSearch = (proj: any) => {
    setSearchModalVisible(false);
    setGlobalQuery("");
    setGlobalResults(null);
    selectProject(proj);
    router.push("/(tabs)/tasks");
  };

  const handleSelectTaskFromSearch = async (task: any) => {
    setSearchModalVisible(false);
    setGlobalQuery("");
    setGlobalResults(null);
    const proj = projects.find(
      (p) => p._id === (typeof task.project === "object" ? task.project._id : task.project)
    );
    if (proj) {
      selectProject(proj);
      router.push("/(tabs)/tasks");
    }
  };

  const loadActivities = async () => {
    if (!activeWorkspace) return;
    setLoadingActivities(true);
    try {
      const res = await getWorkspaceActivities(activeWorkspace._id);
      if (res.success) setActivities(res.activities);
    } catch (err) {
      console.error("Error loading activities:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const getActivityIcon = (action: string): any => {
    switch (action) {
      case "task_created":        return "add-circle-outline";
      case "task_updated":        return "create-outline";
      case "task_status_changed": return "swap-horizontal-outline";
      case "task_deleted":        return "trash-outline";
      case "comment_added":       return "chatbubble-ellipses-outline";
      default:                    return "git-commit-outline";
    }
  };

  const loadWorkspaceAnalytics = async () => {
    if (!activeWorkspace) return;
    setLoadingStats(true);
    try {
      const res = await getWorkspaceAnalytics(activeWorkspace._id);
      if (res.success) {
        setAnalytics(res.analytics);
        setStats({
          total:      res.analytics.summary.total,
          completed:  res.analytics.summary.completed,
          inProgress: res.analytics.summary.inProgress,
        });
      }
    } catch (err) {
      console.error("Error loading workspace analytics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadPinnedItems = async () => {
    setLoadingPinned(true);
    try {
      const res = await getPinnedItemsApi();
      if (res.success) {
        setPinnedProjects(res.pinnedProjects || []);
        setPinnedTasks(res.pinnedTasks || []);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        console.warn("Session expired loading pinned items (401)");
      } else {
        console.error("Error loading pinned items:", err);
      }
    } finally {
      setLoadingPinned(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!activeWorkspace) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission denied", "Media library access is required.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setUploadingLogo(true);
        const asset = result.assets[0];
        const formData = await createUploadFormData({
          uri: asset.uri,
          name: asset.fileName || `logo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          file: asset.file,
        });
        const uploadRes = await uploadFile(formData);
        if (uploadRes.success) {
          const updateRes = await updateWorkspace(activeWorkspace._id, { logoUrl: uploadRes.url });
          if (updateRes.success) {
            Alert.alert("Success", "Logo updated successfully!");
            await refreshWorkspaces();
          } else {
            Alert.alert("Error", "Failed to save logo to workspace.");
          }
        } else {
          Alert.alert("Error", "Logo upload failed.");
        }
      }
    } catch (err: any) {
      console.error("Logo upload error:", err);
      Alert.alert("Error", err?.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    const d = setTimeout(() => {
      if (searchQuery.trim().length >= 2) performUserSearch();
      else setSearchResults([]);
    }, 400);
    return () => clearTimeout(d);
  }, [searchQuery]);

  const performUserSearch = async () => {
    setSearchingUsers(true);
    try {
      const res = await searchUsers(searchQuery);
      if (res.success) {
        const currentMemberIds = activeWorkspace?.members.map((m: any) =>
          typeof m.user === "object" ? m.user._id : m.user
        ) || [];
        setSearchResults(
          res.users.filter((u) => u._id !== user?._id && !currentMemberIds.includes(u._id))
        );
      }
    } catch (err) {
      console.error("User search error:", err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleInviteUser = async (targetUserId: string) => {
    if (!activeWorkspace) return;
    const workspaceId = activeWorkspace._id;
    setConfirmDialog({
      title: "Add Workspace Member",
      message: "Are you sure you want to add this user to the workspace?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Member",
          onPress: async () => {
            setInvitingUserId(targetUserId);
            try {
              const res = await addMemberToWorkspace(workspaceId, targetUserId);
              if (res.success) {
                Alert.alert("Success", "Workspace invitation sent successfully!");
                setSearchQuery("");
                setSearchResults([]);
                await refreshWorkspaces();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to add member.");
            } finally {
              setInvitingUserId(null);
            }
          },
        },
      ],
    });
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeWorkspace) return;
    const workspaceId = activeWorkspace._id;
    setConfirmDialog({
      title: "Remove Member",
      message: "Are you sure you want to remove this user?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await removeMemberFromWorkspace(workspaceId, targetUserId);
              if (res.success) {
                Alert.alert("Success", "Member removed successfully.");
                await refreshWorkspaces();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to remove member.");
            }
          },
        },
      ],
    });
  };

  const handleChangeRole = async (targetUserId: string, currentRole: string) => {
    if (!activeWorkspace) return;
    setConfirmDialog({
      title: "Change Member Role",
      message: "Select the new workspace role for this member.",
      actions: [
        { text: "Admin", onPress: async () => await updateWorkspaceMemberRole(targetUserId, "admin") },
        { text: "Member", onPress: async () => await updateWorkspaceMemberRole(targetUserId, "member") },
        { text: "Cancel", style: "cancel" },
      ],
    });
  };

  const updateWorkspaceMemberRole = async (targetUserId: string, role: "admin" | "member") => {
    if (!activeWorkspace) return;
    try {
      const res = await changeMemberRole(activeWorkspace._id, targetUserId, role);
      if (res.success) {
        Alert.alert("Success", `Role updated to ${role}.`);
        await refreshWorkspaces();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update role.");
    }
  };

  const handleLeaveWorkspace = () => {
    if (!activeWorkspace) return;
    const workspaceId = activeWorkspace._id;
    setConfirmDialog({
      title: "Leave Workspace",
      message: "Are you sure you want to leave this workspace?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await leaveWorkspace(workspaceId);
              if (res.success) {
                Alert.alert("Success", "You have left the workspace.");
                await refreshWorkspaces();
                setManageModalVisible(false);
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to leave workspace.");
            }
          },
        },
      ],
    });
  };

  const handleDeleteWorkspace = () => {
    if (!activeWorkspace) return;
    const workspaceId = activeWorkspace._id;
    setConfirmDialog({
      title: "Delete Workspace",
      message: "CRITICAL: This will delete the workspace, all its projects, and tasks permanently. Proceed?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteWorkspace(workspaceId);
              if (res.success) {
                Alert.alert("Deleted", "Workspace deleted successfully.");
                await refreshWorkspaces();
                setManageModalVisible(false);
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete workspace.");
            }
          },
        },
      ],
    });
  };

  const getWorkspaceOwnerId = (ws: any) => {
    if (!ws) return null;
    const owner = ws.owner;
    return typeof owner === "object" && owner !== null ? owner._id : owner;
  };

  const isOwner  = getWorkspaceOwnerId(activeWorkspace) === user?._id;
  const isAdmin  = activeWorkspace?.members.some(
    (m: any) => (typeof m.user === "object" ? m.user._id : m.user) === user?._id && m.role === "admin"
  );
  const canManage = isOwner || isAdmin;

  if (todoMode) {
    return <TodoModeHomeView />;
  }

  // ─── Empty workspace state ──────────────────────────────────────────────────
  if (workspaces.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, backgroundColor: T.bg }}>
        <View style={{ position: "absolute", top: 90, left: 28, width: 46, height: 46, borderRadius: 13, backgroundColor: T.card, transform: [{ rotate: "-12deg" }], alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="checkmark-done-outline" size={20} color={T.accent} />
        </View>
        <View style={{ position: "absolute", top: 150, right: 24, width: 42, height: 42, borderRadius: 12, backgroundColor: T.card, transform: [{ rotate: "10deg" }], alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubble-outline" size={18} color={T.textSecondary} />
        </View>
        <View style={{ position: "absolute", bottom: 200, left: 22, width: 38, height: 38, borderRadius: 11, backgroundColor: T.card, transform: [{ rotate: "8deg" }], alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="flag-outline" size={17} color={T.amberText} />
        </View>
        <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: T.card, alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <Ionicons name="rocket-outline" size={40} color={T.accent} />
        </View>
        <Text style={{ color: T.textPrimary, fontSize: 22, fontWeight: "600", textAlign: "center" }}>Let's build your space</Text>
        <Text style={{ color: T.textSecondary, fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 22, maxWidth: 260 }}>
          Spin up a workspace and bring your whole team along for the ride.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/createWorkspace")}
          activeOpacity={0.85}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 28, backgroundColor: T.accent }}
        >
          <Ionicons name="sparkles" size={16} color={T.onAccent} style={{ marginRight: 8 }} />
          <Text style={{ color: T.onAccent, fontWeight: "600", fontSize: 15 }}>Create Workspace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTodoMode(true)}
          activeOpacity={0.85}
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 12, backgroundColor: "transparent", borderWidth: 1, borderColor: T.divider }}
        >
          <Text style={{ color: T.textPrimary, fontWeight: "600", fontSize: 15 }}>Or use Simple To-Do Mode</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: T.divider }}>
        <TouchableOpacity
          onPress={() => setWorkspaceMenuVisible(true)}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}
        >
          {activeWorkspace?.logoUrl ? (
            <Image source={{ uri: activeWorkspace.logoUrl }} style={{ width: 18, height: 18, borderRadius: 4, marginRight: 8 }} />
          ) : (
            <Ionicons name="briefcase-outline" size={15} color={T.accent} style={{ marginRight: 8 }} />
          )}
          <Text style={{ color: T.textPrimary, fontWeight: "500", fontSize: 14, marginRight: 6 }} numberOfLines={1}>
            {activeWorkspace?.name || "Select Workspace"}
          </Text>
          <Ionicons name="chevron-down" size={13} color={T.accent} />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSearchModalVisible(true)}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="search-outline" size={17} color={T.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setManageModalVisible(true)}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="settings-outline" size={17} color={T.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}>

        {/* ── Tab Toggle: Overview / Members ── */}
        <View style={{ flexDirection: "row", backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(["stats", "members"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9, backgroundColor: isActive ? T.accent : "transparent", gap: 6 }}
              >
                <Ionicons
                  name={tab === "stats" ? "stats-chart-outline" : "people-outline"}
                  size={13}
                  color={isActive ? T.onAccent : T.textSecondary}
                />
                <Text style={{ fontSize: 12, fontWeight: "500", color: isActive ? T.onAccent : T.textSecondary }}>
                  {tab === "stats" ? "Overview" : "Members"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "stats" ? (
          <>
            {/* Simple To-Do Mode card */}
            <TouchableOpacity
              onPress={() => setTodoMode(true)}
              activeOpacity={0.8}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 16, padding: 16, marginBottom: 20 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${T.accent}15`, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                <Ionicons name="checkbox-outline" size={22} color={T.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "500", color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Personal checklist</Text>
                <Text style={{ fontSize: 18, fontWeight: "600", color: T.textPrimary }}>To-Do Mode</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textSecondary} style={{ opacity: 0.7 }} />
            </TouchableOpacity>

            {/* ── Pinned Items ──
            {(pinnedProjects.length > 0 || pinnedTasks.length > 0) && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: T.textPrimary, marginBottom: 14 }}>Pinned items</Text>

                {pinnedProjects.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: "500", color: T.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Projects</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {pinnedProjects.map((proj: any) => (
                        <TouchableOpacity
                          key={proj._id}
                          onPress={() => handleSelectProjectFromSearch(proj)}
                          style={{ marginRight: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderLeftWidth: 3, borderLeftColor: proj.color || T.accent, minWidth: 140 }}
                        >
                          <Text style={{ fontWeight: "500", fontSize: 12, color: T.textPrimary }} numberOfLines={1}>{proj.name}</Text>
                          <Text style={{ fontSize: 10, color: T.textSecondary, marginTop: 3 }}>Active workspace</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {pinnedTasks.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "500", color: T.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Tasks</Text>
                    {pinnedTasks.map((task: any) => (
                      <TouchableOpacity
                        key={task._id}
                        onPress={() => handleSelectTaskFromSearch(task)}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 12, padding: 12, marginBottom: 6 }}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                            <View style={{ width: 7, height: 7, borderRadius: 4, marginRight: 8, backgroundColor: task.priority === "high" ? T.redText : task.priority === "medium" ? T.amberText : T.greenText }} />
                            <Text style={{ fontWeight: "500", fontSize: 12, color: T.textPrimary }} numberOfLines={1}>{task.title}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: T.textSecondary }}>
                            {task.status.toUpperCase()} · {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                          </Text>
                        </View>
                        <Ionicons name="pin" size={15} color={T.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )} */}

            {/* ── Dashboard title ── */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: T.textPrimary }}>
                Workspace stats
              </Text>
            </View>

            {/* ── Stats cards ── */}
            {loadingStats ? (
              <ActivityIndicator size="large" color={T.accent} style={{ marginVertical: 32 }} />
            ) : (
              /* ── Workspace stats ── */
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                  {/* Total */}
                  <View style={{ flex: 1, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 16, padding: 14, minHeight: 112 }}>
                    <Ionicons name="clipboard-outline" size={22} color={T.accent} />
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 9, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, color: T.textSecondary }}>Total tasks</Text>
                      <Text style={{ fontSize: 26, fontWeight: "600", color: T.textPrimary, marginTop: 3 }}>{analytics?.summary?.total ?? stats.total}</Text>
                    </View>
                  </View>
                  {/* Completed */}
                  <View style={{ flex: 1, backgroundColor: T.greenBg, borderWidth: 0.5, borderColor: T.greenBorder, borderRadius: 16, padding: 14, minHeight: 112 }}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={T.greenText} />
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 9, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, color: T.greenText }}>Completed</Text>
                      <Text style={{ fontSize: 26, fontWeight: "600", color: T.textPrimary, marginTop: 3 }}>{analytics?.summary?.completed ?? stats.completed}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {/* In progress */}
                  <View style={{ flex: 1, backgroundColor: T.purpleBg, borderWidth: 0.5, borderColor: T.purpleBorder, borderRadius: 16, padding: 14, minHeight: 112 }}>
                    <Ionicons name="flash-outline" size={22} color={T.purpleText} />
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 9, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, color: T.purpleText }}>In progress</Text>
                      <Text style={{ fontSize: 26, fontWeight: "600", color: T.textPrimary, marginTop: 3 }}>{analytics?.summary?.inProgress ?? stats.inProgress}</Text>
                    </View>
                  </View>
                  {/* Overdue */}
                  {(() => {
                    const overdue = analytics?.summary?.overdue ?? 0;
                    return (
                      <View style={{ flex: 1, backgroundColor: overdue > 0 ? T.redBg : "rgba(250,166,26,0.08)", borderWidth: 0.5, borderColor: overdue > 0 ? T.redBorder : "rgba(250,166,26,0.16)", borderRadius: 16, padding: 14, minHeight: 112 }}>
                        <Ionicons name="alert-circle-outline" size={22} color={overdue > 0 ? T.redText : T.amberText} />
                        <View style={{ marginTop: 10 }}>
                          <Text style={{ fontSize: 9, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, color: overdue > 0 ? T.redText : T.amberText }}>Overdue</Text>
                          <Text style={{ fontSize: 26, fontWeight: "600", color: overdue > 0 ? T.redText : T.textPrimary, marginTop: 3 }}>{overdue}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              </View>
            )}

            {/* ── Project progress breakdown ── */}
            {analytics?.projects && analytics.projects.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: T.textPrimary, marginBottom: 14 }}>Project progress</Text>
                {analytics.projects.map((proj: any) => {
                  const progress = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
                  return (
                    <View key={proj.projectId} style={{ marginBottom: 8, padding: 14, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 14 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ width: 9, height: 9, borderRadius: 5, marginRight: 8, backgroundColor: proj.color || T.accent }} />
                          <Text style={{ fontWeight: "500", fontSize: 12, color: T.textPrimary }}>{proj.title}</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent }}>{progress}%</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: T.input, borderRadius: 2, overflow: "hidden" }}>
                        <View style={{ height: "100%", borderRadius: 2, backgroundColor: proj.color || T.accent, width: `${progress}%` as any }} />
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: T.textSecondary }}>{proj.completed} of {proj.total} tasks</Text>
                        {proj.overdue > 0 && <Text style={{ fontSize: 10, fontWeight: "500", color: T.redText }}>{proj.overdue} overdue</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Team productivity leaderboard ── */}
            {analytics?.productivity && analytics.productivity.length > 0 && (
              <View style={{ backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 16, padding: 16, marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Team productivity</Text>
                {analytics.productivity.slice(0, 5).map((member: any, idx: number) => {
                  const pct = member.totalCount > 0 ? Math.round((member.completedCount / member.totalCount) * 100) : 0;
                  return (
                    <View key={member.userId} style={{ marginBottom: idx < 4 ? 14 : 0 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: T.input, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                            <Text style={{ fontWeight: "500", fontSize: 9, color: T.accent }}>{member.name.substring(0, 2).toUpperCase()}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: "500", color: T.textPrimary }} numberOfLines={1}>{member.name}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: T.textSecondary }}>{member.completedCount}/{member.totalCount} ({pct}%)</Text>
                      </View>
                      <View style={{ height: 3, backgroundColor: T.input, borderRadius: 2, overflow: "hidden" }}>
                        <View style={{ height: "100%", borderRadius: 2, backgroundColor: T.accent, width: `${pct}%` as any }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Quick actions ── */}
            <Text style={{ fontSize: 15, fontWeight: "600", color: T.textPrimary, marginBottom: 12 }}>Quick actions</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/projects")}
                style={{ flex: 1, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 14, padding: 14, alignItems: "center" }}
              >
                <Ionicons name="folder-outline" size={22} color={T.accent} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: T.textPrimary }}>View projects</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/tasks")}
                style={{ flex: 1, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 14, padding: 14, alignItems: "center" }}
              >
                <Ionicons name="grid-outline" size={22} color={T.accent} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: T.textPrimary }}>Kanban board</Text>
              </TouchableOpacity>
            </View>

            {/* ── Recent activity ── */}
            <Text style={{ fontSize: 15, fontWeight: "600", color: T.textPrimary, marginBottom: 12 }}>Recent activity</Text>
            {loadingActivities ? (
              <ActivityIndicator size="small" color={T.accent} style={{ marginVertical: 24 }} />
            ) : activities.length === 0 ? (
              <View style={{ backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 14, padding: 24, marginBottom: 32, alignItems: "center" }}>
                <Ionicons name="time-outline" size={22} color={T.textMuted} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 12, color: T.textSecondary }}>No activity recorded yet</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 14, padding: 16, marginBottom: 32 }}>
                {activities.slice(0, 5).map((act, idx) => {
                  const isLast = idx === Math.min(activities.length, 5) - 1;
                  return (
                    <View key={act._id} style={{ flexDirection: "row", marginBottom: isLast ? 0 : 14 }}>
                      <View style={{ alignItems: "center", marginRight: 12 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: T.input, alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name={getActivityIcon(act.action)} size={13} color={T.accent} />
                        </View>
                        {!isLast && <View style={{ width: 1, flex: 1, marginVertical: 3, backgroundColor: T.divider }} />}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: "500", color: T.textPrimary }}>
                          {getFullName(act.user)}{" "}
                          <Text style={{ fontWeight: "400", color: T.textSecondary }}>{act.details}</Text>
                        </Text>
                        <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{new Date(act.createdAt).toLocaleString()}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>

        ) : (
        /* ════════════════════════════════════════════════════════════════════
            MEMBERS TAB
        ════════════════════════════════════════════════════════════════════ */
          <>
            {/* ── Invite members ── */}
            {canManage && (
              <View style={{ backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: T.textPrimary, marginBottom: 12 }}>Invite team members</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: T.input, borderWidth: 0.5, borderColor: T.inputBorder, borderRadius: 10, paddingHorizontal: 12 }}>
                  <Ionicons name="search-outline" size={15} color={T.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 11, fontSize: 13, color: T.textPrimary }}
                    placeholder="Search by email or username..."
                    placeholderTextColor={T.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchingUsers && <ActivityIndicator size="small" color={T.accent} />}
                </View>

                {searchResults.length > 0 && (
                  <View style={{ marginTop: 10, backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 10, overflow: "hidden" }}>
                    {searchResults.map((item, idx) => (
                      <View
                        key={item._id}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: idx < searchResults.length - 1 ? 0.5 : 0, borderBottomColor: T.cardBorder }}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={{ fontWeight: "500", fontSize: 13, color: T.textPrimary }}>{item.username.firstname} {item.username.lastname}</Text>
                          <Text style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{item.email}</Text>
                        </View>
                        <TouchableOpacity
                          disabled={invitingUserId === item._id}
                          onPress={() => handleInviteUser(item._id)}
                          style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: T.accent }}
                        >
                          {invitingUserId === item._id ? (
                            <ActivityIndicator size="small" color={T.onAccent} />
                          ) : (
                            <Text style={{ fontSize: 12, fontWeight: "500", color: T.onAccent }}>Add</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {searchQuery.trim().length >= 2 && !searchingUsers && searchResults.length === 0 && (
                  <Text style={{ fontSize: 12, color: T.textMuted, textAlign: "center", marginTop: 10 }}>No users found</Text>
                )}
              </View>
            )}

            {/* ── Members list ── */}
            <Text style={{ fontSize: 15, fontWeight: "600", color: T.textPrimary, marginBottom: 12 }}>
              Workspace members
            </Text>

            {/* member count pill */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: T.input, borderWidth: 0.5, borderColor: T.cardBorder }}>
                <Text style={{ fontSize: 11, color: T.textSecondary }}>{activeWorkspace?.members?.length ?? 0} members</Text>
              </View>
            </View>

            <View style={{ backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
              {activeWorkspace?.members.map((member: any, index: number) => {
                const isMemberObject = typeof member.user === "object";
                const memberId  = isMemberObject ? member.user._id : member.user;
                const firstname = isMemberObject ? member.user.username.firstname : "User";
                const lastname  = isMemberObject ? member.user.username.lastname  : "";
                const email     = isMemberObject ? member.user.email : "";
                const role      = member.role;
                const isMe      = memberId === user?._id;
                const avatarColors = getAvatarColors(firstname);
                const isLast    = index === activeWorkspace.members.length - 1;

                // role badge color
                const roleBg   = role === "admin" ? "rgba(88,101,242,0.12)" : T.input;
                const roleText = role === "admin" ? T.accent : T.textSecondary;

                return (
                  <View
                    key={memberId || index}
                    style={{ borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: T.divider }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", padding: 14 }}>
                      {/* Avatar */}
                      <TouchableOpacity onPress={() => isMemberObject && handleOpenUserProfile(member.user)} style={{ marginRight: 12 }}>
                        {isMemberObject && member.user.avatarUrl ? (
                          <Image source={{ uri: member.user.avatarUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                        ) : (
                          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: avatarColors.bg, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: T.cardBorder }}>
                            <Text style={{ fontWeight: "500", fontSize: 13, color: avatarColors.text }}>
                              {(firstname?.[0] || "").toUpperCase()}{(lastname?.[0] || "").toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {/* Online dot — decorative */}
                        <View style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: T.greenText, borderWidth: 1.5, borderColor: T.card }} />
                      </TouchableOpacity>

                      {/* Info */}
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => isMemberObject && handleOpenUserProfile(member.user)}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <Text style={{ fontWeight: "500", fontSize: 14, color: T.textPrimary }}>{firstname} {lastname}</Text>
                          {isMe && (
                            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: `${T.accent}22` }}>
                              <Text style={{ fontSize: 10, color: T.accent, fontWeight: "500" }}>You</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: T.textSecondary }}>{email}</Text>
                        {/* Role badge */}
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: roleBg, alignSelf: "flex-start", marginTop: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, color: roleText }}>{role}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Actions */}
                      {canManage && !isMe && getWorkspaceOwnerId(activeWorkspace) !== memberId && (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleChangeRole(memberId, role)}
                            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: T.input, borderWidth: 0.5, borderColor: T.inputBorder }}
                          >
                            <Text style={{ fontSize: 11, color: T.textPrimary }}>{role === "admin" ? "Demote" : "Promote"}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRemoveMember(memberId)}
                            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: T.dangerBg, borderWidth: 0.5, borderColor: T.dangerBorder }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "500", color: T.danger }}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>


      {/* ════════════════════════════════════════════════════════════════════
          MODAL — Global Search
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={searchModalVisible} transparent animationType="slide" onRequestClose={() => setSearchModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={["bottom", "left", "right"]}>
          <View style={{ 
            flexDirection: "row", 
            alignItems: "center", 
            paddingHorizontal: 14, 
            paddingTop: Math.max(insets.top, 12), 
            paddingBottom: 12, 
            borderBottomWidth: 0.5, 
            borderBottomColor: T.divider 
          }}>
            <TouchableOpacity onPress={() => { setSearchModalVisible(false); setGlobalQuery(""); setGlobalResults(null); }} style={{ marginRight: 10, padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color={T.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: T.input, borderWidth: 0.5, borderColor: T.inputBorder, borderRadius: 10, paddingHorizontal: 12 }}>
              <Ionicons name="search-outline" size={15} color={T.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: T.textPrimary }}
                placeholder="Search workspaces, projects, tasks..."
                placeholderTextColor={T.textMuted}
                autoFocus
                value={globalQuery}
                onChangeText={setGlobalQuery}
              />
              {searchingGlobal && <ActivityIndicator size="small" color={T.accent} />}
            </View>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            {globalResults ? (
              <View style={{ paddingBottom: 40 }}>
                {globalResults.tasks?.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Tasks</Text>
                    {globalResults.tasks.map((task: any) => (
                      <TouchableOpacity key={task._id} onPress={() => handleSelectTaskFromSearch(task)}
                        style={{ padding: 12, marginBottom: 6, borderRadius: 12, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontWeight: "500", fontSize: 13, color: T.textPrimary }}>{task.title}</Text>
                          <Text style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>Project: {task.project?.name || "Unknown"}</Text>
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: T.tagBg }}>
                          <Text style={{ fontSize: 10, fontWeight: "500", textTransform: "uppercase", color: T.tagText }}>{task.status}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {globalResults.projects?.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Projects</Text>
                    {globalResults.projects.map((proj: any) => (
                      <TouchableOpacity key={proj._id} onPress={() => handleSelectProjectFromSearch(proj)}
                        style={{ padding: 12, marginBottom: 6, borderRadius: 12, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "500", fontSize: 13, color: T.textPrimary }}>{proj.name}</Text>
                          <Text style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>Workspace: {proj.workspace?.name || "Unknown"}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={15} color={T.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {globalResults.workspaces?.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Workspaces</Text>
                    {globalResults.workspaces.map((ws: any) => (
                      <TouchableOpacity key={ws._id} onPress={() => handleSelectWorkspaceFromSearch(ws)}
                        style={{ padding: 12, marginBottom: 6, borderRadius: 12, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontWeight: "500", fontSize: 13, color: T.textPrimary }}>{ws.name}</Text>
                          {ws.description ? <Text style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }} numberOfLines={1}>{ws.description}</Text> : null}
                        </View>
                        <Ionicons name="briefcase-outline" size={15} color={T.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {globalResults.users?.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Members</Text>
                    {globalResults.users.map((item: any) => (
                      <TouchableOpacity key={item._id} onPress={() => handleOpenUserProfile(item)}
                        style={{ padding: 12, marginBottom: 6, borderRadius: 12, backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, flexDirection: "row", alignItems: "center" }}>
                        {item.avatarUrl ? (
                          <Image source={{ uri: item.avatarUrl }} style={{ width: 34, height: 34, borderRadius: 17, marginRight: 12 }} />
                        ) : (
                          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: T.input, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                            <Text style={{ fontWeight: "500", fontSize: 11, color: T.accent }}>{getInitials(item)}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "500", fontSize: 13, color: T.textPrimary }}>{getFullName(item)}</Text>
                          <Text style={{ fontSize: 11, color: T.textSecondary }}>{item.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {(!globalResults.tasks?.length && !globalResults.projects?.length && !globalResults.workspaces?.length && !globalResults.users?.length) && (
                  <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
                    <Ionicons name="search-outline" size={30} color={T.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 13, color: T.textSecondary }}>No results found for "{globalQuery}"</Text>
                  </View>
                )}
              </View>
            ) : globalQuery.trim().length === 0 ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
                <Ionicons name="search-outline" size={44} color={T.textMuted} style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 13, color: T.textSecondary, textAlign: "center", paddingHorizontal: 32 }}>
                  Search workspaces, projects, tasks, or team members across all your spaces.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* ════════════════════════════════════════════════════════════════════
          MODAL — Workspace Selector
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={workspaceMenuVisible} transparent animationType="fade" onRequestClose={() => setWorkspaceMenuVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Pressable onPress={() => setWorkspaceMenuVisible(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.7)" }} />
          <View style={{ width: "100%", maxHeight: "80%", backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 24, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: T.textPrimary, marginBottom: 16 }}>Switch workspace</Text>
            <ScrollView style={{ marginBottom: 14 }}>
              {workspaces.map((w) => {
                const isActive = w._id === activeWorkspace?._id;
                return (
                  <TouchableOpacity key={w._id}
                    onPress={async () => { await selectWorkspace(w); setWorkspaceMenuVisible(false); }}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 6, borderWidth: 0.5, backgroundColor: isActive ? `${T.accent}15` : T.input, borderColor: isActive ? T.accent : T.cardBorder }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                      {w.logoUrl ? (
                        <Image source={{ uri: w.logoUrl }} style={{ width: 22, height: 22, borderRadius: 5, marginRight: 10 }} />
                      ) : (
                        <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: T.cardBorder, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Ionicons name="briefcase-outline" size={11} color={T.accent} />
                        </View>
                      )}
                      <Text style={{ fontWeight: "500", fontSize: 14, color: T.textPrimary, flex: 1 }} numberOfLines={1}>{w.name}</Text>
                    </View>
                    {isActive && <Ionicons name="checkmark" size={16} color={T.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => { setWorkspaceMenuVisible(false); router.push("/(tabs)/createWorkspace"); }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: T.accent }}>
              <Ionicons name="add" size={17} color={T.onAccent} style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: "600", fontSize: 14, color: T.onAccent }}>Create workspace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* ════════════════════════════════════════════════════════════════════
          MODAL — Workspace Settings
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={manageModalVisible} transparent animationType="slide" onRequestClose={() => setManageModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable onPress={() => setManageModalVisible(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.7)" }} />
          <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 0.5, borderTopColor: T.cardBorder }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: T.input, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: T.textPrimary, marginBottom: 6 }}>Workspace settings</Text>
            <Text style={{ fontSize: 13, color: T.textSecondary, marginBottom: 20 }}>Actions for "{activeWorkspace?.name}"</Text>

            {canManage && (
              <TouchableOpacity onPress={handleUploadLogo}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginBottom: 10, backgroundColor: T.input, borderWidth: 0.5, borderColor: T.inputBorder }}>
                {uploadingLogo ? <ActivityIndicator size="small" color={T.accent} /> : (
                  <>
                    <Ionicons name="image-outline" size={16} color={T.accent} style={{ marginRight: 8 }} />
                    <Text style={{ fontWeight: "500", fontSize: 14, color: T.textPrimary }}>Upload workspace logo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isOwner ? (
              <TouchableOpacity onPress={handleDeleteWorkspace}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginBottom: 10, backgroundColor: T.dangerBg, borderWidth: 0.5, borderColor: T.dangerBorder }}>
                <Ionicons name="trash-outline" size={16} color={T.danger} style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: "500", fontSize: 14, color: T.danger }}>Delete workspace</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLeaveWorkspace}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginBottom: 10, backgroundColor: T.dangerBg, borderWidth: 0.5, borderColor: T.dangerBorder }}>
                <Ionicons name="log-out-outline" size={16} color={T.danger} style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: "500", fontSize: 14, color: T.danger }}>Leave workspace</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setManageModalVisible(false)}
              style={{ paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: T.input, borderWidth: 0.5, borderColor: T.inputBorder }}>
              <Text style={{ fontWeight: "500", fontSize: 14, color: T.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* ════════════════════════════════════════════════════════════════════
          MODAL — User Profile Card
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={profileModalVisible} transparent animationType="fade" onRequestClose={() => setProfileModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Pressable onPress={() => setProfileModalVisible(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.7)" }} />
          <View style={{ width: "100%", backgroundColor: T.card, borderWidth: 0.5, borderColor: T.cardBorder, borderRadius: 24, padding: 20 }}>
            {/* Avatar */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              {selectedUserForProfile?.avatarUrl ? (
                <Image source={{ uri: selectedUserForProfile.avatarUrl }}
                  style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 0.5, borderColor: T.cardBorder, marginBottom: 12 }} />
              ) : (
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: getAvatarColors(selectedUserForProfile?.username?.firstname || "").bg, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: T.cardBorder, marginBottom: 12 }}>
                  <Text style={{ fontSize: 22, fontWeight: "500", color: getAvatarColors(selectedUserForProfile?.username?.firstname || "").text }}>
                    {selectedUserForProfile ? getInitials(selectedUserForProfile) : "?"}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 18, fontWeight: "600", color: T.textPrimary }}>{selectedUserForProfile ? getFullName(selectedUserForProfile) : "User Profile"}</Text>
              <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 3 }}>{selectedUserForProfile?.email || ""}</Text>
              {selectedUserForProfile && (
                <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10, backgroundColor: `${T.accent}18` }}>
                  <Text style={{ fontSize: 11, fontWeight: "500", color: T.accent, textTransform: "capitalize" }}>
                    {activeWorkspace?.members.find((m: any) => {
                      const mId = typeof m.user === "object" ? m.user._id : m.user;
                      return mId === selectedUserForProfile._id;
                    })?.role || "Member"}
                  </Text>
                </View>
              )}
            </View>

            {/* Projects list */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "500", color: T.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                Projects in workspace ({selectedUserProjects.length})
              </Text>
              <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                {selectedUserProjects.length === 0 ? (
                  <Text style={{ fontSize: 12, color: T.textMuted }}>Not assigned to any projects yet</Text>
                ) : (
                  selectedUserProjects.map((proj: any) => {
                    const userProjRole = proj.members.find((m: any) => {
                      const mId = typeof m.user === "object" ? m.user._id : m.user;
                      return mId === selectedUserForProfile?._id;
                    })?.role || "member";
                    return (
                      <View key={proj._id}
                        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderRadius: 10, marginBottom: 6, backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.cardBorder }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 8, backgroundColor: proj.color || T.accent }} />
                          <Text style={{ fontSize: 12, fontWeight: "500", color: T.textPrimary }}>{proj.name}</Text>
                        </View>
                        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: T.tagBg }}>
                          <Text style={{ fontSize: 10, fontWeight: "500", textTransform: "uppercase", color: T.tagText }}>{userProjRole}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            <TouchableOpacity onPress={() => setProfileModalVisible(false)}
              style={{ width: "100%", paddingVertical: 13, borderRadius: 12, alignItems: "center", backgroundColor: T.input, borderWidth: 0.5, borderColor: T.inputBorder }}>
              <Text style={{ fontWeight: "500", fontSize: 14, color: T.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message}
        actions={confirmDialog?.actions || []}
        onClose={() => setConfirmDialog(null)}
        colors={{
          surface: T.card,
          border: T.cardBorder,
          textPrimary: T.textPrimary,
          textSecondary: T.textSecondary,
          muted: T.textMuted,
          accent: T.accent,
          onAccent: T.onAccent,
          danger: T.danger,
          dangerBg: T.dangerBg,
          dangerBorder: T.dangerBorder,
          input: T.input,
        }}
      />

    </SafeAreaView>
  );
}
