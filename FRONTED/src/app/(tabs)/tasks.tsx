import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Platform,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  Task,
  SubTask,
} from "../../api/task.api";
import {
  getTaskComments,
  createComment,
  deleteComment,
  Comment,
} from "../../api/comment.api";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { uploadFile } from "../../api/upload.api";
import { useRouter } from "expo-router";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0F19",
  surface: "#131825",
  card: "#1A2036",
  border: "#232A40",
  borderLight: "#2C3550",
  textPrimary: "#F1F3F9",
  textSecondary: "#8B92A9",
  textMuted: "#4A5068",
  high: "#E24B4A",
  highBg: "#2A1515",
  highBorder: "#5C2020",
  med: "#EF9F27",
  medBg: "#251E0D",
  medBorder: "#5C430D",
  low: "#378ADD",
  lowBg: "#0D1A2A",
  lowBorder: "#0D3558",
  todo: "#85B7EB",
  todoBg: "rgba(133,183,235,0.08)",
  inprog: "#EF9F27",
  inprogBg: "rgba(239,159,39,0.08)",
  done: "#5DCAA5",
  doneBg: "rgba(93,202,165,0.08)",
  accent: "#7F77DD",
  accentBg: "#1E1C3A",
  accentText: "#C5C2F5",
  danger: "#E24B4A",
  dangerBg: "#2A1515",
  dangerBorder: "#5C2020",
};

const priorityConfig = {
  high:   { color: C.high,   bg: C.highBg,   border: C.highBorder,   label: "High"   },
  medium: { color: C.med,    bg: C.medBg,    border: C.medBorder,    label: "Medium" },
  low:    { color: C.low,    bg: C.lowBg,    border: C.lowBorder,    label: "Low"    },
};

const columnConfig = {
  "todo":        { label: "To do",       accent: C.todo,   countColor: C.todo   },
  "in-progress": { label: "In progress", accent: C.inprog, countColor: C.inprog },
  "completed":   { label: "Completed",   accent: C.done,   countColor: C.done   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (member: any): string => {
  if (typeof member !== "object" || !member?.username) return "?";
  return `${member.username.firstname[0]}${member.username.lastname[0]}`.toUpperCase();
};

const getFullName = (member: any): string => {
  if (typeof member !== "object" || !member?.username) return "User";
  return `${member.username.firstname} ${member.username.lastname}`;
};

const getMemberId = (member: any): string =>
  typeof member === "object" ? member._id : member;

const formatDate = (dateStr?: string): string =>
  dateStr ? dateStr.split("T")[0] : "";

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <Text style={s.sectionLabel}>{children}</Text>
);

const PriorityBadge = ({ priority }: { priority: "low" | "medium" | "high" }) => {
  const cfg = priorityConfig[priority];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const AvatarStack = ({ assignedTo }: { assignedTo: any[] }) => {
  const shown = assignedTo.slice(0, 3);
  const extra = assignedTo.length - shown.length;
  return (
    <View style={s.avatarStack}>
      {shown.map((a, i) => (
        <View key={getMemberId(a) || i} style={[s.avatar, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -8 }]}>
          <Text style={s.avatarText}>{getInitials(a)}</Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={[s.avatar, s.avatarMore, { zIndex: 0, marginLeft: -8 }]}>
          <Text style={s.avatarMoreText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Task Card ────────────────────────────────────────────────────────────────
const TaskCard = ({
  task,
  themeColor,
  onPress,
}: {
  task: Task;
  themeColor: string;
  onPress: () => void;
}) => {
  const cfg = priorityConfig[task.priority] ?? priorityConfig.low;
  const subtaskDone = task.subtasks.filter((s) => s.isCompleted).length;
  const subtaskTotal = task.subtasks.length;
  const progress = subtaskTotal > 0 ? subtaskDone / subtaskTotal : 0;
  const isCompleted = task.status === "completed";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.card, isCompleted && s.cardCompleted]}
    >
      {/* Left accent stripe */}
      <View style={[s.cardAccent, { backgroundColor: cfg.color }]} />

      <View style={s.cardBody}>
        {/* Top row */}
        <View style={s.cardTopRow}>
          <PriorityBadge priority={task.priority} />
          {task.dueDate ? (
            <View style={s.dueDateRow}>
              <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
              <Text style={s.dueDateText}>{formatDate(task.dueDate)}</Text>
            </View>
          ) : null}
        </View>

        {/* Title + description */}
        <Text style={[s.cardTitle, isCompleted && s.cardTitleStrike]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={s.cardDesc} numberOfLines={1}>{task.description}</Text>
        ) : null}

        {/* Progress bar */}
        {subtaskTotal > 0 && (
          <View style={s.progressArea}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressLabel}>Progress</Text>
              <Text style={s.progressCount}>{subtaskDone}/{subtaskTotal}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: themeColor }]} />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.cardFooter}>
          {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? (
            <AvatarStack assignedTo={task.assignedTo} />
          ) : (
            <View style={s.unassignedPill}>
              <Ionicons name="person-outline" size={11} color={C.textMuted} />
              <Text style={s.unassignedText}>Unassigned</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Kanban Column ────────────────────────────────────────────────────────────
const KanbanColumn = ({
  statusKey,
  tasks,
  themeColor,
  onCardPress,
}: {
  statusKey: "todo" | "in-progress" | "completed";
  tasks: Task[];
  themeColor: string;
  onCardPress: (task: Task) => void;
}) => {
  const cfg = columnConfig[statusKey];
  return (
    <View style={s.column}>
      {/* Column accent line */}
      <View style={[s.columnAccent, { backgroundColor: cfg.accent }]} />

      <View style={s.columnHeader}>
        <Text style={s.columnTitle}>{cfg.label}</Text>
        <View style={[s.columnCount, { borderColor: cfg.accent + "40" }]}>
          <Text style={[s.columnCountText, { color: cfg.countColor }]}>{tasks.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.columnScroll}>
        {tasks.length === 0 ? (
          <View style={s.emptyColumn}>
            <Ionicons name="albums-outline" size={22} color={C.textMuted} />
            <Text style={s.emptyColumnText}>No tasks</Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              themeColor={themeColor}
              onPress={() => onCardPress(task)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const router = useRouter();
  const { user, activeProject, activeWorkspace, themeColor } = useApp();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Detail
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (activeProject) loadTasks();
  }, [activeProject]);

  const loadTasks = async () => {
    if (!activeProject) return;
    try {
      const res = await getProjectTasks(activeProject._id);
      if (res.success) setTasks(res.tasks);
    } catch (err) {
      console.error("Error loading tasks:", err);
    }
  };

  const handleCreateTask = async () => {
    if (!activeProject) return;
    if (!title.trim()) { Alert.alert("Title required", "Please enter a task title."); return; }
    setCreating(true);
    try {
      const res = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project: activeProject._id,
        priority,
        dueDate: dueDate.trim() || undefined,
        assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
      });
      if (res.success) {
        setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setAssignedTo([]);
        setCreateModalVisible(false);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to create task.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (task: Task, status: "todo" | "in-progress" | "completed") => {
    try {
      const res = await updateTask(task._id, { status });
      if (res.success) {
        if (selectedTask?._id === task._id) setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert("Delete task", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await deleteTask(taskId);
            if (res.success) { setDetailModalVisible(false); setSelectedTask(null); await loadTasks(); }
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to delete task.");
          }
        },
      },
    ]);
  };

  const handleAddSubtask = async () => {
    if (!selectedTask || !newSubtaskTitle.trim()) return;
    const updated = [...selectedTask.subtasks, { title: newSubtaskTitle.trim(), isCompleted: false } as SubTask];
    try {
      const res = await updateTask(selectedTask._id, { subtasks: updated });
      if (res.success) { setSelectedTask(res.task); setNewSubtaskTitle(""); await loadTasks(); }
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to add item."); }
  };

  const handleToggleSubtask = async (index: number) => {
    if (!selectedTask) return;
    const updated = selectedTask.subtasks.map((sub, i) =>
      i === index ? { ...sub, isCompleted: !sub.isCompleted } : sub
    );
    try {
      const res = await updateTask(selectedTask._id, { subtasks: updated });
      if (res.success) { setSelectedTask(res.task); await loadTasks(); }
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to update item."); }
  };

  const handleDeleteSubtask = async (index: number) => {
    if (!selectedTask) return;
    const updated = selectedTask.subtasks.filter((_, i) => i !== index);
    try {
      const res = await updateTask(selectedTask._id, { subtasks: updated });
      if (res.success) { setSelectedTask(res.task); await loadTasks(); }
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to delete item."); }
  };

  const handleAddTaskMember = async (memberId: string) => {
    if (!selectedTask) return;
    const current = (selectedTask.assignedTo as any[]).map(getMemberId);
    if (current.includes(memberId)) return;
    try {
      const res = await updateTask(selectedTask._id, { assignedTo: [...current, memberId] });
      if (res.success) { setSelectedTask(res.task); await loadTasks(); }
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to add member."); }
  };

  const handleRemoveTaskMember = async (memberId: string) => {
    if (!selectedTask) return;
    Alert.alert("Remove member", "Remove this person from the task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const current = (selectedTask.assignedTo as any[]).map(getMemberId).filter((id) => id !== memberId);
          try {
            const res = await updateTask(selectedTask._id, { assignedTo: current });
            if (res.success) { setSelectedTask(res.task); await loadTasks(); }
          } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to remove member."); }
        },
      },
    ]);
  };

  const handleLeaveTask = async (memberId: string) => {
    if (!selectedTask) return;
    Alert.alert("Leave task", "Remove yourself from this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          const current = (selectedTask.assignedTo as any[]).map(getMemberId).filter((id) => id !== memberId);
          try {
            const res = await updateTask(selectedTask._id, { assignedTo: current });
            if (res.success) { setSelectedTask(res.task); await loadTasks(); }
          } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to leave task."); }
        },
      },
    ]);
  };

  const loadComments = async (taskId: string) => {
    setLoadingComments(true);
    try {
      const res = await getTaskComments(taskId);
      if (res.success) setComments(res.comments);
    } catch (err) { console.error("Comments error:", err); }
    finally { setLoadingComments(false); }
  };

  const handlePostComment = async () => {
    if (!selectedTask || !newCommentContent.trim()) return;
    try {
      const res = await createComment(selectedTask._id, newCommentContent.trim());
      if (res.success) { setNewCommentContent(""); await loadComments(selectedTask._id); }
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to post comment."); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await deleteComment(commentId);
      if (res.success && selectedTask) await loadComments(selectedTask._id);
    } catch (err: any) { Alert.alert("Error", err?.response?.data?.message || "Failed to delete comment."); }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission denied", "Media library access is required."); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        await handleUpload(a.uri, a.fileName || `photo_${Date.now()}.jpg`, "image/jpeg");
      }
    } catch (err) { console.error("Image pick error:", err); }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        await handleUpload(a.uri, a.name || "document.pdf", a.mimeType || "application/octet-stream");
      }
    } catch (err) { console.error("Document pick error:", err); }
  };

  const handleUpload = async (uri: string, name: string, mimeType: string) => {
    if (!selectedTask) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", { uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri, name, type: mimeType } as any);
      const res = await uploadFile(formData);
      if (res.success) {
        const updateRes = await updateTask(selectedTask._id, {
          newAttachments: [{ name: res.name || name, url: res.url, fileType: res.fileType || mimeType, uploadedBy: user?._id }],
        });
        if (updateRes.success) {
          setSelectedTask(updateRes.task);
          setTasks((prev) => prev.map((t) => (t._id === updateRes.task._id ? updateRes.task : t)));
        } else {
          Alert.alert("Error", "Failed to attach file to task.");
        }
      } else {
        Alert.alert("Error", "Upload failed.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
    await loadComments(task._id);
  };

  // ── No active project ──────────────────────────────────────────────────────
  if (!activeProject) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: C.bg, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }]}>
        <Ionicons name="albums-outline" size={48} color={C.textMuted} style={{ marginBottom: 16 }} />
        <Text style={[s.h2, { textAlign: "center", marginBottom: 8 }]}>No project selected</Text>
        <Text style={[s.bodyMuted, { textAlign: "center", marginBottom: 24 }]}>
          Pick a project in the Projects tab to open the task board.
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: themeColor }]} onPress={() => router.push("/(tabs)/projects")}>
          <Text style={s.btnText}>Go to projects</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  // ── Main board ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>{activeProject.name}</Text>
          <Text style={s.headerTitle}>Task board</Text>
        </View>
        <TouchableOpacity
          style={[s.addTaskBtn, { backgroundColor: themeColor }]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={16} color="#0C101B" />
          <Text style={s.addTaskBtnText}>Add task</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban columns */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.flex} contentContainerStyle={s.boardContent}>
        <KanbanColumn statusKey="todo"        tasks={todoTasks}       themeColor={themeColor} onCardPress={openTaskDetail} />
        <KanbanColumn statusKey="in-progress" tasks={inProgressTasks} themeColor={themeColor} onCardPress={openTaskDetail} />
        <KanbanColumn statusKey="completed"   tasks={completedTasks}  themeColor={themeColor} onCardPress={openTaskDetail} />
      </ScrollView>

      {/* ── Modal: Create task ─────────────────────────────────────────────── */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setCreateModalVisible(false)} />
          <View style={s.createModal}>
            <Text style={s.modalTitle}>New task</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>

              <SectionLabel>Title *</SectionLabel>
              <View style={[s.inputWrap, { marginBottom: 16 }]}>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Implement login API"
                  placeholderTextColor={C.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <SectionLabel>Description</SectionLabel>
              <View style={[s.inputWrap, s.inputMultiline, { marginBottom: 16 }]}>
                <TextInput
                  style={[s.input, { minHeight: 72 }]}
                  placeholder="Details about the task"
                  placeholderTextColor={C.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              <SectionLabel>Priority</SectionLabel>
              <View style={[s.row, { gap: 8, marginBottom: 16 }]}>
                {(["low", "medium", "high"] as const).map((p) => {
                  const cfg = priorityConfig[p];
                  const selected = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        s.priorityBtn,
                        selected
                          ? { backgroundColor: cfg.bg, borderColor: cfg.color }
                          : { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                    >
                      <Text style={[s.priorityBtnText, { color: selected ? cfg.color : C.textMuted }]}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <SectionLabel>Due date</SectionLabel>
              <View style={[s.inputWrap, { marginBottom: 16 }]}>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>

              <SectionLabel>Assign to</SectionLabel>
              <View style={[s.inputWrap, { marginBottom: 24, paddingVertical: 8 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={() => setAssignedTo([])}
                    style={[s.assigneeChip, assignedTo.length === 0
                      ? { backgroundColor: C.accentBg, borderColor: C.accent }
                      : { backgroundColor: C.surface, borderColor: C.border }]}
                  >
                    <Text style={[s.assigneeChipText, { color: assignedTo.length === 0 ? C.accentText : C.textMuted }]}>
                      Unassigned
                    </Text>
                  </TouchableOpacity>
                  {activeProject.members.map((m: any) => {
                    const mId = getMemberId(m.user);
                    const name = getFullName(m.user);
                    const selected = assignedTo.includes(mId);
                    return (
                      <TouchableOpacity
                        key={mId}
                        onPress={() => setAssignedTo((prev) =>
                          prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
                        )}
                        style={[s.assigneeChip, selected
                          ? { backgroundColor: C.accentBg, borderColor: C.accent }
                          : { backgroundColor: C.surface, borderColor: C.border }]}
                      >
                        <Text style={[s.assigneeChipText, { color: selected ? C.accentText : C.textPrimary }]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={[s.row, { gap: 10 }]}>
              <TouchableOpacity style={[s.flex, s.secondaryBtn]} onPress={() => setCreateModalVisible(false)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.flex, s.primaryBtn, { backgroundColor: themeColor }]}
                onPress={handleCreateTask}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#0C101B" size="small" />
                  : <Text style={s.primaryBtnText}>Create task</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Task detail ─────────────────────────────────────────────── */}
      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <View style={s.detailOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setDetailModalVisible(false)} />
          <View style={s.detailPanel}>
            {/* Drag handle */}
            <View style={s.dragHandle} />

            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Title */}
                <Text style={[s.h2, { marginBottom: 16 }]}>{selectedTask.title}</Text>

                {/* Status switcher */}
                <SectionLabel>Status</SectionLabel>
                <View style={[s.statusRow, { marginBottom: 16 }]}>
                  {(["todo", "in-progress", "completed"] as const).map((st) => {
                    const active = selectedTask.status === st;
                    const cfg = columnConfig[st];
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => handleUpdateStatus(selectedTask, st)}
                        style={[
                          s.statusTab,
                          active ? { backgroundColor: themeColor } : {},
                        ]}
                      >
                        <Text style={[s.statusTabText, { color: active ? "#0C101B" : C.textSecondary }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Info grid */}
                <View style={[s.infoGrid, { marginBottom: 20 }]}>
                  <View style={s.infoCell}>
                    <Text style={s.infoCellLabel}>Priority</Text>
                    <Text style={[s.infoCellValue, { color: priorityConfig[selectedTask.priority]?.color ?? C.textPrimary }]}>
                      {priorityConfig[selectedTask.priority]?.label ?? selectedTask.priority}
                    </Text>
                  </View>
                  <View style={[s.infoCell, { borderLeftWidth: 0.5, borderLeftColor: C.border }]}>
                    <Text style={s.infoCellLabel}>Due date</Text>
                    <Text style={s.infoCellValue}>{formatDate(selectedTask.dueDate) || "None"}</Text>
                  </View>
                  <View style={[s.infoCell, { borderLeftWidth: 0.5, borderLeftColor: C.border }]}>
                    <Text style={s.infoCellLabel}>Members</Text>
                    <Text style={s.infoCellValue}>
                      {Array.isArray(selectedTask.assignedTo) ? `${selectedTask.assignedTo.length} assigned` : "Unassigned"}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {selectedTask.description ? (
                  <>
                    <SectionLabel>Description</SectionLabel>
                    <Text style={[s.bodyMuted, { marginBottom: 20 }]}>{selectedTask.description}</Text>
                  </>
                ) : null}

                {/* Members */}
                <SectionLabel>Members</SectionLabel>
                <View style={[s.membersBox, { marginBottom: 16 }]}>
                  {Array.isArray(selectedTask.assignedTo) && selectedTask.assignedTo.length > 0 ? (
                    selectedTask.assignedTo.map((member: any, idx: number) => {
                      const mId = getMemberId(member);
                      const name = getFullName(member);
                      const email = typeof member === "object" ? member.email : "";
                      const initials = getInitials(member);
                      const isMe = mId === user?._id;
                      return (
                        <View key={mId || idx} style={[s.memberRow, idx > 0 && { borderTopWidth: 0.5, borderTopColor: C.border }]}>
                          <View style={s.memberAvatar}>
                            <Text style={s.memberAvatarText}>{initials}</Text>
                          </View>
                          <View style={s.flex}>
                            <Text style={s.memberName}>
                              {name}{" "}
                              {isMe && <Text style={{ color: themeColor, fontSize: 11 }}>(Me)</Text>}
                            </Text>
                            {email ? <Text style={s.memberEmail}>{email}</Text> : null}
                          </View>
                          <TouchableOpacity
                            onPress={() => isMe ? handleLeaveTask(mId) : handleRemoveTaskMember(mId)}
                            style={s.memberAction}
                          >
                            <Text style={s.memberActionText}>{isMe ? "Leave" : "Remove"}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <View style={{ padding: 16, alignItems: "center" }}>
                      <Text style={s.bodyMuted}>No members assigned</Text>
                    </View>
                  )}
                </View>

                {/* Add project members */}
                {activeProject.members?.length > 0 && (() => {
                  const currentIds = (selectedTask.assignedTo as any[]).map(getMemberId);
                  const available = activeProject.members.filter((pm: any) => !currentIds.includes(getMemberId(pm.user)));
                  if (!available.length) return null;
                  return (
                    <>
                      <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Add members</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        {available.map((pm: any, idx: number) => {
                          const pmId = getMemberId(pm.user);
                          const name = getFullName(pm.user);
                          const initials = getInitials(pm.user);
                          return (
                            <TouchableOpacity
                              key={pmId || idx}
                              onPress={() => handleAddTaskMember(pmId)}
                              style={s.addMemberChip}
                            >
                              <View style={s.addMemberAvatar}>
                                <Text style={s.addMemberAvatarText}>{initials}</Text>
                              </View>
                              <Text style={s.addMemberName}>{name}</Text>
                              <Ionicons name="add" size={13} color={themeColor} />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  );
                })()}

                {/* Attachments */}
                <SectionLabel>Attachments</SectionLabel>
                {selectedTask.attachments?.length > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    {selectedTask.attachments.map((att, idx) => {
                      const isImage = att.fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(att.name);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => att.url && Linking.openURL(att.url)}
                          style={s.attachmentRow}
                        >
                          {isImage ? (
                            <Image source={{ uri: att.url }} style={s.attachmentThumb} resizeMode="cover" />
                          ) : (
                            <View style={[s.attachmentThumb, s.attachmentThumbFile]}>
                              <Ionicons name="document-text-outline" size={20} color={C.textMuted} />
                            </View>
                          )}
                          <View style={s.flex}>
                            <Text style={s.attachmentName} numberOfLines={1}>{att.name}</Text>
                            <Text style={s.attachmentType}>{att.fileType.split("/")[1]?.toUpperCase() || "FILE"}</Text>
                          </View>
                          <Ionicons name="open-outline" size={14} color={themeColor} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[s.bodyMuted, { marginBottom: 12 }]}>No attachments yet</Text>
                )}
                <View style={[s.row, { gap: 8, marginBottom: 20 }]}>
                  <TouchableOpacity onPress={pickImage} disabled={uploading} style={[s.flex, s.attachBtn]}>
                    <Ionicons name="image-outline" size={15} color={C.textSecondary} />
                    <Text style={s.attachBtnText}>Add image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={pickDocument} disabled={uploading} style={[s.flex, s.attachBtn]}>
                    <Ionicons name="document-outline" size={15} color={C.textSecondary} />
                    <Text style={s.attachBtnText}>Add doc / PDF</Text>
                  </TouchableOpacity>
                </View>
                {uploading && (
                  <View style={[s.row, { justifyContent: "center", gap: 8, marginBottom: 16 }]}>
                    <ActivityIndicator size="small" color={themeColor} />
                    <Text style={s.bodyMuted}>Uploading…</Text>
                  </View>
                )}

                {/* Checklist */}
                <SectionLabel>
                  Checklist ({selectedTask.subtasks.filter(s => s.isCompleted).length}/{selectedTask.subtasks.length})
                </SectionLabel>
                {selectedTask.subtasks.length > 0 && (
                  <View style={[s.membersBox, { marginBottom: 12 }]}>
                    {selectedTask.subtasks.map((sub, idx) => (
                      <View key={sub._id || idx} style={[s.subtaskRow, idx > 0 && { borderTopWidth: 0.5, borderTopColor: C.border }]}>
                        <TouchableOpacity onPress={() => handleToggleSubtask(idx)} style={[s.checkbox, sub.isCompleted && { backgroundColor: themeColor, borderColor: themeColor }]}>
                          {sub.isCompleted && <Ionicons name="checkmark" size={11} color="#0C101B" />}
                        </TouchableOpacity>
                        <Text style={[s.flex, s.subtaskText, sub.isCompleted && s.subtaskDone]}>{sub.title}</Text>
                        <TouchableOpacity onPress={() => handleDeleteSubtask(idx)}>
                          <Text style={s.deleteLink}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <View style={[s.row, { gap: 8, marginBottom: 24 }]}>
                  <View style={[s.flex, s.inputWrap]}>
                    <TextInput
                      style={s.input}
                      placeholder="Add checklist item…"
                      placeholderTextColor={C.textMuted}
                      value={newSubtaskTitle}
                      onChangeText={setNewSubtaskTitle}
                    />
                  </View>
                  <TouchableOpacity onPress={handleAddSubtask} style={[s.inlineBtn, { backgroundColor: themeColor }]}>
                    <Text style={s.inlineBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={s.divider} />

                {/* Comments */}
                <SectionLabel>Comments</SectionLabel>
                {loadingComments ? (
                  <ActivityIndicator color={themeColor} style={{ marginVertical: 16 }} />
                ) : comments.length === 0 ? (
                  <Text style={[s.bodyMuted, { textAlign: "center", marginVertical: 12 }]}>No comments yet</Text>
                ) : (
                  <View style={{ marginBottom: 12 }}>
                    {comments.map((comm) => {
                      const isOwner = comm.sender._id === user?._id;
                      return (
                        <View key={comm._id} style={s.commentCard}>
                          <View style={s.commentMeta}>
                            <Text style={[s.commentAuthor, { color: themeColor }]}>
                              {getFullName(comm.sender)}
                            </Text>
                            <View style={s.row}>
                              {comm.createdAt && (
                                <Text style={[s.bodyMuted, { fontSize: 10, marginRight: 8 }]}>
                                  {new Date(comm.createdAt).toLocaleDateString()}
                                </Text>
                              )}
                              {isOwner && (
                                <TouchableOpacity onPress={() => handleDeleteComment(comm._id)}>
                                  <Text style={s.deleteLink}>Delete</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                          <Text style={s.commentBody}>{comm.content}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={[s.row, { gap: 8, marginBottom: 24 }]}>
                  <View style={[s.flex, s.inputWrap]}>
                    <TextInput
                      style={[s.input, { minHeight: 40 }]}
                      placeholder="Write a comment…"
                      placeholderTextColor={C.textMuted}
                      value={newCommentContent}
                      onChangeText={setNewCommentContent}
                      multiline
                    />
                  </View>
                  <TouchableOpacity onPress={handlePostComment} style={[s.inlineBtn, { backgroundColor: themeColor }]}>
                    <Text style={s.inlineBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>

                {/* Delete */}
                <TouchableOpacity
                  onPress={() => handleDeleteTask(selectedTask._id)}
                  style={s.dangerBtn}
                >
                  <Ionicons name="trash-outline" size={15} color={C.danger} />
                  <Text style={s.dangerBtnText}>Delete task</Text>
                </TouchableOpacity>

                {/* Close */}
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  style={[s.secondaryBtn, { marginTop: 8, marginBottom: 8 }]}
                >
                  <Text style={s.secondaryBtnText}>Close</Text>
                </TouchableOpacity>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },

  // Typography
  h2: { fontSize: 20, fontWeight: "600", color: C.textPrimary },
  bodyMuted: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 },
  deleteLink: { fontSize: 10, color: C.danger, fontWeight: "500" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: C.border },
  headerEyebrow: { fontSize: 11, fontWeight: "500", letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: "600", color: C.textPrimary },
  addTaskBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addTaskBtnText: { fontSize: 13, fontWeight: "600", color: "#0C101B" },

  // Board
  boardContent: { padding: 16, gap: 12 },

  // Column
  column: { width: 280, backgroundColor: C.surface, borderRadius: 16, borderWidth: 0.5, borderColor: C.border, overflow: "hidden", maxHeight: 620 },
  columnAccent: { height: 3 },
  columnHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  columnTitle: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  columnCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 0.5 },
  columnCountText: { fontSize: 11, fontWeight: "600" },
  columnScroll: { flex: 1, paddingHorizontal: 10, paddingBottom: 12 },

  // Empty column
  emptyColumn: { alignItems: "center", justifyContent: "center", paddingVertical: 40, borderWidth: 1, borderStyle: "dashed", borderColor: C.border, borderRadius: 12, marginBottom: 12 },
  emptyColumnText: { fontSize: 11, color: C.textMuted, marginTop: 8 },

  // Card
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, marginBottom: 8, flexDirection: "row", overflow: "hidden" },
  cardCompleted: { opacity: 0.65 },
  cardAccent: { width: 3 },
  cardBody: { flex: 1, padding: 12 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: C.textPrimary, lineHeight: 19, marginBottom: 3 },
  cardTitleStrike: { textDecorationLine: "line-through", color: C.textMuted },
  cardDesc: { fontSize: 11, color: C.textMuted, lineHeight: 16, marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },

  // Badge
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, borderWidth: 0.5 },
  badgeText: { fontSize: 10, fontWeight: "600" },

  // Due date
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dueDateText: { fontSize: 10, color: C.textMuted },

  // Progress
  progressArea: { marginBottom: 10 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { fontSize: 10, color: C.textMuted },
  progressCount: { fontSize: 10, fontWeight: "500", color: C.textSecondary },
  progressTrack: { height: 3, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  // Avatars
  avatarStack: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.accentBg, borderWidth: 1.5, borderColor: C.card, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 8, fontWeight: "600", color: C.accentText },
  avatarMore: { backgroundColor: C.surface },
  avatarMoreText: { fontSize: 7, fontWeight: "600", color: C.textMuted },

  // Unassigned
  unassignedPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  unassignedText: { fontSize: 10, color: C.textMuted },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  createModal: { width: "100%", backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 0.5, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: "600", color: C.textPrimary, marginBottom: 20 },

  detailOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  detailPanel: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 0.5, borderTopColor: C.border, padding: 20, paddingBottom: 40, maxHeight: "88%" },
  dragHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },

  // Inputs
  inputWrap: { backgroundColor: C.card, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 14 },
  inputMultiline: { paddingVertical: 8 },
  input: { color: C.textPrimary, fontSize: 14, paddingVertical: 12 },

  // Priority buttons
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 0.5 },
  priorityBtnText: { fontSize: 12, fontWeight: "600" },

  // Assignee chips
  assigneeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, marginRight: 8 },
  assigneeChipText: { fontSize: 12, fontWeight: "500" },

  // Action buttons
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnText: { fontSize: 14, fontWeight: "600", color: "#0C101B" },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#0C101B" },
  secondaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border },
  secondaryBtnText: { fontSize: 14, fontWeight: "500", color: C.textPrimary },
  inlineBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  inlineBtnText: { fontSize: 12, fontWeight: "600", color: "#0C101B" },
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: C.dangerBg, borderWidth: 0.5, borderColor: C.dangerBorder, marginTop: 8 },
  dangerBtnText: { fontSize: 14, fontWeight: "600", color: C.danger },
  attachBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: C.card, borderRadius: 10, borderWidth: 0.5, borderColor: C.border },
  attachBtnText: { fontSize: 12, color: C.textSecondary },

  // Status tabs
  statusRow: { flexDirection: "row", backgroundColor: C.card, borderRadius: 10, padding: 3, borderWidth: 0.5, borderColor: C.border, gap: 2 },
  statusTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  statusTabText: { fontSize: 11, fontWeight: "600" },

  // Info grid
  infoGrid: { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, overflow: "hidden" },
  infoCell: { flex: 1, padding: 12 },
  infoCellLabel: { fontSize: 10, color: C.textMuted, marginBottom: 3 },
  infoCellValue: { fontSize: 13, fontWeight: "600", color: C.textPrimary },

  // Members
  membersBox: { backgroundColor: C.card, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, overflow: "hidden" },
  memberRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.accentBg, borderWidth: 0.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 11, fontWeight: "600", color: C.accentText },
  memberName: { fontSize: 13, fontWeight: "500", color: C.textPrimary },
  memberEmail: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  memberAction: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.dangerBg, borderRadius: 8, borderWidth: 0.5, borderColor: C.dangerBorder },
  memberActionText: { fontSize: 10, fontWeight: "600", color: C.danger },

  // Add member chips
  addMemberChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card, borderRadius: 20, borderWidth: 0.5, borderColor: C.border, marginRight: 8 },
  addMemberAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accentBg, alignItems: "center", justifyContent: "center" },
  addMemberAvatarText: { fontSize: 8, fontWeight: "600", color: C.accentText },
  addMemberName: { fontSize: 12, fontWeight: "500", color: C.textPrimary },

  // Attachments
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  attachmentThumb: { width: 44, height: 44, borderRadius: 8, overflow: "hidden" },
  attachmentThumbFile: { backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  attachmentName: { fontSize: 13, fontWeight: "500", color: C.textPrimary },
  attachmentType: { fontSize: 10, color: C.textMuted, marginTop: 2 },

  // Checklist
  subtaskRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: C.borderLight, alignItems: "center", justifyContent: "center" },
  subtaskText: { fontSize: 13, color: C.textPrimary },
  subtaskDone: { textDecorationLine: "line-through", color: C.textMuted },

  // Comments
  commentCard: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  commentMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  commentAuthor: { fontSize: 12, fontWeight: "600" },
  commentBody: { fontSize: 13, color: C.textPrimary, lineHeight: 19 },

  // Divider
  divider: { height: 0.5, backgroundColor: C.border, marginVertical: 20 },
});