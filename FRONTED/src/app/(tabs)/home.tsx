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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../../context/AppContext";
import {
  addMemberToWorkspace,
  removeMemberFromWorkspace,
  changeMemberRole,
  leaveWorkspace,
  deleteWorkspace,
} from "../../api/workspace.api";
import { getProjectTasks, Task } from "../../api/task.api";
import { searchUsers, SearchUserResult } from "../../api/search.api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    workspaces,
    activeWorkspace,
    selectWorkspace,
    refreshWorkspaces,
    projects,
    themeColor,
  } = useApp();

  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Modal / Dropdown states
  const [workspaceMenuVisible, setWorkspaceMenuVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "members">("stats");

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
    if (activeWorkspace && projects.length > 0) {
      loadStats();
    } else {
      setStats({ total: 0, completed: 0, inProgress: 0 });
    }
  }, [activeWorkspace, projects]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      let totalTasks: Task[] = [];
      const fetchPromises = projects.map((p) => getProjectTasks(p._id));
      const results = await Promise.all(fetchPromises);

      results.forEach((res) => {
        if (res.success && res.tasks) {
          totalTasks = [...totalTasks, ...res.tasks];
        }
      });

      const total = totalTasks.length;
      const completed = totalTasks.filter((t) => t.status === "completed").length;
      const inProgress = totalTasks.filter((t) => t.status === "in-progress").length;

      setStats({ total, completed, inProgress });
    } catch (err) {
      console.error("Error loading home stats:", err);
    } finally {
      setLoadingStats(false);
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

  const C = {
    bg: "#15171C",
    card: "#1C1F26",
    cardBorder: "#2A2E38",
    divider: "#232730",
    input: "#20242C",
    inputBorder: "#2E333D",
    textPrimary: "#FFFFFF",
    textSecondary: "#9DA3AE",
    textMuted: "#6B7280",
    accent: "#6FC3D6", // replaces themeColor as the default if you want a fixed accent;
    // NOTE: this file still uses `themeColor` from context everywhere it was
    // used originally — C.accent is only a fallback/reference and unused
    // below unless you choose to swap it in.
    onAccent: "#0D2A30",
    danger: "#E2847A",
    dangerBg: "rgba(216,99,74,0.12)",
    dangerBorder: "rgba(216,99,74,0.25)",
    tagBg: "#232730",
    tagText: "#C8CDD6",
  };
return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }}>
      {/* Upper header with custom workspace dropdown */}
      <View className="flex-row justify-between items-center px-5 py-4 border-b" style={{ borderBottomColor: C.divider }}>
        <TouchableOpacity
          onPress={() => setWorkspaceMenuVisible(true)}
          className="flex-row items-center rounded-xl px-4 py-2.5 border"
          style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
        >
          <Ionicons name="briefcase-outline" size={16} color={themeColor} style={{ marginRight: 8 }} />
          <Text className="font-semibold text-base mr-2" style={{ color: C.textPrimary }}>
            {activeWorkspace?.name || "Select Workspace"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={themeColor} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setManageModalVisible(true)}
          className="p-2.5 rounded-xl border"
          style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
        >
          <Ionicons name="settings-outline" size={18} color={C.textSecondary} />
        </TouchableOpacity>
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
            <View className="mb-6 rounded-2xl p-5 border" style={{ backgroundColor: C.card, borderColor: C.cardBorder }}>
              <Text className="font-bold text-xs uppercase tracking-widest mb-1" style={{ color: themeColor }}>
                Workspace Active
              </Text>
              <Text className="text-2xl font-bold" style={{ color: C.textPrimary }}>{activeWorkspace?.name}</Text>
              {activeWorkspace?.description ? (
                <Text className="text-sm mt-2 leading-5" style={{ color: C.textSecondary }}>
                  {activeWorkspace.description}
                </Text>
              ) : null}
            </View>

            {/* Dynamic Dashboard Stats */}
            <Text className="text-lg font-bold mb-4" style={{ color: C.textPrimary }}>Workspace Stats</Text>
            {loadingStats ? (
             <ActivityIndicator
             size="large"
             color={themeColor}
             style={{ transform: [{ scale: 2 }] }}
             className="my-8"
           />
            ) : (
              <View className="flex-row gap-3 mb-6">
                {/* Left Column - Tall Vertical Card, muted teal tint */}
                <View
                  className="flex-1 rounded-3xl p-5 justify-between min-h-[220px] border"
                  style={{ backgroundColor: "#1E2A2D", borderColor: "#2C3B3E" }}
                >
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Ionicons name="clipboard-outline" size={50} color={C.onAccent} />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#7FA8AF" }}>
                      Total Tasks
                    </Text>
                    <Text className="text-4xl font-extrabold mt-1" style={{ color: C.textPrimary }}>{stats.total}</Text>
                  </View>
                </View>

                {/* Right Column - Stacked Small Cards, each its own muted tint */}
                <View className="flex-[1.2] gap-3">
                  {/* Completed Card */}
                  <View
                    className="rounded-2xl p-3 flex-row items-center justify-between border"
                    style={{ backgroundColor: "#1E2A24", borderColor: "#2C3B33" }}
                  >
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#79A88C" }}>
                        Completed
                      </Text>
                      <Text className="text-xl font-extrabold mt-0.5" style={{ color: C.textPrimary }}>{stats.completed}</Text>
                    </View>
                    <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: "#5DCAA5" }}>
                      <Ionicons name="checkmark" size={15} color="#04342C" />
                    </View>
                  </View>

                  {/* In Progress Card */}
                  <View
                    className="rounded-2xl p-3 flex-row items-center justify-between border"
                    style={{ backgroundColor: "#241E2C", borderColor: "#332B3E" }}
                  >
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A89AB8" }}>
                        In Progress
                      </Text>
                      <Text className="text-xl font-extrabold mt-0.5" style={{ color: C.textPrimary }}>{stats.inProgress}</Text>
                    </View>
                    <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: "#AFA9EC" }}>
                      <Ionicons name="flash-outline" size={15} color="#26215C" />
                    </View>
                  </View>

                  {/* Projects Card */}
                  <View
                    className="rounded-2xl p-3 flex-row items-center justify-between border"
                    style={{ backgroundColor: "#2C2218", borderColor: "#3D3122" }}
                  >
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#C7A87E" }}>
                        Projects
                      </Text>
                      <Text className="text-xl font-extrabold mt-0.5" style={{ color: C.textPrimary }}>{projects.length}</Text>
                    </View>
                    <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: "#EF9F27" }}>
                      <Ionicons name="rocket-outline" size={15} color="#412402" />
                    </View>
                  </View>
                </View>
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
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: avatarColors.bg }}
                      >
                        <Text className="font-bold text-xs" style={{ color: avatarColors.text }}>
                          {(firstname?.[0] || "").toUpperCase()}{(lastname?.[0] || "").toUpperCase()}
                        </Text>
                      </View>
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
                    <Text className="font-semibold text-base" style={{ color: C.textPrimary }}>{w.name}</Text>
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
