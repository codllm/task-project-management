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
  Pressable,
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
import { ConfirmDialog, ConfirmDialogAction } from "../../components/ConfirmDialog";
import { createUploadFormData } from "../../utils/uploadFormData";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  bg: "#0D1117",
  surface: "#161B22",
  card: "#161B22",
  cardAlt: "#1A1F28",

  // Borders
  cardBorder: "#30363D",
  border: "#30363D",
  borderLight: "#3A424D",

  // Typography
  textPrimary: "#F0F6FC",
  textSecondary: "#C9D1D9",
  textMuted: "#8B949E",

  // Accent
  accent: "#5E6AD2",
  onAccent: "#FFFFFF",
  accentBg: "rgba(94,106,210,0.12)",
  accentBorder: "rgba(94,106,210,0.30)",

  // Danger
  danger: "#F85149",
  dangerBg: "rgba(248,81,73,0.08)",
  dangerBorder: "rgba(248,81,73,0.18)",

  // Success
  done: "#3FB950",
};

const PROJECT_COLORS = [
  "#5E6AD2", // Linear Purple
  "#58A6FF", // Blue
  "#3FB950", // Green
  "#F85149", // Red
  "#A371F7", // Violet
  "#DB61A2", // Rose
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  { bg: "#1E2E4A", text: "#85ACF2" },
  { bg: "#1A2E24", text: "#5DCAA5" },
  { bg: "#2E1A28", text: "#E093C0" },
  { bg: "#2A2010", text: "#EF9F27" },
  { bg: "#2E1A1A", text: "#F0827E" },
];

const avatarColor = (seed?: string) => {
  if (!seed) return AVATAR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ userObj, size = 36 }: { userObj: any; size?: number }) {
  const colors = avatarColor(getFullName(userObj));
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.text, fontSize: size * 0.35, fontWeight: "700" }}>{getInitials(userObj)}</Text>
    </View>
  );
}

function RolePill({ role, accent }: { role: string; accent?: string }) {
  const isElevated = role === "admin" || role === "owner";
  const color = isElevated ? (accent ?? C.accent) : C.textMuted;
  return (
    <View style={{ backgroundColor: isElevated ? `${color}20` : C.cardAlt, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 }}>{role}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 16 }} />;
}

function SLabel({ text }: { text: string }) {
  return <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>{text}</Text>;
}

/* ══════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════ */
export default function ProjectsScreen() {
  const router = useRouter();
  const { user, activeWorkspace, projects, refreshProjects, activeProject, selectProject, themeColor, refreshWorkspaces } = useApp();

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(C.accent);
  const [creating, setCreating] = useState(false);

  const [manageVisible, setManageVisible] = useState(false);
  const [selProject, setSelProject] = useState<any>(null);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [profileVisible, setProfileVisible] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);

  const [projectStats, setProjectStats] = useState<{ [projId: string]: { completed: number; total: number } }>({});
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"members" | "milestones">("members");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [creatingMilestone, setCreatingMilestone] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message?: string;
    actions: ConfirmDialogAction[];
  } | null>(null);

  useEffect(() => {
    if (selProject) {
      const fresh = projects.find((p: any) => p._id === selProject._id);
      if (fresh) setSelProject(fresh);
    }
  }, [projects]);

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
        } catch (e) { console.error("Failed to fetch project tasks stats:", e); }
      }
      setProjectStats(statsMap);
    };
    if (projects.length > 0) fetchAllStats();
  }, [projects]);

  useEffect(() => {
    if (selProject && settingsTab === "milestones") {
      loadMilestones(selProject._id);
    }
  }, [selProject, settingsTab]);

  const loadMilestones = async (projId: string) => {
    setLoadingMilestones(true);
    try {
      const res = await getProjectMilestones(projId);
      if (res.success) setMilestones(res.milestones);
    } catch (e) { console.error("Failed to load milestones:", e); }
    finally { setLoadingMilestones(false); }
  };

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

  /* ══ HANDLERS (all identical to original) ══════════════════ */

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
        setNewName(""); setNewDesc(""); setNewColor(C.accent); setNewCoverUrl("");
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [3, 1], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setUploadingCover(true);
        const asset = result.assets[0];
        const formData = await createUploadFormData({
          uri: asset.uri,
          name: asset.fileName || `cover_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
        const uploadRes = await uploadFile(formData);
        if (uploadRes.success) {
          if (isNewProject) {
            setNewCoverUrl(uploadRes.url);
          } else if (selProject) {
            const updateRes = await updateProject(selProject._id, { coverImageUrl: uploadRes.url });
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
    } finally { setUploadingCover(false); }
  };

  const handleCreateMilestone = async () => {
    if (!newMilestoneTitle.trim() || !selProject) return;
    setCreatingMilestone(true);
    try {
      const res = await createMilestone({ title: newMilestoneTitle.trim(), description: newMilestoneDesc.trim(), project: selProject._id });
      if (res.success) { setNewMilestoneTitle(""); setNewMilestoneDesc(""); await loadMilestones(selProject._id); }
    } catch (e) { console.error("Failed to create milestone:", e); }
    finally { setCreatingMilestone(false); }
  };

  const handleToggleMilestone = async (m: Milestone) => {
    if (!selProject) return;
    try {
      const res = await updateMilestone(m._id, { status: m.status === "active" ? "completed" : "active" });
      if (res.success) await loadMilestones(selProject._id);
    } catch (e) { console.error(e); }
  };

  const handleDeleteMilestone = async (mId: string) => {
    if (!selProject) return;
    try {
      const res = await deleteMilestone(mId);
      if (res.success) await loadMilestones(selProject._id);
    } catch (e) { console.error(e); }
  };

  async function handleDelete(projectId: string) {
    setConfirmDialog({
      title: "Delete Project",
      message: "Permanently delete this project and all its tasks?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteProject(projectId);
              if (res.success) { closeManage(); await refreshProjects(); }
            } catch (err: any) { Alert.alert("Error", err?.response?.data?.message ?? "Failed."); }
          },
        },
      ],
    });
  }

  async function handleAddWsMember(memberId: string) {
    if (!selProject) return;
    setAddingId(memberId);
    try {
      const res = await addMemberToProject(selProject._id, memberId);
      if (res.success) { setSelProject(res.project); await refreshProjects(); }
      else Alert.alert("Error", "Could not add member.");
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message ?? "Failed to add member."); }
    finally { setAddingId(null); }
  }

  async function handleRemove(memberId: string) {
    if (!selProject) return;
    const projectId = selProject._id;
    setConfirmDialog({
      title: "Remove Member",
      message: "Remove this member from the project?",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingId(memberId);
            try {
              const res = await removeMemberFromProject(projectId, memberId);
              if (res.success) { setSelProject(res.project); await refreshProjects(); }
              else Alert.alert("Error", "Could not remove member.");
            } catch (err: any) { Alert.alert("Error", err?.response?.data?.message ?? "Failed."); }
            finally { setRemovingId(null); }
          },
        },
      ],
    });
  }

  async function handleRoleToggle(memberId: string, currentRole: string) {
    if (!selProject) return;
    const newRole = currentRole === "admin" ? "member" : "admin";
    const projectId = selProject._id;
    setConfirmDialog({
      title: "Change Role",
      message: `${newRole === "admin" ? "Promote to Admin" : "Demote to Member"}?`,
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setRoleId(memberId);
            try {
              const res = await changeProjectRole(projectId, memberId, newRole);
              if (res.success) { setSelProject(res.project); await refreshProjects(); }
              else Alert.alert("Error", "Could not change role.");
            } catch (err: any) { Alert.alert("Error", err?.response?.data?.message ?? "Failed."); }
            finally { setRoleId(null); }
          },
        },
      ],
    });
  }

  async function handleInviteAndAdd(targetUser: SearchUserResult) {
    if (!activeWorkspace || !selProject) return;
    const workspaceId = activeWorkspace._id;
    const projectId = selProject._id;
    setConfirmDialog({
      title: "Invite & Add",
      message: `Add ${getFullName({ username: targetUser.username })} to workspace and project?`,
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Invite & Add",
          onPress: async () => {
            setInviteId(targetUser._id);
            try {
              const inv = await addMemberToWorkspace(workspaceId, targetUser._id);
              if (!inv.success) throw new Error("Workspace invite failed");
              const add = await addMemberToProject(projectId, targetUser._id);
              if (add.success) {
                setSelProject(add.project);
                setQuery(""); setGlobalResults([]);
                await refreshWorkspaces(); await refreshProjects();
                Alert.alert("Done", "Workspace invitation sent and user added to project.");
              } else {
                Alert.alert("Partial", "Added to workspace but failed to add to project.");
                await refreshWorkspaces();
              }
            } catch (err: any) { Alert.alert("Error", err?.response?.data?.message ?? "Something went wrong."); }
            finally { setInviteId(null); }
          },
        },
      ],
    });
  }

  /* ══ NO WORKSPACE STATE ═══════════════════════════════════════ */
  if (!activeWorkspace) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Ionicons name="folder-outline" size={52} color={C.textMuted} style={{ marginBottom: 16 }} />
        <Text style={{ color: C.textPrimary, fontSize: 20, fontWeight: "700", textAlign: "center" }}>No Workspace Selected</Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
          Select or create a workspace on the dashboard to view projects.
        </Text>
      </SafeAreaView>
    );
  }

  /* ══ MAIN RENDER ══════════════════════════════════════════════ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>

      {/* ── HEADER ── */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.card }}>
        <View>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: "700" }}>{activeWorkspace.name}</Text>
        </View>
        {!isWorkspaceViewer && (
          <TouchableOpacity
            onPress={() => setCreateVisible(true)}
            style={{ backgroundColor: "#6366F1", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 5 }}
          >
            <Ionicons name="add" size={16} color={C.onAccent} />
            <Text style={{ color: C.onAccent, fontWeight: "700", fontSize: 13 }}>New Project</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── PROJECT LIST ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 48 }}>
        {projects.length === 0 ? (
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 40, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: C.cardBorder }}>
            <Ionicons name="folder-open-outline" size={38} color={C.textMuted} style={{ marginBottom: 14 }} />
            <Text style={{ color: C.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 }}>
              No projects yet.{"\n"}

            </Text>
          </View>
        ) : projects.map((project: any) => {
          const isActive = activeProject?._id === project._id;
          const color = project.color || themeColor;
          const isOwner = getProjectCreatorId(project) === user?._id;
          const stats = projectStats[project._id] || { completed: 0, total: 0 };
          const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

          return (
            <View key={project._id} style={{ backgroundColor: C.card, borderRadius: 20, marginBottom: 14, borderWidth: 1.5, borderColor: isActive ? color : C.cardBorder, overflow: "hidden" }}>
              {/* Tinted banner */}
              <View style={{ height: 58, position: "relative" }}>
                {project.coverImageUrl ? (
                  <Image source={{ uri: project.coverImageUrl }} style={{ width: "100%", height: 58 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: "100%", height: 58, backgroundColor: `${color}22` }} />
                )}
                {isActive ? (
                  <View style={{ position: "absolute", top: 9, right: 11, backgroundColor: `${color}25`, borderWidth: 1, borderColor: `${color}50`, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 }}>
                    <Text style={{ color, fontSize: 9, fontWeight: "800", textTransform: "uppercase" }}>Active</Text>
                  </View>
                ) : isOwner ? (
                  <View style={{ position: "absolute", top: 9, right: 11, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" }}>Owner</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ padding: 14 }}>
                {/* Name row with icon */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}35`, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="briefcase-outline" size={14} color={color} />
                  </View>
                  <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: "700", flex: 1 }}>{project.name}</Text>
                </View>

                {!!project.description && (
                  <Text style={{ color: C.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>{project.description}</Text>
                )}

                {/* Progress */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: "700" }}>{stats.completed} / {stats.total} tasks</Text>
                    <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{progress}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: C.bg, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${progress}%`, backgroundColor: color, borderRadius: 2 }} />
                  </View>
                </View>

                {/* Avatar stack */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", marginRight: 8 }}>
                    {project.members.slice(0, 5).map((m: any, i: number) => (
                      <View key={i} style={{ marginLeft: i === 0 ? 0 : -9, borderWidth: 2, borderColor: C.card, borderRadius: 20 }}>
                        {typeof m.user === "object" ? (
                          <Avatar userObj={m.user} size={26} />
                        ) : (
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.cardAlt, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="person" size={11} color={C.textMuted} />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>
                    {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => openManage(project)}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.cardBorder, paddingVertical: 11, borderRadius: 12 }}
                  >
                    <Ionicons name="people-outline" size={14} color={C.textSecondary} />
                    <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>Members</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { selectProject(project); router.push("/(tabs)/tasks"); }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: color, paddingVertical: 11, borderRadius: 12 }}
                  >
                    <Text style={{ color: C.onAccent, fontSize: 13, fontWeight: "700" }}>Open Board</Text>
                    <Ionicons name="arrow-forward" size={13} color={C.onAccent} />
                  </TouchableOpacity>
                </View>

                {isOwner && (
                  <TouchableOpacity
                    onPress={() => openManage(project)}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 11, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border }}
                  >
                    <Ionicons name="settings-outline" size={13} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: "600" }}>Project Settings & Delete</Text>
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
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable onPress={() => setCreateVisible(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.65)" }} />
            <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderTopColor: C.cardBorder, padding: 22, paddingBottom: 42 }}>
              <View style={{ width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 20 }}>Create new project</Text>

              <SLabel text="Project name *" />
              <View style={{ backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 14, marginBottom: 14 }}>
                <TextInput style={{ color: C.textPrimary, fontSize: 15, paddingVertical: 13 }} placeholder="e.g. Mobile App, Website Redesign" placeholderTextColor={C.textMuted} value={newName} onChangeText={setNewName} />
              </View>

              <SLabel text="Description" />
              <View style={{ backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20, minHeight: 80 }}>
                <TextInput style={{ color: C.textPrimary, fontSize: 15, textAlignVertical: "top" }} placeholder="What is this project about?" placeholderTextColor={C.textMuted} value={newDesc} onChangeText={setNewDesc} multiline numberOfLines={3} />
              </View>

              <SLabel text="Accent color" />
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 20 }}>
                {PROJECT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setNewColor(c)}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, alignItems: "center", justifyContent: "center", borderWidth: newColor === c ? 2.5 : 0, borderColor: "#FFFFFF", transform: [{ scale: newColor === c ? 1.15 : 1 }] }}
                  >
                    {newColor === c && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <SLabel text="Project banner" />
              <TouchableOpacity
                onPress={() => pickCoverImage(true)}
                style={{ backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.cardBorder, padding: newCoverUrl ? 0 : 16, alignItems: "center", justifyContent: "center", marginBottom: 24, height: 88, overflow: "hidden" }}
              >
                {newCoverUrl ? (
                  <Image source={{ uri: newCoverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: "center", gap: 6 }}>
                    <Ionicons name="image-outline" size={22} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>{uploadingCover ? "Uploading..." : "Select banner image"}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={() => setCreateVisible(false)} style={{ flex: 1, backgroundColor: C.card, borderRadius: 13, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder }}>
                  <Text style={{ color: C.textSecondary, fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} disabled={creating} style={{ flex: 1, backgroundColor: themeColor, borderRadius: 13, paddingVertical: 14, alignItems: "center" }}>
                  {creating ? <ActivityIndicator color={C.onAccent} /> : <Text style={{ color: C.onAccent, fontWeight: "700", fontSize: 15 }}>Create Project</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MODAL 2 ── MANAGE PROJECT
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={manageVisible} transparent animationType="slide" onRequestClose={closeManage}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderTopColor: C.cardBorder, maxHeight: "92%", paddingBottom: 36 }}>
              <View style={{ alignItems: "center", paddingTop: 14, paddingBottom: 6 }}>
                <View style={{ width: 36, height: 4, backgroundColor: C.border, borderRadius: 2 }} />
              </View>

              {/* Header */}
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: selProject?.color ?? themeColor }} />
                  <Text style={{ color: C.textPrimary, fontSize: 17, fontWeight: "700", flex: 1 }} numberOfLines={1}>{selProject?.name ?? "Project"}</Text>
                </View>
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>Members & settings</Text>
              </View>

              {/* Segmented tab */}
              <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
                <View style={{ flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 3 }}>
                  {(["members", "milestones"] as const).map((tab) => {
                    const active = settingsTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => setSettingsTab(tab)}
                        style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center", backgroundColor: active ? (selProject?.color ?? themeColor) : "transparent" }}
                      >
                        <Text style={{ color: active ? C.onAccent : C.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>{tab}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 12 }}>

                {settingsTab === "members" && (
                  <>
                    {/* Current Members */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700" }}>Current members</Text>
                      <View style={{ backgroundColor: C.card, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                        <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: "700" }}>{selProject?.members?.length ?? 0} total</Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: C.cardAlt, borderRadius: 16, overflow: "hidden", marginBottom: 22, borderWidth: 1, borderColor: C.cardBorder }}>
                      {(selProject?.members ?? []).length === 0 && (
                        <View style={{ padding: 20, alignItems: "center" }}>
                          <Text style={{ color: C.textMuted, fontSize: 13 }}>No members yet.</Text>
                        </View>
                      )}
                      {(selProject?.members ?? []).map((m: any, idx: number) => {
                        const uObj = typeof m.user === "object" ? m.user : null;
                        const mId = getUserId(m.user);
                        const isMe = mId === user?._id;
                        const isCreator = mId === getProjectCreatorId(selProject);
                        const canManage = isOwnerOfSelected && !isMe;
                        const color = selProject?.color ?? themeColor;
                        const total = selProject?.members?.length ?? 0;

                        return (
                          <View key={mId ?? idx} style={{ flexDirection: "row", alignItems: "center", padding: 13, borderBottomWidth: idx < total - 1 ? 1 : 0, borderBottomColor: C.border }}>
                            <TouchableOpacity
                              onPress={() => uObj && (setProfileUser(uObj), setProfileVisible(true))}
                              style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }}
                              activeOpacity={uObj ? 0.6 : 1}
                            >
                              {uObj ? <Avatar userObj={uObj} size={38} /> : (
                                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
                                  <Ionicons name="person" size={16} color={C.textMuted} />
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "700" }}>{uObj ? getFullName(uObj) : "Unknown"}</Text>
                                  {isCreator && <View style={{ backgroundColor: `${color}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}><Text style={{ color, fontSize: 9, fontWeight: "800" }}>OWNER</Text></View>}
                                  {isMe && <View style={{ backgroundColor: C.card, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}><Text style={{ color: C.textMuted, fontSize: 9, fontWeight: "800" }}>YOU</Text></View>}
                                </View>
                                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{uObj?.email ?? ""}</Text>
                              </View>
                              <RolePill role={m.role} accent={color} />
                            </TouchableOpacity>

                            {canManage && (
                              <View style={{ flexDirection: "row", gap: 6, marginLeft: 8 }}>
                                <TouchableOpacity
                                  onPress={() => handleRoleToggle(mId, m.role)}
                                  disabled={roleId === mId}
                                  style={{ backgroundColor: C.card, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: C.cardBorder }}
                                >
                                  {roleId === mId ? <ActivityIndicator size="small" color={C.textSecondary} /> : (
                                    <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: "700" }}>{m.role === "admin" ? "Demote" : "Promote"}</Text>
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleRemove(mId)}
                                  disabled={removingId === mId}
                                  style={{ backgroundColor: C.dangerBg, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 }}
                                >
                                  {removingId === mId ? <ActivityIndicator size="small" color={C.danger} /> : (
                                    <Text style={{ color: C.danger, fontSize: 11, fontWeight: "700" }}>Remove</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {!isViewer && (
                      <>
                        <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 4 }}>Add members</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 14, lineHeight: 18 }}>
                          Search workspace members below. Type 2+ characters to search all users globally.
                        </Text>

                        <View style={{ backgroundColor: C.cardAlt, borderRadius: 13, borderWidth: 1, borderColor: C.cardBorder, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, marginBottom: 18 }}>
                          <Ionicons name="search-outline" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
                          <TextInput
                            style={{ flex: 1, color: C.textPrimary, fontSize: 14, paddingVertical: 12 }}
                            placeholder="Search by name or email..."
                            placeholderTextColor={C.textMuted}
                            value={query}
                            onChangeText={setQuery}
                            autoCorrect={false}
                            autoCapitalize="none"
                          />
                          {searching && <ActivityIndicator size="small" color={themeColor} />}
                          {query.length > 0 && !searching && (
                            <TouchableOpacity onPress={() => { setQuery(""); setGlobalResults([]); }} hitSlop={8}>
                              <Ionicons name="close-circle" size={18} color={C.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <SLabel text="From this workspace" />
                        <View style={{ backgroundColor: C.cardAlt, borderRadius: 16, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder }}>
                          {availableWsMembers.length === 0 ? (
                            <View style={{ padding: 20, alignItems: "center" }}>
                              <Text style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>
                                {query.trim() ? "No workspace members match your search." : "All workspace members are already in this project."}
                              </Text>
                            </View>
                          ) : availableWsMembers.map((wm: any, idx: number) => {
                            const uObj = typeof wm.user === "object" ? wm.user : null;
                            const wmId = getUserId(wm.user);
                            const loading = addingId === wmId;
                            const color = selProject?.color ?? themeColor;

                            return (
                              <View key={wmId ?? idx} style={{ flexDirection: "row", alignItems: "center", padding: 13, borderBottomWidth: idx < availableWsMembers.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                                <TouchableOpacity onPress={() => uObj && (setProfileUser(uObj), setProfileVisible(true))} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }} activeOpacity={uObj ? 0.6 : 1}>
                                  {uObj ? <Avatar userObj={uObj} size={38} /> : (
                                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
                                      <Ionicons name="person" size={16} color={C.textMuted} />
                                    </View>
                                  )}
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>{uObj ? getFullName(uObj) : "Unknown"}</Text>
                                    <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{uObj?.email ?? ""}</Text>
                                  </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleAddWsMember(wmId)}
                                  disabled={loading}
                                  style={{ backgroundColor: C.accentBg, borderWidth: 1.5, borderColor: C.accentBorder, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 }}
                                >
                                  {loading ? <ActivityIndicator size="small" color={C.accent} /> : (
                                    <>
                                      <Ionicons name="add" size={14} color={C.accent} />
                                      <Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>Invite</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>

                        {globalResults.length > 0 && (
                          <>
                            <SLabel text="Global search results" />
                            <View style={{ backgroundColor: C.cardAlt, borderRadius: 16, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder }}>
                              {globalResults.map((u, idx) => {
                                const loading = inviteId === u._id;
                                const name = getFullName({ username: u.username });
                                const color = selProject?.color ?? themeColor;
                                return (
                                  <View key={u._id} style={{ flexDirection: "row", alignItems: "center", padding: 13, borderBottomWidth: idx < globalResults.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }}>
                                      <Avatar userObj={{ username: u.username }} size={38} />
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>{name}</Text>
                                        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{u.email}</Text>
                                      </View>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => handleInviteAndAdd(u)}
                                      disabled={loading}
                                      style={{ backgroundColor: `${color}18`, borderWidth: 1.5, borderColor: `${color}45`, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 }}
                                    >
                                      {loading ? <ActivityIndicator size="small" color={color} /> : (
                                        <>
                                          <Ionicons name="person-add-outline" size={13} color={color} />
                                          <Text style={{ color, fontSize: 12, fontWeight: "700" }}>Invite & Add</Text>
                                        </>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                            </View>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {settingsTab === "milestones" && (
                  <View style={{ gap: 20 }}>
                    {/* Cover image */}
                    <View>
                      <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 10 }}>Cover image banner</Text>
                      <View style={{ backgroundColor: C.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.cardBorder, position: "relative" }}>
                        {selProject?.coverImageUrl ? (
                          <Image source={{ uri: selProject.coverImageUrl }} style={{ width: "100%", height: 110 }} resizeMode="cover" />
                        ) : (
                          <View style={{ width: "100%", height: 110, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <Ionicons name="image-outline" size={28} color={C.textMuted} />
                            <Text style={{ color: C.textMuted, fontSize: 12 }}>No cover image set</Text>
                          </View>
                        )}
                        {!isViewer && (
                          <TouchableOpacity
                            onPress={() => pickCoverImage(false)}
                            disabled={uploadingCover}
                            style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(21,23,28,0.85)", borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6 }}
                          >
                            {uploadingCover ? <ActivityIndicator size="small" color={selProject?.color ?? themeColor} /> : (
                              <>
                                <Ionicons name="camera-outline" size={13} color={C.textPrimary} />
                                <Text style={{ color: C.textPrimary, fontSize: 11, fontWeight: "700" }}>{selProject?.coverImageUrl ? "Change" : "Upload"}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Milestones list */}
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700" }}>Milestones</Text>
                        {loadingMilestones && <ActivityIndicator size="small" color={selProject?.color ?? themeColor} />}
                      </View>

                      {milestones.length === 0 && !loadingMilestones ? (
                        <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, padding: 20, alignItems: "center" }}>
                          <Text style={{ color: C.textMuted, fontSize: 13 }}>No milestones set for this project.</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {milestones.map((m) => (
                            <View key={m._id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: m.status === "completed" ? `${C.done}30` : C.cardBorder, padding: 13, gap: 11 }}>
                              <TouchableOpacity
                                onPress={() => !isViewer && handleToggleMilestone(m)}
                                disabled={isViewer}
                                style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: m.status === "completed" ? C.done : C.borderLight, backgroundColor: m.status === "completed" ? C.done : "transparent", alignItems: "center", justifyContent: "center" }}
                              >
                                {m.status === "completed" && <Ionicons name="checkmark" size={13} color={C.onAccent} />}
                              </TouchableOpacity>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: m.status === "completed" ? C.textMuted : C.textPrimary, fontSize: 13, fontWeight: "700", textDecorationLine: m.status === "completed" ? "line-through" : "none" }}>{m.title}</Text>
                                {m.description ? <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{m.description}</Text> : null}
                              </View>
                              {!isViewer && (
                                <TouchableOpacity onPress={() => handleDeleteMilestone(m._id)} hitSlop={8}>
                                  <Ionicons name="close-circle-outline" size={18} color={C.danger} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Create milestone */}
                    {!isViewer && (
                      <View>
                        <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 12 }}>Create milestone</Text>
                        <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 14, gap: 10 }}>
                          <TextInput
                            style={{ backgroundColor: C.bg, borderRadius: 11, borderWidth: 1, borderColor: C.border, color: C.textPrimary, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 }}
                            placeholder="Milestone title..."
                            placeholderTextColor={C.textMuted}
                            value={newMilestoneTitle}
                            onChangeText={setNewMilestoneTitle}
                          />
                          <TextInput
                            style={{ backgroundColor: C.bg, borderRadius: 11, borderWidth: 1, borderColor: C.border, color: C.textPrimary, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, textAlignVertical: "top" }}
                            placeholder="Description (optional)..."
                            placeholderTextColor={C.textMuted}
                            value={newMilestoneDesc}
                            onChangeText={setNewMilestoneDesc}
                            multiline
                          />
                          <TouchableOpacity
                            onPress={handleCreateMilestone}
                            disabled={creatingMilestone || !newMilestoneTitle.trim()}
                            style={{ backgroundColor: newMilestoneTitle.trim() ? (selProject?.color ?? themeColor) : C.surface, paddingVertical: 13, borderRadius: 12, alignItems: "center" }}
                          >
                            {creatingMilestone ? <ActivityIndicator size="small" color={C.onAccent} /> : (
                              <Text style={{ color: newMilestoneTitle.trim() ? C.onAccent : C.textMuted, fontWeight: "700", fontSize: 14 }}>Create milestone</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Delete project */}
                {isOwnerOfSelected && !isViewer && (
                  <>
                    <Divider />
                    <TouchableOpacity
                      onPress={() => handleDelete(selProject._id)}
                      style={{ backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder, paddingVertical: 14, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 7, marginBottom: 10 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={C.danger} />
                      <Text style={{ color: C.danger, fontWeight: "700", fontSize: 14 }}>Delete Project</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={closeManage} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, paddingVertical: 14, borderRadius: 14, alignItems: "center" }}>
                  <Text style={{ color: C.textSecondary, fontWeight: "700", fontSize: 14 }}>Close</Text>
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Pressable onPress={() => setProfileVisible(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.65)" }} />
          <View style={{ width: "100%", backgroundColor: C.surface, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: C.cardBorder }}>
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              {profileUser && <Avatar userObj={profileUser} size={68} />}
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 12 }}>{profileUser ? getFullName(profileUser) : "User"}</Text>
              <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>{profileUser?.email ?? ""}</Text>
              {profileUser && (() => {
                const wm = (activeWorkspace?.members ?? []).find((m: any) => getUserId(m.user) === profileUser._id);
                return wm ? (
                  <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 }}>
                    <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>Workspace {wm.role}</Text>
                  </View>
                ) : null;
              })()}
            </View>

            <SLabel text={`Projects (${projects.filter((p: any) => p.members.some((m: any) => getUserId(m.user) === profileUser?._id)).length})`} />

            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {projects
                .filter((p: any) => p.members.some((m: any) => getUserId(m.user) === profileUser?._id))
                .map((proj: any) => {
                  const role = proj.members.find((m: any) => getUserId(m.user) === profileUser?._id)?.role ?? "member";
                  return (
                    <View key={proj._id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, padding: 12, borderRadius: 12, marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: proj.color ?? themeColor }} />
                        <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>{proj.name}</Text>
                      </View>
                      <RolePill role={role} accent={proj.color ?? themeColor} />
                    </View>
                  );
                })}
            </ScrollView>

            <TouchableOpacity onPress={() => setProfileVisible(false)} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, paddingVertical: 14, borderRadius: 13, alignItems: "center", marginTop: 16 }}>
              <Text style={{ color: C.textSecondary, fontWeight: "700" }}>Close</Text>
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
          surface: C.surface,
          border: C.cardBorder,
          textPrimary: C.textPrimary,
          textSecondary: C.textSecondary,
          muted: C.textMuted,
          accent: themeColor,
          onAccent: C.onAccent,
          danger: C.danger,
          dangerBg: C.dangerBg,
          dangerBorder: C.dangerBorder,
          input: C.card,
        }}
      />

    </SafeAreaView>
  );
}
