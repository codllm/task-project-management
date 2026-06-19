import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../../context/AppContext";
import {
  createProject,
  deleteProject,
  addMemberToProject,
  removeMemberFromProject,
  changeProjectRole,
  updateProject,
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  Milestone,
} from "../../api/project.api";
import { getProjectTasks, Task } from "../../api/task.api";
import { searchUsers, SearchUserResult } from "../../api/search.api";
import { addMemberToWorkspace } from "../../api/workspace.api";
import { uploadFile } from "../../api/upload.api";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const PROJECT_COLORS = ["#5865F2", "#95E0F9", "#E8D4F5", "#FED7AA", "#FFA3B1"];

const getUserId = (userField: any): string =>
  typeof userField === "object" && userField !== null ? userField._id : userField;

const getProjectCreatorId = (proj: any) => {
  if (!proj) return null;
  const c = proj.createdBy;
  return typeof c === "object" && c !== null ? c._id : c;
};

const getFullName = (userObj: any): string => {
  if (!userObj) return "User";
  if (typeof userObj.username === "object" && userObj.username?.firstname) {
    return `${userObj.username.firstname} ${userObj.username.lastname ?? ""}`.trim();
  }
  return String(userObj.username ?? "User");
};

const getInitials = (userObj: any): string => {
  const name = getFullName(userObj);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const AVATAR_PALETTE = [
  { bg: "#1E1C3A", text: "#C5C2F5" },
  { bg: "#0D1A2A", text: "#85B7EB" },
  { bg: "#0D2219", text: "#5DCAA5" },
  { bg: "#241A06", text: "#EF9F27" },
  { bg: "#210D0D", text: "#E24B4A" },
];

const avatarColor = (seed?: string) => {
  if (!seed) return AVATAR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};

/* ─── Tiny reusable Avatar ─────────────────────────────────── */
function Avatar({ userObj, size = 36 }: { userObj: any; size?: number }) {
  const colors = avatarColor(getFullName(userObj));
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#2C3550" }}>
      <Text style={{ color: colors.text, fontSize: size * 0.36, fontWeight: "700" }}>{getInitials(userObj)}</Text>
    </View>
  );
}

/* ─── Role badge ────────────────────────────────────────────── */
function RolePill({ role, accent }: { role: string; accent?: string }) {
  const color = role === "admin" ? (accent ?? "#5865F2") : "#4A4A6A";
  return (
    <View style={{ backgroundColor: `${color}22`, borderColor: `${color}55`, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
      <Text style={{ color, fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>{role}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════ */
export default function ProjectsScreen() {
  const router = useRouter();
  const { user, activeWorkspace, projects, refreshProjects, activeProject, selectProject, themeColor, refreshWorkspaces } = useApp();

  /* ── create modal ── */
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#5865F2");
  const [creating, setCreating] = useState(false);

  /* ── manage modal ── */
  const [manageVisible, setManageVisible] = useState(false);
  const [selProject, setSelProject] = useState<any>(null);

  /* ── loading per-user ── */
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);

  /* ── search ── */
  const [query, setQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  /* ── profile modal ── */
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);

  /* ── cover image & milestones & progress ── */
  const [projectStats, setProjectStats] = useState<{[projId: string]: { completed: number; total: number }}>({});
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"members" | "milestones">("members");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [creatingMilestone, setCreatingMilestone] = useState(false);

  /* keep selProject fresh when projects refresh */
  useEffect(() => {
    if (selProject) {
      const fresh = projects.find((p: any) => p._id === selProject._id);
      if (fresh) setSelProject(fresh);
    }
  }, [projects]);

  /* fetch project task stats */
  useEffect(() => {
    const fetchAllStats = async () => {
      const statsMap: any = {};
      for (const proj of projects) {
        try {
          const res = await getProjectTasks(proj._id);
          if (res.success && res.tasks) {
            const total = res.tasks.length;
            const completed = res.tasks.filter((t) => t.status === "completed").length;
            statsMap[proj._id] = { completed, total };
          }
        } catch (e) {
          console.error("Failed to fetch project tasks stats:", e);
        }
      }
      setProjectStats(statsMap);
    };
    if (projects.length > 0) {
      fetchAllStats();
    }
  }, [projects]);

  /* fetch milestones when settings project or settingsTab changes */
  useEffect(() => {
    if (selProject && settingsTab === "milestones") {
      loadMilestones(selProject._id);
    }
  }, [selProject, settingsTab]);

  const loadMilestones = async (projId: string) => {
    setLoadingMilestones(true);
    try {
      const res = await getProjectMilestones(projId);
      if (res.success) {
        setMilestones(res.milestones);
      }
    } catch (e) {
      console.error("Failed to load milestones:", e);
    } finally {
      setLoadingMilestones(false);
    }
  };

  /* debounced global search */
  useEffect(() => {
    if (query.trim().length < 2) { setGlobalResults([]); return; }
    const t = setTimeout(doGlobalSearch, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function doGlobalSearch() {
    setSearching(true);
    try {
      const res = await searchUsers(query);
      if (res.success) {
        const wsIds = (activeWorkspace?.members ?? []).map((m: any) => getUserId(m.user));
        setGlobalResults((res.users as SearchUserResult[]).filter((u) => u._id !== user?._id && !wsIds.includes(u._id)));
      }
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }

  function openManage(project: any) {
    setSelProject(project);
    setQuery("");
    setGlobalResults([]);
    setSettingsTab("members");
    setManageVisible(true);
  }

  function closeManage() {
    setManageVisible(false);
    setQuery("");
    setGlobalResults([]);
  }

  /* ── workspace members not yet in project (filtered by search) ── */
  const availableWsMembers = (activeWorkspace?.members ?? []).filter((wm: any) => {
    const id = getUserId(wm.user);
    const alreadyIn = (selProject?.members ?? []).some((pm: any) => getUserId(pm.user) === id);
    if (alreadyIn) return false;
    if (query.trim() && typeof wm.user === "object") {
      const name = getFullName(wm.user).toLowerCase();
      const email = (wm.user.email ?? "").toLowerCase();
      return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase());
    }
    return true;
  });

  const isOwnerOfSelected = getProjectCreatorId(selProject) === user?._id;
  const wsMember = activeWorkspace?.members?.find((m: any) => getUserId(m.user) === user?._id);
  const isWorkspaceViewer = wsMember?.role === "viewer";
  const projMember = selProject?.members?.find((m: any) => getUserId(m.user) === user?._id);
  const isProjectViewer = projMember?.role === "viewer";
  const isViewer = isWorkspaceViewer || isProjectViewer;


  /* ══ HANDLERS ══════════════════════════════════════════════ */

  async function handleCreate() {
    if (!activeWorkspace || !newName.trim()) { Alert.alert("Required", "Project name is required."); return; }
    setCreating(true);
    try {
      const res = await createProject({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        workspace: activeWorkspace._id,
        color: newColor,
        coverImageUrl: newCoverUrl || undefined,
      });
      if (res.success) {
        setNewName(""); setNewDesc(""); setNewColor("#5865F2"); setNewCoverUrl("");
        setCreateVisible(false);
        await refreshProjects();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to create project.");
    } finally { setCreating(false); }
  }

  const pickCoverImage = async (isNewProject: boolean) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission denied", "Media library access required."); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setUploadingCover(true);
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append("file", {
          uri: Platform.OS === "ios" ? asset.uri.replace("file://", "") : asset.uri,
          name: asset.fileName || `cover_${Date.now()}.jpg`,
          type: "image/jpeg",
        } as any);

        const uploadRes = await uploadFile(formData);
        if (uploadRes.success) {
          if (isNewProject) {
            setNewCoverUrl(uploadRes.url);
          } else if (selProject) {
            const updateRes = await updateProject(selProject._id, {
              coverImageUrl: uploadRes.url,
            });
            if (updateRes.success) {
              setSelProject(updateRes.project);
              await refreshProjects();
              Alert.alert("Success", "Cover image updated successfully!");
            } else {
              Alert.alert("Error", "Failed to save cover image to project.");
            }
          }
        } else {
          Alert.alert("Error", "Cover image upload failed.");
        }
      }
    } catch (err: any) {
      console.error("Cover upload error:", err);
      Alert.alert("Error", err?.message || "Failed to upload cover.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (!newMilestoneTitle.trim() || !selProject) return;
    setCreatingMilestone(true);
    try {
      const res = await createMilestone({
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim(),
        project: selProject._id,
      });
      if (res.success) {
        setNewMilestoneTitle("");
        setNewMilestoneDesc("");
        await loadMilestones(selProject._id);
      }
    } catch (e) {
      console.error("Failed to create milestone:", e);
    } finally {
      setCreatingMilestone(false);
    }
  };

  const handleToggleMilestone = async (m: Milestone) => {
    if (!selProject) return;
    try {
      const res = await updateMilestone(m._id, {
        status: m.status === "active" ? "completed" : "active",
      });
      if (res.success) {
        await loadMilestones(selProject._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMilestone = async (mId: string) => {
    if (!selProject) return;
    try {
      const res = await deleteMilestone(mId);
      if (res.success) {
        await loadMilestones(selProject._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  async function handleDelete(projectId: string) {
    Alert.alert("Delete Project", "Permanently delete this project and all its tasks?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const res = await deleteProject(projectId);
          if (res.success) { closeManage(); await refreshProjects(); }
        } catch (err: any) { Alert.alert("Error", err?.response?.data?.message ?? "Failed."); }
      }},
    ]);
  }

  async function handleAddWsMember(memberId: string) {
    if (!selProject) return;
    setAddingId(memberId);
    try {
      const res = await addMemberToProject(selProject._id, memberId);
      if (res.success) {
        setSelProject(res.project);
        await refreshProjects();
      } else {
        Alert.alert("Error", "Could not add member.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to add member.");
    } finally { setAddingId(null); }
  }

  async function handleRemove(memberId: string) {
    if (!selProject) return;
    Alert.alert("Remove Member", "Remove this member from the project?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setRemovingId(memberId);
        try {
          const res = await removeMemberFromProject(selProject._id, memberId);
          if (res.success) { setSelProject(res.project); await refreshProjects(); }
          else Alert.alert("Error", "Could not remove member.");
        } catch (err: any) {
          Alert.alert("Error", err?.response?.data?.message ?? "Failed.");
        } finally { setRemovingId(null); }
      }},
    ]);
  }

  async function handleRoleToggle(memberId: string, currentRole: string) {
    if (!selProject) return;
    const newRole = currentRole === "admin" ? "member" : "admin";
    Alert.alert("Change Role", `${newRole === "admin" ? "Promote to Admin" : "Demote to Member"}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        setRoleId(memberId);
        try {
          const res = await changeProjectRole(selProject._id, memberId, newRole);
          if (res.success) { setSelProject(res.project); await refreshProjects(); }
          else Alert.alert("Error", "Could not change role.");
        } catch (err: any) {
          Alert.alert("Error", err?.response?.data?.message ?? "Failed.");
        } finally { setRoleId(null); }
      }},
    ]);
  }

  async function handleInviteAndAdd(targetUser: SearchUserResult) {
    if (!activeWorkspace || !selProject) return;
    Alert.alert("Invite & Add", `Add ${getFullName({ username: targetUser.username })} to workspace and project?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Invite & Add", onPress: async () => {
        setInviteId(targetUser._id);
        try {
          const inv = await addMemberToWorkspace(activeWorkspace._id, targetUser._id);
          if (!inv.success) throw new Error("Workspace invite failed");
          const add = await addMemberToProject(selProject._id, targetUser._id);
          if (add.success) {
            setSelProject(add.project);
            setQuery(""); setGlobalResults([]);
            await refreshWorkspaces(); await refreshProjects();
            Alert.alert("Done", "User added to workspace and project.");
          } else {
            Alert.alert("Partial", "Added to workspace but failed to add to project.");
            await refreshWorkspaces();
          }
        } catch (err: any) {
          Alert.alert("Error", err?.response?.data?.message ?? "Something went wrong.");
        } finally { setInviteId(null); }
      }},
    ]);
  }

  /* ══ NO WORKSPACE STATE ══════════════════════════════════════ */
  if (!activeWorkspace) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F19", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📁</Text>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" }}>No Workspace Selected</Text>
        <Text style={{ color: "#9B9BAE", fontSize: 14, textAlign: "center", marginTop: 8 }}>
          Select or create a workspace on the dashboard to view projects.
        </Text>
      </SafeAreaView>
    );
  }

  /* ══ MAIN RENDER ═════════════════════════════════════════════ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F1117" }}>

      {/* ── TOP HEADER ── */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#0F1117", borderBottomWidth: 1, borderBottomColor: "#1E2130" }}>
        <View>
          <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Workspace</Text>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 1 }}>{activeWorkspace.name}</Text>
        </View>
        {!isWorkspaceViewer && (
          <TouchableOpacity
            onPress={() => setCreateVisible(true)}
            style={{ backgroundColor: themeColor, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ color: "#0C101B", fontWeight: "800", fontSize: 14 }}>+ New Project</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── PROJECT LIST ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {projects.length === 0 ? (
          <View style={{ backgroundColor: "#161922", borderRadius: 20, padding: 40, alignItems: "center", marginTop: 16, borderWidth: 1, borderColor: "#1E2130" }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📁</Text>
            <Text style={{ color: "#9B9BAE", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              No projects yet.{"\n"}
              <Text style={{ color: themeColor, fontWeight: "700" }}>Tap + New Project</Text> to create one.
            </Text>
          </View>
        ) : projects.map((project: any) => {
          const isActive = activeProject?._id === project._id;
          const color = project.color || themeColor;
          const isOwner = getProjectCreatorId(project) === user?._id;

          const stats = projectStats[project._id] || { completed: 0, total: 0 };
          const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

          return (
            <View
              key={project._id}
              style={{ backgroundColor: "#161922", borderRadius: 18, marginBottom: 14, borderWidth: 1.5, borderColor: isActive ? color : "#1E2130", overflow: "hidden", position: "relative" }}
            >
              <View style={{ height: 50, position: "relative" }}>
                {project.coverImageUrl ? (
                  <Image source={{ uri: project.coverImageUrl }} style={{ width: "100%", height: 50 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: "100%", height: 50, backgroundColor: color }} />
                )}
              </View>

              {/* Overlapping Notion/Linear-style circular icon badge */}
              <View
                style={{
                  position: "absolute",
                  top: 32,
                  left: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#161922",
                  borderWidth: 1.5,
                  borderColor: isActive ? color : "#1E2130",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                <Ionicons name="briefcase" size={14} color={color} />
              </View>

              <View style={{ padding: 16, paddingTop: 20 }}>
                {/* Project name + active badge */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800", flex: 1, marginRight: 8 }}>{project.name}</Text>
                  {isActive && (
                    <View style={{ backgroundColor: `${color}25`, borderColor: `${color}60`, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>Active</Text>
                    </View>
                  )}
                  {isOwner && !isActive && (
                    <View style={{ backgroundColor: "#1E2130", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: "#6B7280", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>Owner</Text>
                    </View>
                  )}
                </View>

                {!!project.description && (
                  <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18, marginBottom: 10 }}>{project.description}</Text>
                )}

                {/* Progress bar */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "600" }}>PROGRESS ({stats.completed}/{stats.total})</Text>
                    <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{progress}%</Text>
                  </View>
                  <View style={{ height: 6, width: "100%", backgroundColor: "#10121A", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${progress}%`, backgroundColor: color, borderRadius: 3 }} />
                  </View>
                </View>

                {/* Member avatars row */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", marginRight: 8 }}>
                    {project.members.slice(0, 5).map((m: any, i: number) => (
                      <View key={i} style={{ marginLeft: i === 0 ? 0 : -8, borderWidth: 2, borderColor: "#161922", borderRadius: 20 }}>
                        {typeof m.user === "object"
                          ? <Avatar userObj={m.user} size={30} />
                          : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#1E2130", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#6B7280", fontSize: 11 }}>?</Text></View>
                        }
                      </View>
                    ))}
                  </View>
                  <Text style={{ color: "#6B7280", fontSize: 12 }}>
                    {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                {/* ── ACTION BUTTONS — always visible for everyone ── */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {/* ADD MEMBER button — visible to ALL */}
                  <TouchableOpacity
                    onPress={() => openManage(project)}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#1E2130", borderWidth: 1, borderColor: "#2A2D3E", paddingVertical: 10, borderRadius: 12 }}
                  >
                    <Text style={{ fontSize: 14 }}>👥</Text>
                    <Text style={{ color: "#C9D1E0", fontSize: 13, fontWeight: "700" }}>Add Member</Text>
                  </TouchableOpacity>

                  {/* OPEN BOARD button */}
                  <TouchableOpacity
                    onPress={() => { selectProject(project); router.push("/(tabs)/tasks"); }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: color, paddingVertical: 10, borderRadius: 12 }}
                  >
                    <Text style={{ color: "#0C101B", fontSize: 13, fontWeight: "800" }}>Open Board →</Text>
                  </TouchableOpacity>
                </View>

                {/* Settings row (owner only) */}
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => openManage(project)}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: "#0F1117", borderWidth: 1, borderColor: "#1E2130" }}
                  >
                    <Text style={{ fontSize: 13 }}>⚙️</Text>
                    <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "600" }}>Project Settings & Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════
          MODAL 1 ── CREATE PROJECT
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setCreateVisible(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: "#161922", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: "#1E2130", padding: 24, paddingBottom: 40 }}>
              {/* handle */}
              <View style={{ width: 40, height: 4, backgroundColor: "#2A2D3E", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 20 }}>Create New Project</Text>

              <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "600", marginBottom: 6 }}>PROJECT NAME *</Text>
              <View style={{ backgroundColor: "#0F1117", borderRadius: 14, borderWidth: 1, borderColor: "#2A2D3E", paddingHorizontal: 14, marginBottom: 14 }}>
                <TextInput style={{ color: "#fff", fontSize: 15, paddingVertical: 13 }} placeholder="e.g. Mobile App, Website Redesign" placeholderTextColor="#3A3D4E" value={newName} onChangeText={setNewName} />
              </View>

              <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "600", marginBottom: 6 }}>DESCRIPTION</Text>
              <View style={{ backgroundColor: "#0F1117", borderRadius: 14, borderWidth: 1, borderColor: "#2A2D3E", paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20, minHeight: 80 }}>
                <TextInput style={{ color: "#fff", fontSize: 15, textAlignVertical: "top" }} placeholder="What is this project about?" placeholderTextColor="#3A3D4E" value={newDesc} onChangeText={setNewDesc} multiline numberOfLines={3} />
              </View>

              <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "600", marginBottom: 12 }}>ACCENT COLOR</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 20 }}>
                {PROJECT_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setNewColor(c)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c, alignItems: "center", justifyContent: "center", borderWidth: newColor === c ? 3 : 0, borderColor: "#fff", transform: [{ scale: newColor === c ? 1.15 : 1 }] }}>
                    {newColor === c && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.35)" }} />}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>PROJECT BANNER (COVER IMAGE)</Text>
              <TouchableOpacity
                onPress={() => pickCoverImage(true)}
                style={{
                  backgroundColor: "#0F1117",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#2A2D3E",
                  padding: newCoverUrl ? 0 : 16,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 28,
                  height: 90,
                  overflow: "hidden",
                }}
              >
                {newCoverUrl ? (
                  <Image source={{ uri: newCoverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: "#9B9BAE", fontSize: 13, fontWeight: "600" }}>
                    {uploadingCover ? "Uploading banner..." : "Select Banner Image"}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={() => setCreateVisible(false)} style={{ flex: 1, backgroundColor: "#0F1117", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#2A2D3E" }}>
                  <Text style={{ color: "#9B9BAE", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} disabled={creating} style={{ flex: 1, backgroundColor: themeColor, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
                  {creating ? <ActivityIndicator color="#0C101B" /> : <Text style={{ color: "#0C101B", fontWeight: "800", fontSize: 15 }}>Create Project</Text>}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      {/* ══════════════════════════════════════════════════════════
          MODAL 2 ── MANAGE PROJECT (Members + Settings)
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={manageVisible} transparent animationType="slide" onRequestClose={closeManage}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "#161922", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: "#1E2130", maxHeight: "92%", paddingBottom: 36 }}>
              {/* handle */}
              <View style={{ alignItems: "center", paddingTop: 14, paddingBottom: 6 }}>
                <View style={{ width: 40, height: 4, backgroundColor: "#2A2D3E", borderRadius: 2 }} />
              </View>

              {/* Modal header */}
              <View style={{ paddingHorizontal: 22, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E2130" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selProject?.color ?? themeColor }} />
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 }} numberOfLines={1}>{selProject?.name ?? "Project"}</Text>
                </View>
                <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 3 }}>Members & Settings</Text>
              </View>

              {/* Settings Tab Toggles */}
              <View style={{ flexDirection: "row", paddingHorizontal: 22, paddingTop: 14, gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setSettingsTab("members")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: settingsTab === "members" ? (selProject?.color ?? themeColor) : "#1E2130"
                  }}
                >
                  <Text style={{ color: settingsTab === "members" ? "#0F1117" : "#C9D1E0", fontSize: 12, fontWeight: "700" }}>Members</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSettingsTab("milestones")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: settingsTab === "milestones" ? (selProject?.color ?? themeColor) : "#1E2130"
                  }}
                >
                  <Text style={{ color: settingsTab === "milestones" ? "#0F1117" : "#C9D1E0", fontSize: 12, fontWeight: "700" }}>Milestones</Text>
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: 12 }}>

                {settingsTab === "members" && (
                  <>
                    {/* ── CURRENT MEMBERS ── */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
                        Current Members
                      </Text>
                      <View style={{ backgroundColor: "#1E2130", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "700" }}>{selProject?.members?.length ?? 0} total</Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: "#0F1117", borderRadius: 16, borderWidth: 1, borderColor: "#1E2130", overflow: "hidden", marginBottom: 24 }}>
                      {(selProject?.members ?? []).length === 0 && (
                        <View style={{ padding: 20, alignItems: "center" }}>
                          <Text style={{ color: "#6B7280", fontSize: 13 }}>No members yet.</Text>
                        </View>
                      )}
                      {(selProject?.members ?? []).map((m: any, idx: number) => {
                        const uObj = typeof m.user === "object" ? m.user : null;
                        const mId = getUserId(m.user);
                        const isMe = mId === user?._id;
                        const isCreator = mId === getProjectCreatorId(selProject);
                        const canManage = isOwnerOfSelected && !isMe;
                        const color = selProject?.color ?? themeColor;

                        return (
                          <View key={mId ?? idx} style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: idx < (selProject?.members?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: "#161922" }}>
                            <TouchableOpacity
                              onPress={() => uObj && (setProfileUser(uObj), setProfileVisible(true))}
                              style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                              activeOpacity={uObj ? 0.6 : 1}
                            >
                              {uObj ? <Avatar userObj={uObj} size={40} /> : (
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E2130", alignItems: "center", justifyContent: "center" }}>
                                  <Text style={{ color: "#6B7280" }}>?</Text>
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{uObj ? getFullName(uObj) : "Unknown"}</Text>
                                  {isCreator && <View style={{ backgroundColor: `${color}22`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color, fontSize: 9, fontWeight: "800" }}>OWNER</Text></View>}
                                  {isMe && <View style={{ backgroundColor: "#1E2130", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: "#6B7280", fontSize: 9, fontWeight: "800" }}>YOU</Text></View>}
                                </View>
                                <Text style={{ color: "#4A4A6A", fontSize: 11, marginTop: 1 }}>{uObj?.email ?? ""}</Text>
                              </View>
                              <RolePill role={m.role} accent={color} />
                            </TouchableOpacity>

                            {canManage && (
                              <View style={{ flexDirection: "row", gap: 6, marginLeft: 8 }}>
                                <TouchableOpacity
                                  onPress={() => handleRoleToggle(mId, m.role)}
                                  disabled={roleId === mId}
                                  style={{ backgroundColor: "#1E2130", borderWidth: 1, borderColor: "#2A2D3E", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                >
                                  {roleId === mId
                                    ? <ActivityIndicator size="small" color="#9B9BAE" />
                                    : <Text style={{ color: "#9B9BAE", fontSize: 11, fontWeight: "700" }}>{m.role === "admin" ? "⬇ Demote" : "⬆ Promote"}</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleRemove(mId)}
                                  disabled={removingId === mId}
                                  style={{ backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                >
                                  {removingId === mId
                                    ? <ActivityIndicator size="small" color="#ef4444" />
                                    : <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "700" }}>Remove</Text>}
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {!isViewer && (
                      <>
                        {/* ── ADD MEMBER SECTION ── */}
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 4 }}>Add Members</Text>
                        <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 14 }}>
                          Search workspace members below. Type 2+ characters to search all users globally.
                        </Text>

                        {/* Search box */}
                        <View style={{ backgroundColor: "#0F1117", borderRadius: 14, borderWidth: 1, borderColor: "#2A2D3E", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 18 }}>
                          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                          <TextInput
                            style={{ flex: 1, color: "#fff", fontSize: 14, paddingVertical: 13 }}
                            placeholder="Search by name or email..."
                            placeholderTextColor="#3A3D4E"
                            value={query}
                            onChangeText={setQuery}
                            autoCorrect={false}
                            autoCapitalize="none"
                          />
                          {searching && <ActivityIndicator size="small" color={themeColor} />}
                          {query.length > 0 && !searching && (
                            <TouchableOpacity onPress={() => { setQuery(""); setGlobalResults([]); }}>
                              <Text style={{ color: "#6B7280", fontSize: 20, lineHeight: 22 }}>×</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* ── Workspace members list ── */}
                        <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                          From This Workspace
                        </Text>

                        <View style={{ backgroundColor: "#0F1117", borderRadius: 16, borderWidth: 1, borderColor: "#1E2130", overflow: "hidden", marginBottom: 20 }}>
                          {availableWsMembers.length === 0 ? (
                            <View style={{ padding: 20, alignItems: "center" }}>
                              <Text style={{ color: "#6B7280", fontSize: 13, textAlign: "center" }}>
                                {query.trim()
                                  ? "No workspace members match your search."
                                  : "All workspace members are already in this project."}
                              </Text>
                            </View>
                          ) : availableWsMembers.map((wm: any, idx: number) => {
                            const uObj = typeof wm.user === "object" ? wm.user : null;
                            const wmId = getUserId(wm.user);
                            const loading = addingId === wmId;
                            const color = selProject?.color ?? themeColor;

                            return (
                              <View key={wmId ?? idx} style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: idx < availableWsMembers.length - 1 ? 1 : 0, borderBottomColor: "#161922" }}>
                                <TouchableOpacity onPress={() => uObj && (setProfileUser(uObj), setProfileVisible(true))} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }} activeOpacity={uObj ? 0.6 : 1}>
                                  {uObj ? <Avatar userObj={uObj} size={40} /> : (
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E2130", alignItems: "center", justifyContent: "center" }}>
                                      <Text style={{ color: "#6B7280" }}>?</Text>
                                    </View>
                                  )}
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{uObj ? getFullName(uObj) : "Unknown"}</Text>
                                    <Text style={{ color: "#4A4A6A", fontSize: 11, marginTop: 1 }}>{uObj?.email ?? ""}</Text>
                                  </View>
                                </TouchableOpacity>

                                {/* ✅ ADD BUTTON — clearly visible */}
                                <TouchableOpacity
                                  onPress={() => handleAddWsMember(wmId)}
                                  disabled={loading}
                                  style={{ backgroundColor: "#1E2130", borderWidth: 1.5, borderColor: color, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 5 }}
                                >
                                  {loading
                                    ? <ActivityIndicator size="small" color={color} />
                                    : <>
                                      <Text style={{ fontSize: 12 }}>✉️</Text>
                                      <Text style={{ color, fontSize: 12, fontWeight: "800" }}>Invite</Text>
                                    </>}
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </>
                )}

                {settingsTab === "milestones" && (
                  <View style={{ gap: 20, marginBottom: 20 }}>
                    {/* ── COVER IMAGE SECTION ── */}
                    <View>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 10 }}>Cover Image Banner</Text>
                      <View style={{ backgroundColor: "#0F1117", borderRadius: 16, borderWidth: 1, borderColor: "#1E2130", overflow: "hidden", position: "relative" }}>
                        {selProject?.coverImageUrl ? (
                          <Image source={{ uri: selProject.coverImageUrl }} style={{ width: "100%", height: 110 }} resizeMode="cover" />
                        ) : (
                          <View style={{ width: "100%", height: 110, backgroundColor: "#161922", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color: "#4A4A6A", fontSize: 13 }}>No cover image banner set</Text>
                          </View>
                        )}
                        {!isViewer && (
                          <TouchableOpacity
                            onPress={() => pickCoverImage(false)}
                            disabled={uploadingCover}
                            style={{
                              position: "absolute",
                              bottom: 10,
                              right: 10,
                              backgroundColor: "rgba(15,17,23,0.8)",
                              borderWidth: 1,
                              borderColor: "#2A2D3E",
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6
                            }}
                          >
                            {uploadingCover ? (
                              <ActivityIndicator size="small" color={selProject?.color ?? themeColor} />
                            ) : (
                              <>
                                <Text style={{ color: "#fff", fontSize: 11 }}>📷</Text>
                                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                                  {selProject?.coverImageUrl ? "Change Cover" : "Upload Cover"}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* ── MILESTONES LIST SECTION ── */}
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Milestones</Text>
                        {loadingMilestones && <ActivityIndicator size="small" color={selProject?.color ?? themeColor} />}
                      </View>

                      {loadingMilestones ? (
                        <View style={{ padding: 20, alignItems: "center" }}>
                          <ActivityIndicator size="small" color={selProject?.color ?? themeColor} />
                        </View>
                      ) : milestones.length === 0 ? (
                        <View style={{ backgroundColor: "#0F1117", borderRadius: 16, borderWidth: 1, borderColor: "#1E2130", padding: 20, alignItems: "center" }}>
                          <Text style={{ color: "#6B7280", fontSize: 13 }}>No milestones set for this project.</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {milestones.map((m) => (
                            <View
                              key={m._id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#0F1117",
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: m.status === "completed" ? "rgba(194,241,147,0.15)" : "#1E2130",
                                padding: 14,
                                gap: 12
                              }}
                            >
                              <TouchableOpacity
                                onPress={() => !isViewer && handleToggleMilestone(m)}
                                disabled={isViewer}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 6,
                                  borderWidth: 2,
                                  borderColor: m.status === "completed" ? themeColor : "#4A4A6A",
                                  backgroundColor: m.status === "completed" ? themeColor : "transparent",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                {m.status === "completed" && <Text style={{ color: "#0F1117", fontSize: 11, fontWeight: "bold" }}>✓</Text>}
                              </TouchableOpacity>

                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    color: m.status === "completed" ? "#6B7280" : "#fff",
                                    fontSize: 14,
                                    fontWeight: "700",
                                    textDecorationLine: m.status === "completed" ? "line-through" : "none"
                                  }}
                                >
                                  {m.title}
                                </Text>
                                {m.description ? (
                                  <Text style={{ color: "#4A4A6A", fontSize: 12, marginTop: 2 }}>{m.description}</Text>
                                ) : null}
                              </View>

                              {!isViewer && (
                                <TouchableOpacity
                                  onPress={() => handleDeleteMilestone(m._id)}
                                  style={{ padding: 4 }}
                                >
                                  <Text style={{ color: "#ef4444", fontSize: 16 }}>×</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* ── CREATE MILESTONE SECTION ── */}
                    {!isViewer && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 12 }}>Create Milestone</Text>
                        
                        <View style={{ backgroundColor: "#0F1117", borderRadius: 16, borderWidth: 1, borderColor: "#1E2130", padding: 16, gap: 12 }}>
                          <TextInput
                            style={{
                              backgroundColor: "#161922",
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: "#2A2D3E",
                              color: "#fff",
                              fontSize: 14,
                              paddingHorizontal: 14,
                              paddingVertical: 12
                            }}
                            placeholder="Milestone Title..."
                            placeholderTextColor="#3A3D4E"
                            value={newMilestoneTitle}
                            onChangeText={setNewMilestoneTitle}
                          />

                          <TextInput
                            style={{
                              backgroundColor: "#161922",
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: "#2A2D3E",
                              color: "#fff",
                              fontSize: 14,
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              minHeight: 60,
                              textAlignVertical: "top"
                            }}
                            placeholder="Milestone Description (optional)..."
                            placeholderTextColor="#3A3D4E"
                            value={newMilestoneDesc}
                            onChangeText={setNewMilestoneDesc}
                            multiline
                          />

                          <TouchableOpacity
                            onPress={handleCreateMilestone}
                            disabled={creatingMilestone || !newMilestoneTitle.trim()}
                            style={{
                              backgroundColor: newMilestoneTitle.trim() ? (selProject?.color ?? themeColor) : "#1E2130",
                              paddingVertical: 14,
                              borderRadius: 12,
                              alignItems: "center"
                            }}
                          >
                            {creatingMilestone ? (
                              <ActivityIndicator size="small" color="#0F1117" />
                            ) : (
                              <Text
                                style={{
                                  color: newMilestoneTitle.trim() ? "#0F1117" : "#4A4A6A",
                                  fontWeight: "800",
                                  fontSize: 14
                                }}
                              >
                                Create Milestone
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* ── Delete project (owner only) ── */}
                {isOwnerOfSelected && !isViewer && (
                  <>
                    <View style={{ height: 1, backgroundColor: "#1E2130", marginVertical: 6, marginBottom: 18 }} />
                    <TouchableOpacity
                      onPress={() => handleDelete(selProject._id)}
                      style={{ backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1.5, borderColor: "rgba(239,68,68,0.3)", paddingVertical: 15, borderRadius: 16, alignItems: "center", marginBottom: 10 }}
                    >
                      <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 14 }}>🗑  Delete Project</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* ── Close ── */}
                <TouchableOpacity
                  onPress={closeManage}
                  style={{ backgroundColor: "#1E2130", borderWidth: 1, borderColor: "#2A2D3E", paddingVertical: 14, borderRadius: 16, alignItems: "center" }}
                >
                  <Text style={{ color: "#9B9BAE", fontWeight: "700", fontSize: 14 }}>Close</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MODAL 3 ── USER PROFILE
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setProfileVisible(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <TouchableOpacity activeOpacity={1} style={{ width: "100%", backgroundColor: "#161922", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#1E2130" }}>

            <View style={{ alignItems: "center", marginBottom: 20 }}>
              {profileUser && <Avatar userObj={profileUser} size={72} />}
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 12 }}>{profileUser ? getFullName(profileUser) : "User"}</Text>
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 3 }}>{profileUser?.email ?? ""}</Text>
              {profileUser && (() => {
                const wm = (activeWorkspace?.members ?? []).find((m: any) => getUserId(m.user) === profileUser._id);
                return wm ? (
                  <View style={{ backgroundColor: "#1E2130", borderWidth: 1, borderColor: "#2A2D3E", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 }}>
                    <Text style={{ color: "#9B9BAE", fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>Workspace {wm.role}</Text>
                  </View>
                ) : null;
              })()}
            </View>

            <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              Projects ({projects.filter((p: any) => p.members.some((m: any) => getUserId(m.user) === profileUser?._id)).length})
            </Text>

            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {projects
                .filter((p: any) => p.members.some((m: any) => getUserId(m.user) === profileUser?._id))
                .map((proj: any) => {
                  const role = proj.members.find((m: any) => getUserId(m.user) === profileUser?._id)?.role ?? "member";
                  return (
                    <View key={proj._id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0F1117", borderWidth: 1, borderColor: "#1E2130", padding: 12, borderRadius: 12, marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: proj.color ?? themeColor }} />
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{proj.name}</Text>
                      </View>
                      <RolePill role={role} accent={proj.color ?? themeColor} />
                    </View>
                  );
                })}
            </ScrollView>

            <TouchableOpacity onPress={() => setProfileVisible(false)} style={{ backgroundColor: "#1E2130", borderWidth: 1, borderColor: "#2A2D3E", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 16 }}>
              <Text style={{ color: "#9B9BAE", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}