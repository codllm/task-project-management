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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { getProjectTasks, Task } from "../../api/task.api";
import { searchUsers, SearchUserResult, globalSearch } from "../../api/search.api";
import { getWorkspaceActivities } from "../../api/activity.api";
import { getWorkspaceAnalytics } from "../../api/project.api";
import { uploadFile } from "../../api/upload.api";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();
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
  } = useApp();

  const [dashboardMode, setDashboardMode] = useState<"workspace" | "personal">("workspace");
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Pinned items states
  const [pinnedProjects, setPinnedProjects] = useState<any[]>([]);
  const [pinnedTasks, setPinnedTasks] = useState<any[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);

  // Activity Log states
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Modal / Dropdown states
  const [workspaceMenuVisible, setWorkspaceMenuVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "members">("stats");

  // Global Search states
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<any>(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  // Invite states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  // Profile Modal states
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<any | null>(null);

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
      { bg: "#1E1C3A", text: "#C5C2F5" }, // Purple
      { bg: "#0D1A2A", text: "#85B7EB" }, // Blue
      { bg: "rgba(93,202,165,0.12)", text: "#5DCAA5" }, // Green
      { bg: "rgba(239,159,39,0.12)", text: "#EF9F27" }, // Amber
      { bg: "rgba(226,75,74,0.12)", text: "#E24B4A" }, // Red
    ];
    if (!username) return colors[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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

  // Fetch and aggregate stats
  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceAnalytics();
    } else {
      setAnalytics(null);
      setStats({ total: 0, completed: 0, inProgress: 0 });
    }
  }, [activeWorkspace, projects]);

  useEffect(() => {
    if (activeWorkspace) {
      loadActivities();
    } else {
      setActivities([]);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (user) {
      loadPinnedItems();
    }
  }, [activeWorkspace, projects, user]);

  // Global search hooks
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (globalQuery.trim().length >= 2) {
        performGlobalSearch();
      } else {
        setGlobalResults(null);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [globalQuery]);

  const performGlobalSearch = async () => {
    setSearchingGlobal(true);
    try {
      const res = await globalSearch(globalQuery);
      if (res.success) {
        setGlobalResults(res.results);
      }
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
    const proj = projects.find(p => p._id === (typeof task.project === "object" ? task.project._id : task.project));
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
      if (res.success) {
        setActivities(res.activities);
      }
    } catch (err) {
      console.error("Error loading activities:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const getActivityIcon = (action: string): any => {
    switch (action) {
      case "task_created":
        return "add-circle-outline";
      case "task_updated":
        return "create-outline";
      case "task_status_changed":
        return "swap-horizontal-outline";
      case "task_deleted":
        return "trash-outline";
      case "comment_added":
        return "chatbubble-ellipses-outline";
      default:
        return "git-commit-outline";
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
          total: res.analytics.summary.total,
          completed: res.analytics.summary.completed,
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
    } catch (err) {
      console.error("Error loading pinned items:", err);
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
        const formData = new FormData();
        formData.append("file", {
          uri: Platform.OS === "ios" ? asset.uri.replace("file://", "") : asset.uri,
          name: asset.fileName || `logo_${Date.now()}.jpg`,
          type: "image/jpeg",
        } as any);

        const uploadRes = await uploadFile(formData);
        if (uploadRes.success) {
          const updateRes = await updateWorkspace(activeWorkspace._id, {
            logoUrl: uploadRes.url,
          });
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

  // Search users for invite
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performUserSearch();
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const performUserSearch = async () => {
    setSearchingUsers(true);
    try {
      const res = await searchUsers(searchQuery);
      if (res.success) {
        // Filter out users who are already members
        const currentMemberIds = activeWorkspace?.members.map((m: any) =>
          typeof m.user === "object" ? m.user._id : m.user
        ) || [];
        
        const filtered = res.users.filter(
          (u) => u._id !== user?._id && !currentMemberIds.includes(u._id)
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error("User search error:", err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleInviteUser = async (targetUserId: string) => {
    if (!activeWorkspace) return;

    Alert.alert(
      "Add Workspace Member",
      "Are you sure you want to add this user to the workspace?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Member",
          onPress: async () => {
            setInvitingUserId(targetUserId);
            try {
              const res = await addMemberToWorkspace(activeWorkspace._id, targetUserId);
              if (res.success) {
                Alert.alert("Success", "User added to workspace successfully!");
                setSearchQuery("");
                setSearchResults([]);
                await refreshWorkspaces();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to add member.");
            } finally {
              setInvitingUserId(null);
            }
          }
        }
      ]
    );
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeWorkspace) return;
    Alert.alert("Remove Member", "Are you sure you want to remove this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await removeMemberFromWorkspace(activeWorkspace._id, targetUserId);
            if (res.success) {
              Alert.alert("Success", "Member removed successfully.");
              await refreshWorkspaces();
            }
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to remove member.");
          }
        },
      },
    ]);
  };

  const handleChangeRole = async (targetUserId: string, currentRole: string) => {
    if (!activeWorkspace) return;

    Alert.alert(
      "Change Member Role",
      "Select the new workspace role for this member:",
      [
        {
          text: "Admin",
          onPress: async () => {
            await updateWorkspaceMemberRole(targetUserId, "admin");
          }
        },
        {
          text: "Member",
          onPress: async () => {
            await updateWorkspaceMemberRole(targetUserId, "member");
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
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
    Alert.alert("Leave Workspace", "Are you sure you want to leave this workspace?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await leaveWorkspace(activeWorkspace._id);
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
    ]);
  };

  const handleDeleteWorkspace = () => {
    if (!activeWorkspace) return;
    Alert.alert(
      "Delete Workspace",
      "CRITICAL: This will delete the workspace, all its projects, and tasks permanently. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteWorkspace(activeWorkspace._id);
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
      ]
    );
  };

  // Helper to extract workspace owner ID regardless of whether populated
  const getWorkspaceOwnerId = (ws: any) => {
    if (!ws) return null;
    const owner = ws.owner;
    return typeof owner === "object" && owner !== null ? owner._id : owner;
  };

  // Determine permissions
  const isOwner = getWorkspaceOwnerId(activeWorkspace) === user?._id;
  const isAdmin = activeWorkspace?.members.some(
    (m: any) => (typeof m.user === "object" ? m.user._id : m.user) === user?._id && m.role === "admin"
  );
  const canManage = isOwner || isAdmin;

  if (workspaces.length === 0) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: "#3A76E1" }}
      >
        {/* Floating sticker icons for a playful feel */}
        <View
          style={{
            position: "absolute",
            top: 90,
            left: 28,
            width: 46,
            height: 46,
            borderRadius: 13,
            backgroundColor: "#5865D8",
            transform: [{ rotate: "-12deg" }],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark-done-outline" size={20} color="#A99BE8" />
        </View>

        <View
          style={{
            position: "absolute",
            top: 150,
            right: 24,
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: "#5865D8",
            transform: [{ rotate: "10deg" }],
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#7C62E0",
            shadowOpacity: 0.3,
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#C9BFF0" />
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 200,
            left: 22,
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: "#5865D8",
            transform: [{ rotate: "8deg" }],
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#7C62E0",
            shadowOpacity: 0.3,
          }}
        >
          <Ionicons name="flag-outline" size={17} color="#E093C0" />
        </View>

        {/* Rocket badge */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 30,
            backgroundColor: "#5865D8",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 26,
            shadowColor: "#7C62E0",
            shadowOpacity: 0.3,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}
        >
          <Ionicons name="rocket-outline" size={42} color="#E4DDFA" />
        </View>

        <Text className="text-white text-2xl font-bold mt-1 text-center">
          Let's build your space
        </Text>
        <Text
          className="text-white text-base text-center mt-3 leading-6"
          style={{ maxWidth: 260 }}
        >
          Spin up a workspace and bring your whole team along for the ride.
        </Text>

        <TouchableOpacity
          className="px-8 py-4 rounded-2xl mt-8 flex-row items-center"
          style={{
            backgroundColor: themeColor,
            shadowColor: themeColor,
            shadowOpacity: 0.4,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/createWorkspace")}
        >
          <Ionicons name="sparkles" size={17} color="#fffff" style={{ marginRight: 8 }} />
          <Text className="text-[#0C101B] font-bold text-base">Create Workspace</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }}>
      {/* Upper header with custom workspace dropdown */}
      <View className="flex-row justify-between items-center px-5 py-4 border-b" style={{ borderBottomColor: C.divider }}>
        <TouchableOpacity
          onPress={() => setWorkspaceMenuVisible(true)}
          className="flex-row items-center rounded-xl px-4 py-2.5 border"
          style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
        >
          {activeWorkspace?.logoUrl ? (
            <Image 
              source={{ uri: activeWorkspace.logoUrl }} 
              style={{ width: 20, height: 20, borderRadius: 4, marginRight: 8 }} 
            />
          ) : (
            <Ionicons name="briefcase-outline" size={16} color={themeColor} style={{ marginRight: 8 }} />
          )}
          <Text className="font-semibold text-base mr-2" style={{ color: C.textPrimary }}>
            {activeWorkspace?.name || "Select Workspace"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={themeColor} />
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setSearchModalVisible(true)}
            className="p-2.5 rounded-xl border"
            style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
          >
            <Ionicons name="search-outline" size={18} color={C.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setManageModalVisible(true)}
            className="p-2.5 rounded-xl border"
            style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
          >
            <Ionicons name="settings-outline" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" style={{ backgroundColor: C.bg }}>
        {/* Active Tab Toggles */}
        <View className="flex-row rounded-xl p-1 mb-6 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
          <TouchableOpacity
            onPress={() => setActiveTab("stats")}
            className="flex-1 py-3 rounded-lg items-center flex-row justify-center"
            style={{ backgroundColor: activeTab === "stats" ? themeColor : "transparent" }}
          >
            <Ionicons
              name="stats-chart-outline"
              size={14}
              color={activeTab === "stats" ? C.onAccent : C.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              className="font-semibold text-sm"
              style={{ color: activeTab === "stats" ? C.onAccent : C.textSecondary }}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("members")}
            className="flex-1 py-3 rounded-lg items-center flex-row justify-center"
            style={{ backgroundColor: activeTab === "members" ? themeColor : "transparent" }}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={activeTab === "members" ? C.onAccent : C.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              className="font-semibold text-sm"
              style={{ color: activeTab === "members" ? C.onAccent : C.textSecondary }}
            >
              Members
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "stats" ? (
          <>
            {/* Workspace Header Info */}
            <View className="mb-6 rounded-2xl p-5 border flex-row items-center" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
              {activeWorkspace?.logoUrl ? (
                <Image 
                  source={{ uri: activeWorkspace.logoUrl }} 
                  style={{ width: 48, height: 48, borderRadius: 12, marginRight: 16 }} 
                />
              ) : null}
              <View className="flex-1">
                <Text className="font-bold text-xs uppercase tracking-widest mb-1" style={{ color: themeColor }}>
                  Workspace Active
                </Text>
                <Text className="text-2xl font-bold" style={{ color: C.textPrimary }}>{activeWorkspace?.name}</Text>
                {activeWorkspace?.description ? (
                  <Text className="text-sm mt-1 leading-5" style={{ color: C.textSecondary }}>
                    {activeWorkspace.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Pinned Projects & Tasks Section */}
            {(pinnedProjects.length > 0 || pinnedTasks.length > 0) && (
              <View className="mb-6">
                <Text className="text-lg font-bold mb-4" style={{ color: C.textPrimary }}>📌 Pinned Items</Text>
                
                {/* Pinned Projects */}
                {pinnedProjects.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.textSecondary }}>Projects</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                      {pinnedProjects.map((proj: any) => (
                        <TouchableOpacity
                          key={proj._id}
                          onPress={() => handleSelectProjectFromSearch(proj)}
                          className="mr-3 p-4 rounded-2xl border"
                          style={{
                            backgroundColor: C.card,
                            borderColor: proj.color || C.cardBorder,
                            borderLeftWidth: 5,
                            minWidth: 150
                          }}
                        >
                          <Text className="font-bold text-sm" style={{ color: C.textPrimary }} numberOfLines={1}>{proj.name}</Text>
                          <Text className="text-xs mt-1" style={{ color: C.textSecondary }}>Active Workspace</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Pinned Tasks */}
                {pinnedTasks.length > 0 && (
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.textSecondary }}>Tasks</Text>
                    {pinnedTasks.map((task: any) => (
                      <TouchableOpacity
                        key={task._id}
                        onPress={() => handleSelectTaskFromSearch(task)}
                        className="mb-2 p-4 rounded-2xl border flex-row items-center justify-between"
                        style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                      >
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center mb-1">
                            <View className="w-2 h-2 rounded-full mr-2" style={{
                              backgroundColor: task.priority === "high" ? "#E24B4A" : task.priority === "medium" ? "#EF9F27" : "#5DCAA5"
                            }} />
                            <Text className="font-semibold text-sm" style={{ color: C.textPrimary }} numberOfLines={1}>{task.title}</Text>
                          </View>
                          <Text className="text-xs" style={{ color: C.textSecondary }}>
                            {task.status.toUpperCase()} • {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                          </Text>
                        </View>
                        <Ionicons name="pin" size={16} color={themeColor} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Dynamic Dashboard Stats */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold" style={{ color: C.textPrimary }}>
                {dashboardMode === "workspace" ? "Workspace Stats" : "Personal Productivity"}
              </Text>
            </View>

            {/* Dashboard Mode Selector */}
            <View className="flex-row mb-5 p-1 rounded-2xl border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
              <TouchableOpacity
                onPress={() => setDashboardMode("workspace")}
                className="flex-1 py-2.5 items-center justify-center rounded-xl"
                style={{ backgroundColor: dashboardMode === "workspace" ? themeColor : "transparent" }}
              >
                <Text
                  className="font-bold text-xs uppercase tracking-wider"
                  style={{ color: dashboardMode === "workspace" ? "#0C101B" : C.textSecondary }}
                >
                  Workspace View
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDashboardMode("personal")}
                className="flex-1 py-2.5 items-center justify-center rounded-xl"
                style={{ backgroundColor: dashboardMode === "personal" ? themeColor : "transparent" }}
              >
                <Text
                  className="font-bold text-xs uppercase tracking-wider"
                  style={{ color: dashboardMode === "personal" ? "#0C101B" : C.textSecondary }}
                >
                  Personal Stats
                </Text>
              </TouchableOpacity>
            </View>

            {loadingStats ? (
              <ActivityIndicator
                size="large"
                color={themeColor}
                style={{ transform: [{ scale: 1.5 }] }}
                className="my-8"
              />
            ) : dashboardMode === "workspace" ? (
              <View className="mb-6">
                <View className="flex-row gap-3 mb-3">
                  {/* Total Tasks Card */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                  >
                    <Ionicons name="clipboard-outline" size={24} color={themeColor} />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                        Total Tasks
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: C.textPrimary }}>
                        {analytics?.summary?.total ?? stats.total}
                      </Text>
                    </View>
                  </View>

                  {/* Completed Card */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{ backgroundColor: isDarkMode ? "#1E2A24" : "#EBFBEE", borderColor: isDarkMode ? "#2C3B33" : "#D3F9D8" }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={24} color="#5DCAA5" />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDarkMode ? "#79A88C" : "#2B8A3E" }}>
                        Completed
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: C.textPrimary }}>
                        {analytics?.summary?.completed ?? stats.completed}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  {/* In Progress Card */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{ backgroundColor: isDarkMode ? "#241E2C" : "#F3F0FF", borderColor: isDarkMode ? "#332B3E" : "#E5DBFF" }}
                  >
                    <Ionicons name="flash-outline" size={24} color="#AFA9EC" />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDarkMode ? "#A89AB8" : "#7048E8" }}>
                        In Progress
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: C.textPrimary }}>
                        {analytics?.summary?.inProgress ?? stats.inProgress}
                      </Text>
                    </View>
                  </View>

                  {/* Overdue Card */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{
                      backgroundColor: (analytics?.summary?.overdue ?? 0) > 0 ? (isDarkMode ? "rgba(226,75,74,0.1)" : "#FFF5F5") : (isDarkMode ? "#2C2218" : "#FFF9DB"),
                      borderColor: (analytics?.summary?.overdue ?? 0) > 0 ? (isDarkMode ? "rgba(226,75,74,0.2)" : "#FFE3E3") : (isDarkMode ? "#3D3122" : "#FFF3BF"),
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={24} color={(analytics?.summary?.overdue ?? 0) > 0 ? "#E24B4A" : "#EF9F27"} />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: (analytics?.summary?.overdue ?? 0) > 0 ? "#E24B4A" : (isDarkMode ? "#C7A87E" : "#E8590C") }}>
                        Overdue
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: (analytics?.summary?.overdue ?? 0) > 0 ? "#E24B4A" : C.textPrimary }}>
                        {analytics?.summary?.overdue ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View className="mb-6">
                <View className="flex-row gap-3 mb-3">
                  {/* Total Assigned */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                  >
                    <Ionicons name="people-outline" size={24} color={themeColor} />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                        Assigned To Me
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: C.textPrimary }}>
                        {analytics?.personal?.total ?? 0}
                      </Text>
                    </View>
                  </View>

                  {/* Completed */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{ backgroundColor: isDarkMode ? "#1E2A24" : "#EBFBEE", borderColor: isDarkMode ? "#2C3B33" : "#D3F9D8" }}
                  >
                    <Ionicons name="checkmark-done-circle-outline" size={24} color="#5DCAA5" />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDarkMode ? "#79A88C" : "#2B8A3E" }}>
                        My Completed
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: C.textPrimary }}>
                        {analytics?.personal?.completed ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  {/* Completed This Week */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{ backgroundColor: isDarkMode ? "#241E2C" : "#F3F0FF", borderColor: isDarkMode ? "#332B3E" : "#E5DBFF" }}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#AFA9EC" />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDarkMode ? "#A89AB8" : "#7048E8" }}>
                        Done This Week
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: C.textPrimary }}>
                        {analytics?.personal?.completedThisWeek ?? 0}
                      </Text>
                    </View>
                  </View>

                  {/* Overdue Assigned */}
                  <View
                    className="flex-1 rounded-2xl p-4 justify-between min-h-[120px] border"
                    style={{
                      backgroundColor: (analytics?.personal?.overdue ?? 0) > 0 ? (isDarkMode ? "rgba(226,75,74,0.1)" : "#FFF5F5") : (isDarkMode ? "#2C2218" : "#FFF9DB"),
                      borderColor: (analytics?.personal?.overdue ?? 0) > 0 ? (isDarkMode ? "rgba(226,75,74,0.2)" : "#FFE3E3") : (isDarkMode ? "#3D3122" : "#FFF3BF"),
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={24} color={(analytics?.personal?.overdue ?? 0) > 0 ? "#E24B4A" : "#EF9F27"} />
                    <View className="mt-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: (analytics?.personal?.overdue ?? 0) > 0 ? "#E24B4A" : (isDarkMode ? "#C7A87E" : "#E8590C") }}>
                        My Overdue
                      </Text>
                      <Text className="text-2xl font-extrabold mt-1" style={{ color: (analytics?.personal?.overdue ?? 0) > 0 ? "#E24B4A" : C.textPrimary }}>
                        {analytics?.personal?.overdue ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Circular completion rate layout */}
                <View className="mt-4 p-4 rounded-2xl border flex-row items-center justify-between" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
                  <View>
                    <Text className="text-sm font-bold" style={{ color: C.textPrimary }}>Completion Rate</Text>
                    <Text className="text-xs" style={{ color: C.textSecondary }}>Ratio of completed assigned tasks</Text>
                  </View>
                  <Text className="text-2xl font-black" style={{ color: themeColor }}>{analytics?.personal?.completionRate ?? 0}%</Text>
                </View>
              </View>
            )}

            {/* Project Progress Breakdown */}
            {analytics?.projects && analytics.projects.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-bold mb-4" style={{ color: C.textPrimary }}>Project Progress</Text>
                {analytics.projects.map((proj: any) => {
                  const progress = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
                  return (
                    <View key={proj.projectId} className="mb-3 p-4 rounded-2xl border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
                      <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center">
                          <View className="w-2.5 h-2.5 rounded-full mr-2.5" style={{ backgroundColor: proj.color }} />
                          <Text className="font-semibold text-sm" style={{ color: C.textPrimary }}>{proj.title}</Text>
                        </View>
                        <Text className="text-xs font-bold" style={{ color: themeColor }}>{progress}%</Text>
                      </View>
                      <View className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: proj.color }} />
                      </View>
                      <View className="flex-row justify-between mt-2">
                        <Text className="text-[10px]" style={{ color: C.textSecondary }}>{proj.completed} of {proj.total} tasks completed</Text>
                        {proj.overdue > 0 && (
                          <Text className="text-[10px] font-bold" style={{ color: "#E24B4A" }}>
                            {proj.overdue} overdue
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Team Productivity Leaderboard */}
            {analytics?.productivity && analytics.productivity.length > 0 && (
              <View className="mb-6 rounded-2xl p-5 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
                <Text className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: themeColor }}>
                  Team Productivity
                </Text>
                {analytics.productivity.slice(0, 5).map((member: any) => {
                  const pct = member.totalCount > 0 ? Math.round((member.completedCount / member.totalCount) * 100) : 0;
                  return (
                    <View key={member.userId} className="mb-4 last:mb-0">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="w-6 h-6 rounded-full items-center justify-center mr-2.5" style={{ backgroundColor: C.divider }}>
                            <Text className="font-bold text-[9px]" style={{ color: themeColor }}>
                              {member.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <Text className="text-xs font-semibold" style={{ color: C.textPrimary }} numberOfLines={1}>
                            {member.name}
                          </Text>
                        </View>
                        <Text className="text-[10px]" style={{ color: C.textSecondary }}>
                          {member.completedCount} / {member.totalCount} done ({pct}%)
                        </Text>
                      </View>
                      <View className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: themeColor }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Quick Actions */}
            <Text className="text-lg font-bold mb-4" style={{ color: C.textPrimary }}>Quick Actions</Text>
            <View className="flex-row gap-3 mb-8">
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/projects")}
                className="flex-1 rounded-xl p-4 items-center border"
                style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
              >
                <Ionicons name="folder-outline" size={22} color={themeColor} style={{ marginBottom: 6 }} />
                <Text className="text-sm font-semibold" style={{ color: C.textPrimary }}>View Projects</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/tasks")}
                className="flex-1 rounded-xl p-4 items-center border"
                style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
              >
                <Ionicons name="grid-outline" size={22} color={themeColor} style={{ marginBottom: 6 }} />
                <Text className="text-sm font-semibold" style={{ color: C.textPrimary }}>Kanban Board</Text>
              </TouchableOpacity>
            </View>

            {/* Activity Timeline */}
            <Text className="text-lg font-bold mb-4" style={{ color: C.textPrimary }}>Recent Activity</Text>
            {loadingActivities ? (
              <ActivityIndicator size="small" color={themeColor} className="my-6" />
            ) : activities.length === 0 ? (
              <View className="rounded-2xl p-6 mb-8 border items-center justify-center" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
                <Ionicons name="time-outline" size={24} color={C.textMuted} style={{ marginBottom: 6 }} />
                <Text className="text-sm" style={{ color: C.textSecondary }}>No activity recorded yet</Text>
              </View>
            ) : (
              <View className="rounded-2xl p-5 mb-8 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
                {activities.slice(0, 5).map((act, idx) => {
                  const isLast = idx === Math.min(activities.length, 5) - 1;
                  return (
                    <View key={act._id} className="flex-row mb-4 last:mb-0">
                      {/* Left indicator line/dot */}
                      <View className="items-center mr-3">
                        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: C.input }}>
                          <Ionicons name={getActivityIcon(act.action)} size={12} color={themeColor} />
                        </View>
                        {!isLast && <View className="w-[1.5px] flex-1 my-1" style={{ backgroundColor: C.divider }} />}
                      </View>
                      <View className="flex-1 pb-2">
                        <Text className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                          {getFullName(act.user)} <Text className="font-normal" style={{ color: C.textSecondary }}>{act.details}</Text>
                        </Text>
                        <Text className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                          {new Date(act.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Invite Members Portal */}
            {canManage && (
              <View className="rounded-2xl p-5 mb-6 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
                <Text className="font-semibold text-base mb-3" style={{ color: C.textPrimary }}>Invite Team Members</Text>
                <View className="rounded-xl px-4 border flex-row items-center" style={{ backgroundColor: C.input, borderColor: C.inputBorder }}>
                  <Ionicons name="search-outline" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    className="flex-1 py-3 text-sm"
                    style={{ color: C.textPrimary }}
                    placeholder="Search user by email or username..."
                    placeholderTextColor={C.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchingUsers && <ActivityIndicator size="small" color={themeColor} />}
                </View>

                {searchResults.length > 0 ? (
                  <View className="mt-3 rounded-xl border p-2" style={{ backgroundColor: C.bg, borderColor: C.cardBorder }}>
                    {searchResults.map((item) => (
                      <View
                        key={item._id}
                        className="flex-row items-center justify-between py-2.5 px-3 border-b last:border-0"
                        style={{ borderBottomColor: C.card }}
                      >
                        <View className="flex-1 mr-3">
                          <Text className="font-semibold text-sm" style={{ color: C.textPrimary }}>
                            {item.username.firstname} {item.username.lastname}
                          </Text>
                          <Text className="text-xs" style={{ color: C.textSecondary }}>{item.email}</Text>
                        </View>
                        <TouchableOpacity
                          disabled={invitingUserId === item._id}
                          onPress={() => handleInviteUser(item._id)}
                          className="px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: themeColor }}
                        >
                          {invitingUserId === item._id ? (
                            <ActivityIndicator size="small" color={C.onAccent} />
                          ) : (
                            <Text className="text-xs font-bold" style={{ color: C.onAccent }}>Add</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : searchQuery.trim().length >= 2 && !searchingUsers ? (
                  <Text className="text-xs mt-2 text-center" style={{ color: C.textMuted }}>No users found</Text>
                ) : null}
              </View>
            )}

            {/* Members List */}
            <Text className="text-lg font-bold mb-3" style={{ color: C.textPrimary }}>Workspace Members</Text>
            <View className="rounded-2xl overflow-hidden mb-8 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
              {activeWorkspace?.members.map((member: any, index: number) => {
                const isMemberObject = typeof member.user === "object";
                const memberId = isMemberObject ? member.user._id : member.user;
                const firstname = isMemberObject ? member.user.username.firstname : "User";
                const lastname = isMemberObject ? member.user.username.lastname : "";
                const email = isMemberObject ? member.user.email : "";
                const role = member.role;

                const isMe = memberId === user?._id;
                const avatarColors = getAvatarColors(firstname);

                return (
                  <View
                    key={memberId || index}
                    className={`flex-row items-center justify-between p-4 border-b ${
                      index === activeWorkspace.members.length - 1 ? "border-0" : ""
                    }`}
                    style={{ borderBottomColor: index === activeWorkspace.members.length - 1 ? "transparent" : C.divider }}
                  >
                    <TouchableOpacity
                      onPress={() => isMemberObject && handleOpenUserProfile(member.user)}
                      className="flex-1 mr-3 flex-row items-center"
                    >
                      {isMemberObject && member.user.avatarUrl ? (
                        <Image
                          source={{ uri: member.user.avatarUrl }}
                          className="w-9 h-9 rounded-full mr-3"
                        />
                      ) : (
                        <View
                          className="w-9 h-9 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: avatarColors.bg }}
                        >
                          <Text className="font-bold text-xs" style={{ color: avatarColors.text }}>
                            {(firstname?.[0] || "").toUpperCase()}{(lastname?.[0] || "").toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="font-semibold text-base" style={{ color: C.textPrimary }}>
                          {firstname} {lastname}{" "}
                          {isMe && <Text className="text-xs" style={{ color: themeColor }}>(Me)</Text>}
                        </Text>
                        <Text className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{email}</Text>
                        <View
                          className="px-2 py-0.5 rounded self-start mt-1.5"
                          style={{ backgroundColor: C.tagBg }}
                        >
                          <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.tagText }}>
                            {role}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Member action buttons */}
                    {canManage && !isMe && getWorkspaceOwnerId(activeWorkspace) !== memberId && (
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleChangeRole(memberId, role)}
                          className="px-2.5 py-1.5 rounded-lg border"
                          style={{ backgroundColor: C.input, borderColor: C.inputBorder }}
                        >
                          <Text className="text-xs" style={{ color: C.textPrimary }}>
                            {role === "admin" ? "Demote" : "Promote"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(memberId)}
                          className="px-2.5 py-1.5 rounded-lg border"
                          style={{ backgroundColor: C.dangerBg, borderColor: C.dangerBorder }}
                        >
                          <Text className="text-xs font-semibold" style={{ color: C.danger }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>


      {/* MODAL 3: Global Search */}
      <Modal
        visible={searchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }}>
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b" style={{ borderBottomColor: C.divider }}>
            <TouchableOpacity onPress={() => { setSearchModalVisible(false); setGlobalQuery(""); setGlobalResults(null); }} className="mr-3 p-1">
              <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <View className="flex-1 rounded-xl px-4 py-2 border flex-row items-center" style={{ backgroundColor: C.input, borderColor: C.inputBorder }}>
              <Ionicons name="search-outline" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                className="flex-1 py-1 text-sm text-white"
                placeholder="Search workspaces, projects, tasks..."
                placeholderTextColor={C.textMuted}
                autoFocus
                value={globalQuery}
                onChangeText={setGlobalQuery}
              />
              {searchingGlobal && <ActivityIndicator size="small" color={themeColor} />}
            </View>
          </View>

          <ScrollView className="flex-1 px-5 pt-4">
            {globalResults ? (
              <View className="pb-10">
                {/* Tasks Section */}
                {globalResults.tasks?.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: themeColor }}>Tasks</Text>
                    {globalResults.tasks.map((task: any) => (
                      <TouchableOpacity
                        key={task._id}
                        onPress={() => handleSelectTaskFromSearch(task)}
                        className="p-3 mb-2 rounded-xl border flex-row items-center justify-between"
                        style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                      >
                        <View className="flex-1 mr-2">
                          <Text className="font-semibold text-sm" style={{ color: C.textPrimary }}>{task.title}</Text>
                          <Text className="text-xs mt-1" style={{ color: C.textSecondary }}>Project: {task.project?.name || "Unknown"}</Text>
                        </View>
                        <View className="px-2 py-0.5 rounded" style={{ backgroundColor: C.tagBg }}>
                          <Text className="text-[10px] font-bold uppercase" style={{ color: C.tagText }}>{task.status}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Projects Section */}
                {globalResults.projects?.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: themeColor }}>Projects</Text>
                    {globalResults.projects.map((proj: any) => (
                      <TouchableOpacity
                        key={proj._id}
                        onPress={() => handleSelectProjectFromSearch(proj)}
                        className="p-3 mb-2 rounded-xl border flex-row items-center justify-between"
                        style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                      >
                        <View className="flex-1">
                          <Text className="font-semibold text-sm" style={{ color: C.textPrimary }}>{proj.name}</Text>
                          <Text className="text-xs mt-1" style={{ color: C.textSecondary }}>Workspace: {proj.workspace?.name || "Unknown"}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={themeColor} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Workspaces Section */}
                {globalResults.workspaces?.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: themeColor }}>Workspaces</Text>
                    {globalResults.workspaces.map((ws: any) => (
                      <TouchableOpacity
                        key={ws._id}
                        onPress={() => handleSelectWorkspaceFromSearch(ws)}
                        className="p-3 mb-2 rounded-xl border flex-row items-center justify-between"
                        style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                      >
                        <View className="flex-1 mr-2">
                          <Text className="font-semibold text-sm" style={{ color: C.textPrimary }}>{ws.name}</Text>
                          {ws.description ? <Text className="text-xs mt-1" style={{ color: C.textSecondary }} numberOfLines={1}>{ws.description}</Text> : null}
                        </View>
                        <Ionicons name="briefcase-outline" size={16} color={themeColor} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Members Section */}
                {globalResults.users?.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: themeColor }}>Members</Text>
                    {globalResults.users.map((item: any) => (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => handleOpenUserProfile(item)}
                        className="p-3 mb-2 rounded-xl border flex-row items-center"
                        style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                      >
                        {item.avatarUrl ? (
                          <Image
                            source={{ uri: item.avatarUrl }}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        ) : (
                          <View
                            className="w-8 h-8 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: C.input }}
                          >
                            <Text className="font-bold text-xs" style={{ color: themeColor }}>
                              {getInitials(item)}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="font-semibold text-sm" style={{ color: C.textPrimary }}>{getFullName(item)}</Text>
                          <Text className="text-xs" style={{ color: C.textSecondary }}>{item.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Empty State when Query is run but all categories are empty */}
                {(!globalResults.tasks?.length &&
                  !globalResults.projects?.length &&
                  !globalResults.workspaces?.length &&
                  !globalResults.users?.length) && (
                    <View className="items-center justify-center py-10">
                      <Ionicons name="search-outline" size={32} color={C.textMuted} className="mb-2" />
                      <Text className="text-sm" style={{ color: C.textSecondary }}>No results found for "{globalQuery}"</Text>
                    </View>
                )}
              </View>
            ) : (
              globalQuery.trim().length > 0 ? null : (
                <View className="items-center justify-center py-20">
                  <Ionicons name="search-outline" size={48} color={C.textMuted} className="mb-3" />
                  <Text className="text-sm text-center px-6" style={{ color: C.textSecondary }}>
                    Search for workspaces, projects, tasks, or team members across all your spaces.
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 1: Workspace Selector Dropdown */}
      <Modal
        visible={workspaceMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWorkspaceMenuVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setWorkspaceMenuVisible(false)}
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View className="w-full max-h-[80%] rounded-3xl p-6 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
            <Text className="text-xl font-bold mb-4" style={{ color: C.textPrimary }}>Switch Workspace</Text>
            <ScrollView className="mb-4">
              {workspaces.map((w) => {
                const isActive = w._id === activeWorkspace?._id;
                return (
                  <TouchableOpacity
                    key={w._id}
                    onPress={async () => {
                      await selectWorkspace(w);
                      setWorkspaceMenuVisible(false);
                    }}
                    className="flex-row justify-between items-center p-4 rounded-xl mb-2 border"
                    style={{
                      backgroundColor: isActive ? `${themeColor}1a` : C.input,
                      borderColor: isActive ? themeColor : C.cardBorder,
                    }}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      {w.logoUrl ? (
                        <Image 
                          source={{ uri: w.logoUrl }} 
                          style={{ width: 24, height: 24, borderRadius: 4, marginRight: 12 }} 
                        />
                      ) : (
                        <View className="w-6 h-6 rounded bg-zinc-800 mr-3 items-center justify-center">
                          <Ionicons name="briefcase-outline" size={12} color={themeColor} />
                        </View>
                      )}
                      <Text className="font-semibold text-base flex-1" style={{ color: C.textPrimary }} numberOfLines={1}>{w.name}</Text>
                    </View>
                    {isActive && <Ionicons name="checkmark" size={18} color={themeColor} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setWorkspaceMenuVisible(false);
                router.push("/(tabs)/createWorkspace");
              }}
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: themeColor }}
            >
              <Ionicons name="add" size={18} color={C.onAccent} style={{ marginRight: 6 }} />
              <Text className="font-bold text-base" style={{ color: C.onAccent }}>Create Workspace</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: Settings / Manage Workspace */}
      <Modal
        visible={manageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setManageModalVisible(false)}
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View className="rounded-t-3xl p-6 pb-10 border-t" style={{ backgroundColor: C.card, borderTopColor: C.cardBorder, borderTopWidth: 1 }}>
            <View className="w-12 h-1 rounded-full self-center mb-6" style={{ backgroundColor: C.input }} />
            <Text className="text-xl font-bold mb-4" style={{ color: C.textPrimary }}>Workspace Settings</Text>
            <Text className="text-sm mb-6" style={{ color: C.textSecondary }}>
              Workspace actions for "{activeWorkspace?.name}"
            </Text>

            {canManage && (
              <TouchableOpacity
                onPress={handleUploadLogo}
                className="py-4 rounded-2xl items-center mb-4 flex-row justify-center border"
                style={{ backgroundColor: C.input, borderColor: C.inputBorder }}
              >
                {uploadingLogo ? (
                  <ActivityIndicator size="small" color={themeColor} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={17} color={themeColor} style={{ marginRight: 8 }} />
                    <Text className="font-bold text-base" style={{ color: C.textPrimary }}>Upload Workspace Logo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isOwner ? (
              <TouchableOpacity
                onPress={handleDeleteWorkspace}
                className="py-4 rounded-2xl items-center mb-4 flex-row justify-center border"
                style={{ backgroundColor: C.dangerBg, borderColor: C.dangerBorder }}
              >
                <Ionicons name="trash-outline" size={17} color={C.danger} style={{ marginRight: 8 }} />
                <Text className="font-bold text-base" style={{ color: C.danger }}>Delete Workspace</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleLeaveWorkspace}
                className="py-4 rounded-2xl items-center mb-4 flex-row justify-center border"
                style={{ backgroundColor: C.dangerBg, borderColor: C.dangerBorder }}
              >
                <Ionicons name="log-out-outline" size={17} color={C.danger} style={{ marginRight: 8 }} />
                <Text className="font-bold text-base" style={{ color: C.danger }}>Leave Workspace</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setManageModalVisible(false)}
              className="py-4 rounded-2xl items-center border"
              style={{ backgroundColor: C.input, borderColor: C.inputBorder }}
            >
              <Text className="font-semibold text-base" style={{ color: C.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 3: User Profile Card */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="w-full rounded-3xl p-6 border"
            style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
          >
            {/* Header with avatar */}
            <View className="items-center mb-6">
              {selectedUserForProfile?.avatarUrl ? (
                <Image
                  source={{ uri: selectedUserForProfile.avatarUrl }}
                  className="w-20 h-20 rounded-full border-2 mb-3"
                  style={{ borderColor: C.inputBorder }}
                />
              ) : (
                <View
                  className="w-20 h-20 rounded-full items-center justify-center border-2 mb-3"
                  style={{ backgroundColor: getAvatarColors(selectedUserForProfile?.username?.firstname || "").bg, borderColor: C.inputBorder }}
                >
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: getAvatarColors(selectedUserForProfile?.username?.firstname || "").text }}
                  >
                    {selectedUserForProfile ? getInitials(selectedUserForProfile) : "?"}
                  </Text>
                </View>
              )}
              <Text className="text-xl font-bold" style={{ color: C.textPrimary }}>
                {selectedUserForProfile ? getFullName(selectedUserForProfile) : "User Profile"}
              </Text>
              <Text className="text-sm mt-1" style={{ color: C.textSecondary }}>
                {selectedUserForProfile?.email || ""}
              </Text>

              {/* Workspace Role Badge */}
              {selectedUserForProfile && (
                <View className="px-3 py-1 rounded-full mt-3" style={{ backgroundColor: C.tagBg }}>
                  <Text className="text-xs font-semibold capitalize" style={{ color: C.tagText }}>
                    {activeWorkspace?.members.find((m: any) => {
                      const mId = typeof m.user === "object" ? m.user._id : m.user;
                      return mId === selectedUserForProfile._id;
                    })?.role || "Member"}
                  </Text>
                </View>
              )}
            </View>

            {/* Projects List */}
            <View className="mb-6">
              <Text className="text-xs font-semibold uppercase mb-3 tracking-wide" style={{ color: C.textSecondary }}>
                Projects in Workspace ({selectedUserProjects.length})
              </Text>
              <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                {selectedUserProjects.length === 0 ? (
                  <Text className="text-xs" style={{ color: C.textMuted }}>Not assigned to any projects yet</Text>
                ) : (
                  selectedUserProjects.map((proj: any) => {
                    const userProjRole = proj.members.find((m: any) => {
                      const mId = typeof m.user === "object" ? m.user._id : m.user;
                      return mId === selectedUserForProfile?._id;
                    })?.role || "member";
                    return (
                      <View
                        key={proj._id}
                        className="flex-row justify-between items-center p-3 rounded-xl mb-2 border"
                        style={{ backgroundColor: C.bg, borderColor: C.cardBorder }}
                      >
                        <View className="flex-row items-center">
                          <View className="w-2.5 h-2.5 rounded-full mr-2.5" style={{ backgroundColor: proj.color || themeColor }} />
                          <Text className="text-sm font-semibold" style={{ color: C.textPrimary }}>{proj.name}</Text>
                        </View>
                        <View className="px-2 py-0.5 rounded" style={{ backgroundColor: C.tagBg }}>
                          <Text className="text-[10px] uppercase font-bold" style={{ color: C.tagText }}>{userProjRole}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setProfileModalVisible(false)}
              className="w-full py-4 rounded-xl items-center border"
              style={{ backgroundColor: C.input, borderColor: C.inputBorder }}
            >
              <Text className="font-semibold" style={{ color: C.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
