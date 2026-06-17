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
  PanResponder,
  Dimensions,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  getArchivedProjectTasks,
  logTime,
  deleteTimeLog,
  bulkUpdateTasks,
  getTrashTasks,
  restoreTask,
  deleteTaskPermanently,
  Task,
  SubTask,
} from "../../api/task.api";
import {
  cacheData,
  getCachedData,
  queueOfflineAction,
  subscribeToOnlineStatus,
  startConnectivityMonitoring,
  stopConnectivityMonitoring,
  syncOfflineQueue,
  getOnlineStatus,
} from "../../utils/offlineManager";
import {
  pinProjectApi,
  pinTaskApi,
  getPinnedItemsApi,
  saveFilterApi,
  getSavedFiltersApi,
  deleteSavedFilterApi,
} from "../../api/user.api";
import {
  updateProjectColumnsApi,
  updateProjectCustomFieldsApi,
} from "../../api/project.api";
import {
  getTaskComments,
  createComment,
  deleteComment,
  updateComment,
  toggleCommentReaction,
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

const DEFAULT_BOARD_COLUMNS = [
  { id: "todo", label: "To Do", color: "#A8ACB9" },
  { id: "in-progress", label: "In Progress", color: "#EF9F27" },
  { id: "completed", label: "Completed", color: "#5DCAA5" }
];

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

const labelColors: { [key: string]: { bg: string, text: string } } = {
  bug: { bg: "#2A1515", text: "#E24B4A" }, // Red
  feature: { bg: "#0D251F", text: "#5DCAA5" }, // Green
  backend: { bg: "#1E1C3A", text: "#C5C2F5" }, // Purple
  urgent: { bg: "#251E0D", text: "#EF9F27" }, // Amber
  testing: { bg: "#0D1A2A", text: "#378ADD" }, // Blue
  design: { bg: "#2A1B28", text: "#E093C0" }, // Pink
  frontend: { bg: "#152A2A", text: "#6FC3D6" }, // Cyan
};

const getLabelColor = (label: string) => {
  const normalized = label.toLowerCase().trim();
  if (labelColors[normalized]) return labelColors[normalized];
  
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    { bg: "#1E1C3A", text: "#C5C2F5" },
    { bg: "#0D1A2A", text: "#85B7EB" },
    { bg: "rgba(93,202,165,0.12)", text: "#5DCAA5" },
    { bg: "rgba(239,159,39,0.12)", text: "#EF9F27" },
    { bg: "rgba(226,75,74,0.12)", text: "#E24B4A" },
  ];
  return colors[Math.abs(hash) % colors.length];
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
  const { C } = useApp();
  const cfg = getPriorityConfig(C)[priority];
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
  onDragStart,
  isDragging,
  isBlocked,
}: {
  task: Task;
  themeColor: string;
  onPress: () => void;
  onDragStart?: (task: Task, pageX: number, pageY: number) => void;
  isDragging?: boolean;
  isBlocked?: boolean;
}) => {
  const { C } = useApp();
  const cfg = getPriorityConfig(C)[task.priority] ?? getPriorityConfig(C).low;
  const subtaskDone = task.subtasks.filter((s) => s.isCompleted).length;
  const subtaskTotal = task.subtasks.length;
  const progress = subtaskTotal > 0 ? subtaskDone / subtaskTotal : 0;
  const isCompleted = task.status === "completed";

  // Calculate overdue / due soon status
  const now = new Date();
  const dueTime = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueTime && dueTime < now && !isCompleted;
  const diffTime = dueTime ? dueTime.getTime() - now.getTime() : 0;
  const isDueSoon = dueTime && diffTime > 0 && diffTime <= 24 * 60 * 60 * 1000 && !isCompleted;

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
          <View style={[s.row, { gap: 6 }]}>
            {onDragStart && !isDragging && (
              <View
                onTouchStart={(e) => {
                  onDragStart(task, e.nativeEvent.pageX, e.nativeEvent.pageY);
                }}
                style={s.grabHandle}
              >
                <Ionicons name="reorder-two-outline" size={12} color={C.textSecondary} />
              </View>
            )}
            <PriorityBadge priority={task.priority} />
            {isBlocked && (
              <View style={s.blockedBadge}>
                <Ionicons name="lock-closed" size={9} color="#EF4444" />
                <Text style={s.blockedBadgeText}>Blocked</Text>
              </View>
            )}
            {task.recurring?.isRecurring && (
              <View style={[s.recurringBadge, { backgroundColor: themeColor + "15", borderColor: themeColor + "30" }]}>
                <Ionicons name="sync" size={9} color={themeColor} />
                <Text style={[s.recurringBadgeText, { color: themeColor }]}>
                  {task.recurring.frequency}
                </Text>
              </View>
            )}
          </View>
          {task.dueDate ? (
            <View style={s.dueDateRow}>
              <Ionicons
                name="calendar-outline"
                size={11}
                color={isOverdue ? "#EF4444" : (isDueSoon ? "#F59E0B" : C.textMuted)}
              />
              <Text style={[
                s.dueDateText,
                { color: isOverdue ? "#EF4444" : (isDueSoon ? "#F59E0B" : C.textSecondary) }
              ]}>
                {formatDate(task.dueDate)}
              </Text>
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

        {/* Labels */}
        {Array.isArray(task.labels) && task.labels.length > 0 && (
          <View style={[s.row, { flexWrap: "wrap", gap: 4, marginBottom: 8 }]}>
            {task.labels.map((label, index) => {
              const colors = getLabelColor(label);
              return (
                <View
                  key={index}
                  style={[s.labelChip, { backgroundColor: colors.bg, borderColor: colors.text + "40" }]}
                >
                  <Text style={[s.labelChipText, { color: colors.text }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}

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
  allTasks,
  themeColor,
  onCardPress,
  onDragStart,
  hoverStatus,
  hoverIndex,
  colConfig,
}: {
  statusKey: string;
  tasks: Task[];
  allTasks: Task[];
  themeColor: string;
  onCardPress: (task: Task) => void;
  onDragStart: (task: Task, pageX: number, pageY: number) => void;
  hoverStatus: string | null;
  hoverIndex: number;
  colConfig?: { id: string; label: string; color: string };
}) => {
  const { C } = useApp();
  const columnConfig = getColumnConfig(C);
  const cfg = colConfig
    ? { label: colConfig.label, accent: colConfig.color, countColor: colConfig.color }
    : (columnConfig[statusKey as "todo" | "in-progress" | "completed"] || { label: statusKey, accent: themeColor, countColor: themeColor });
  const renderedTasks = [...tasks];
  let showPlaceholder = false;
  let placeholderIdx = 0;

  if (hoverStatus === statusKey) {
    showPlaceholder = true;
    placeholderIdx = Math.min(hoverIndex, tasks.length);
  }

  return (
    <View style={s.column}>
      <View style={[s.columnHeader, { borderLeftColor: cfg.accent }]}>
        <View style={[s.row, { gap: 6 }]}>
          <Text style={s.columnTitle}>{cfg.label}</Text>
          <View style={[s.columnCount, { borderColor: cfg.accent + "40" }]}>
            <Text style={[s.columnCountText, { color: cfg.countColor }]}>{tasks.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 60 }}
      >
        {renderedTasks.length === 0 && !showPlaceholder ? (
          <View style={s.emptyColumn}>
            <Text style={s.emptyColumnText}>No tasks here</Text>
          </View>
        ) : (
          <View style={{ gap: 2 }}>
            {(() => {
              const elements = [];
              let taskCount = 0;
              const maxElements = renderedTasks.length + (showPlaceholder ? 1 : 0);

              for (let i = 0; i < maxElements; i++) {
                if (showPlaceholder && i === placeholderIdx) {
                  elements.push(
                    <View
                      key="placeholder"
                      style={[
                        s.placeholderCard,
                        { borderColor: themeColor + "80" }
                      ]}
                    >
                      <Text style={[s.placeholderText, { color: themeColor }]}>Drop here</Text>
                    </View>
                  );
                } else {
                  const task = renderedTasks[taskCount];
                  if (task) {
                    const isBlocked = task.dependencies && task.dependencies.some((depId) => {
                      const depTask = allTasks.find((t) => t._id === depId);
                      return depTask && depTask.status !== "completed";
                    });
                    elements.push(
                      <TaskCard
                        key={task._id}
                        task={task}
                        themeColor={themeColor}
                        onPress={() => onCardPress(task)}
                        onDragStart={onDragStart}
                        isBlocked={isBlocked}
                      />
                    );
                    taskCount++;
                  }
                }
              }
              return elements;
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function MarkdownToolbar({ onInsert }: { onInsert: (syntax: string) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 6, backgroundColor: "#161922", padding: 6, borderRadius: 8, borderWidth: 0.5, borderColor: "#2A2D3E" }}>
      <TouchableOpacity onPress={() => onInsert("**bold**")} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1E2130", borderRadius: 4 }}>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 11 }}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("*italic*")} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1E2130", borderRadius: 4 }}>
        <Text style={{ color: "#fff", fontStyle: "italic", fontSize: 11 }}>I</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("\n- ")} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1E2130", borderRadius: 4 }}>
        <Text style={{ color: "#fff", fontSize: 11 }}>• List</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("\n- [ ] ")} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1E2130", borderRadius: 4 }}>
        <Text style={{ color: "#fff", fontSize: 11 }}>☑ Todo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("\n```\ncode\n```\n")} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1E2130", borderRadius: 4 }}>
        <Text style={{ color: "#fff", fontSize: 11 }}>&lt;&gt; Code</Text>
      </TouchableOpacity>
    </View>
  );
}

function FormattedText({ text, themeColor }: { text: string; themeColor: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeLines: string[] = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <View key={`code-${index}`} style={{ backgroundColor: "#0F1117", borderWidth: 1, borderColor: "#1E2130", borderRadius: 8, padding: 10, marginVertical: 4 }}>
            <Text style={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 12, color: "#E8D4F5" }}>{codeLines.join("\n")}</Text>
          </View>
        );
        codeLines = [];
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().substring(2);
      elements.push(
        <View key={`bullet-${index}`} style={{ flexDirection: "row", paddingLeft: 8, marginVertical: 3, alignItems: "flex-start" }}>
          <Text style={{ color: themeColor, fontSize: 13, marginRight: 8 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 13, color: "#C9D1E0" }}>{renderInline(content, themeColor)}</Text>
        </View>
      );
      return;
    }

    if (line.trim().startsWith("- [ ] ") || line.trim().startsWith("- [x] ")) {
      const checked = line.trim().startsWith("- [x] ");
      const content = line.trim().substring(6);
      elements.push(
        <View key={`checklist-${index}`} style={{ flexDirection: "row", paddingLeft: 8, marginVertical: 3, alignItems: "flex-start" }}>
          <View style={[{ width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: "#4A4A6A", marginRight: 8, alignItems: "center", justifyContent: "center", marginTop: 2 }, checked && { backgroundColor: themeColor, borderColor: themeColor }]}>
            {checked && <Text style={{ color: "#0F1117", fontSize: 9, fontWeight: "bold" }}>✓</Text>}
          </View>
          <Text style={[{ flex: 1, fontSize: 13, color: "#C9D1E0" }, checked && { textDecorationLine: "line-through", color: "#6B7280" }]}>
            {renderInline(content, themeColor)}
          </Text>
        </View>
      );
      return;
    }

    if (line.trim() === "") {
      elements.push(<View key={`empty-${index}`} style={{ height: 6 }} />);
    } else {
      elements.push(
        <Text key={`line-${index}`} style={{ fontSize: 13, lineHeight: 18, color: "#C9D1E0", marginBottom: 4 }}>
          {renderInline(line, themeColor)}
        </Text>
      );
    }
  });

  return <View style={{ gap: 4 }}>{elements}</View>;
}

function renderInline(text: string, themeColor: string) {
  const tokens: { type: "text" | "bold" | "italic" | "code" | "mention" | "link"; text: string; linkUrl?: string }[] = [];
  
  let i = 0;
  while (i < text.length) {
    if (text[i] === "`") {
      let end = text.indexOf("`", i + 1);
      if (end !== -1) {
        tokens.push({ type: "code", text: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith("**", i)) {
      let end = text.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ type: "bold", text: text.substring(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*") {
      let end = text.indexOf("*", i + 1);
      if (end !== -1) {
        tokens.push({ type: "italic", text: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "@") {
      let match = text.slice(i).match(/^@(\w+)/);
      if (match) {
        tokens.push({ type: "mention", text: match[0] });
        i += match[0].length;
        continue;
      }
    }
    if (text[i] === "[") {
      let titleEnd = text.indexOf("]", i + 1);
      if (titleEnd !== -1 && text[titleEnd + 1] === "(") {
        let urlEnd = text.indexOf(")", titleEnd + 2);
        if (urlEnd !== -1) {
          tokens.push({
            type: "link",
            text: text.substring(i + 1, titleEnd),
            linkUrl: text.substring(titleEnd + 2, urlEnd)
          });
          i = urlEnd + 1;
          continue;
        }
      }
    }

    if (tokens.length > 0 && tokens[tokens.length - 1].type === "text") {
      tokens[tokens.length - 1].text += text[i];
    } else {
      tokens.push({ type: "text", text: text[i] });
    }
    i++;
  }

  return tokens.map((token, index) => {
    switch (token.type) {
      case "bold":
        return <Text key={index} style={{ fontWeight: "bold", color: "#fff" }}>{token.text}</Text>;
      case "italic":
        return <Text key={index} style={{ fontStyle: "italic", color: "#C9D1E0" }}>{token.text}</Text>;
      case "code":
        return (
          <Text key={index} style={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", backgroundColor: "#1E2130", color: "#E8D4F5", paddingHorizontal: 4, borderRadius: 4, fontSize: 12 }}>
            {token.text}
          </Text>
        );
      case "mention":
        return (
          <Text key={index} style={{ color: themeColor, fontWeight: "700", backgroundColor: `${themeColor}22`, paddingHorizontal: 4, borderRadius: 4, overflow: "hidden" }}>
            {token.text}
          </Text>
        );
      case "link":
        return (
          <Text key={index} style={{ color: themeColor, textDecorationLine: "underline" }} onPress={() => Alert.alert("Link", `Navigate to: ${token.linkUrl}`)}>
            {token.text}
          </Text>
        );
      default:
        return <Text key={index} style={{ color: "#C9D1E0" }}>{token.text}</Text>;
    }
  });
}

const getUserId = (userField: any): string =>
  typeof userField === "object" && userField !== null ? userField._id : userField;

const getPriorityConfig = (C: any) => ({
  high:   { color: C.danger ?? "#E24B4A",   bg: C.dangerBg ?? "#2A1515",   border: C.dangerBorder ?? "#5C2020",   label: "High"   },
  medium: { color: C.med ?? "#EF9F27",    bg: C.medBg ?? "#251E0D",    border: C.medBorder ?? "#5C430D",    label: "Medium" },
  low:    { color: C.low ?? "#378ADD",    bg: C.lowBg ?? "#0D1A2A",    border: C.lowBorder ?? "#0D3558",    label: "Low"    },
});

const getColumnConfig = (C: any) => ({
  "todo":        { label: "To do",       accent: C.todo ?? "#85B7EB",   countColor: C.todo ?? "#85B7EB"   },
  "in-progress": { label: "In progress", accent: C.inprog ?? "#EF9F27", countColor: C.inprog ?? "#EF9F27" },
  "completed":   { label: "Completed",   accent: C.done ?? "#5DCAA5",   countColor: C.done ?? "#5DCAA5"   },
});

const CustomFieldTextInput = ({ field, initialValue, onSave, isViewer }: any) => {
  const [val, setVal] = useState(initialValue !== undefined ? String(initialValue) : "");
  
  useEffect(() => {
    setVal(initialValue !== undefined ? String(initialValue) : "");
  }, [initialValue]);

  return (
    <View style={[s.inputWrap, { marginBottom: 12 }]}>
      <TextInput
        style={s.input}
        placeholder={field.type === "number" ? "Enter number..." : field.type === "date" ? "YYYY-MM-DD" : "Enter text..."}
        placeholderTextColor={C.textMuted}
        value={val}
        onChangeText={setVal}
        onBlur={() => {
          const currentString = initialValue !== undefined ? String(initialValue) : "";
          if (val !== currentString) {
            let processedVal: any = val;
            if (field.type === "number") {
              processedVal = val.trim() === "" ? 0 : Number(val);
            }
            onSave(field.name, processedVal);
          }
        }}
        editable={!isViewer}
        keyboardType={field.type === "number" ? "numeric" : "default"}
      />
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const router = useRouter();
  const { user, activeProject, setActiveProject, activeWorkspace, themeColor, C, refreshProjects } = useApp();

  const wsMember = activeWorkspace?.members?.find((m: any) => getUserId(m.user) === user?._id);
  const isWorkspaceViewer = wsMember?.role === "viewer";
  const projMember = activeProject?.members?.find((m: any) => getUserId(m.user) === user?._id);
  const isProjectViewer = projMember?.role === "viewer";
  const isViewer = isWorkspaceViewer || isProjectViewer;


  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const estHours = selectedTask?.estimatedHours || 0;
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string; fileType: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // Advanced feature views states
  const [activeView, setActiveView] = useState<"board" | "calendar" | "timeline" | "workload" | "bulk" | "trash">("board");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Time logging and Start date states
  const [estimatedHours, setEstimatedHours] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [loggedHours, setLoggedHours] = useState("");
  const [logDescription, setLogDescription] = useState("");
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [csvInputText, setCsvInputText] = useState("");

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("month");
  const [workloadTaskFilter, setWorkloadTaskFilter] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [hoverStatus, setHoverStatus] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number>(0);
  const [scrollX, setScrollX] = useState(0);
  const [boardScrollEnabled, setBoardScrollEnabled] = useState(true);

  // Filter & Sort states
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterDueDate, setFilterDueDate] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("position");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  // Project Settings (Columns & Custom Fields) States
  const [projectSettingsModalVisible, setProjectSettingsModalVisible] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"columns" | "fields">("columns");
  const [newColLabel, setNewColLabel] = useState("");
  const [newColColor, setNewColColor] = useState("#A8ACB9");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date" | "boolean">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Saved Filters States
  const [savedFiltersList, setSavedFiltersList] = useState<any[]>([]);
  const [newFilterPresetName, setNewFilterPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const loadSavedFilters = async () => {
    if (!activeProject) return;
    try {
      const res = await getSavedFiltersApi(activeProject._id);
      if (res.success) {
        setSavedFiltersList(res.filters);
      }
    } catch (err) {
      console.error("Failed to load saved filters:", err);
    }
  };

  useEffect(() => {
    if (filterPanelVisible && activeProject) {
      loadSavedFilters();
    }
  }, [filterPanelVisible, activeProject]);

  const handleAddColumn = async () => {
    if (!activeProject) return;
    if (!newColLabel.trim()) {
      Alert.alert("Error", "Column label is required.");
      return;
    }
    const currentCols = activeProject.columns && activeProject.columns.length > 0 ? [...activeProject.columns] : [...DEFAULT_BOARD_COLUMNS];
    const newId = newColLabel.trim().toLowerCase().replace(/\s+/g, "-");
    
    if (currentCols.some(c => c.id === newId)) {
      Alert.alert("Error", "A column with this label or ID already exists.");
      return;
    }

    const updatedCols = [...currentCols, { id: newId, label: newColLabel.trim(), color: newColColor }];
    try {
      const res = await updateProjectColumnsApi(activeProject._id, updatedCols);
      if (res.success) {
        setActiveProject(res.project);
        setNewColLabel("");
        await refreshProjects();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to add column.");
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!activeProject) return;
    const currentCols = activeProject.columns && activeProject.columns.length > 0 ? [...activeProject.columns] : [...DEFAULT_BOARD_COLUMNS];
    if (currentCols.length <= 1) {
      Alert.alert("Error", "You must keep at least one column.");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this column? Tasks in this status will remain but their status column will be removed from the board.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedCols = currentCols.filter(c => c.id !== colId);
            try {
              const res = await updateProjectColumnsApi(activeProject._id, updatedCols);
              if (res.success) {
                setActiveProject(res.project);
                await refreshProjects();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete column.");
            }
          }
        }
      ]
    );
  };

  const handleAddCustomField = async () => {
    if (!activeProject) return;
    if (!newFieldName.trim()) {
      Alert.alert("Error", "Field name is required.");
      return;
    }
    const currentFields = activeProject.customFields || [];
    if (currentFields.some(f => f.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
      Alert.alert("Error", "A custom field with this name already exists.");
      return;
    }

    const updatedFields = [...currentFields, { name: newFieldName.trim(), type: newFieldType, required: newFieldRequired }];
    try {
      const res = await updateProjectCustomFieldsApi(activeProject._id, updatedFields);
      if (res.success) {
        setActiveProject(res.project);
        setNewFieldName("");
        setNewFieldType("text");
        setNewFieldRequired(false);
        await refreshProjects();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to add custom field.");
    }
  };

  const handleDeleteCustomField = async (fieldName: string) => {
    if (!activeProject) return;
    const currentFields = activeProject.customFields || [];
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this custom field? Task-level values for this field will remain in database but will not be visible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedFields = currentFields.filter(f => f.name !== fieldName);
            try {
              const res = await updateProjectCustomFieldsApi(activeProject._id, updatedFields);
              if (res.success) {
                setActiveProject(res.project);
                await refreshProjects();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete custom field.");
            }
          }
        }
      ]
    );
  };

  const handleSaveCustomFieldVal = async (fieldName: string, value: any) => {
    if (!selectedTask) return;
    const currentTaskFields = selectedTask.customFields || [];
    let updatedTaskFields = [...currentTaskFields];
    const fieldIdx = updatedTaskFields.findIndex(f => f.name === fieldName);
    
    if (fieldIdx >= 0) {
      updatedTaskFields[fieldIdx] = { name: fieldName, value };
    } else {
      updatedTaskFields.push({ name: fieldName, value });
    }

    try {
      const res = await updateTask(selectedTask._id, { customFields: updatedTaskFields });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update custom field.");
    }
  };

  const handleSaveFilterPreset = async () => {
    if (!activeProject) return;
    if (!newFilterPresetName.trim()) {
      Alert.alert("Error", "Preset name is required.");
      return;
    }
    setIsSavingPreset(true);
    try {
      const query = {
        filterAssignee,
        filterPriority,
        filterDueDate,
        filterLabel,
        sortBy,
        sortOrder
      };
      const res = await saveFilterApi({
        name: newFilterPresetName.trim(),
        project: activeProject._id,
        query
      });
      if (res.success) {
        Alert.alert("Success", "Filter preset saved successfully!");
        setNewFilterPresetName("");
        await loadSavedFilters();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to save filter preset.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleApplyPreset = (preset: any) => {
    const q = preset.query || {};
    setFilterAssignee(q.filterAssignee ?? null);
    setFilterPriority(q.filterPriority ?? null);
    setFilterDueDate(q.filterDueDate ?? null);
    setFilterLabel(q.filterLabel ?? null);
    setSortBy(q.sortBy ?? "position");
    setSortOrder(q.sortOrder ?? "asc");
  };

  const handleDeletePreset = async (filterId: string) => {
    try {
      const res = await deleteSavedFilterApi(filterId);
      if (res.success) {
        await loadSavedFilters();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to delete preset.");
    }
  };

  // Archived states
  const [archivedModalVisible, setArchivedModalVisible] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const openArchivedLog = async () => {
    setArchivedModalVisible(true);
    await loadArchivedTasks();
  };

  const loadArchivedTasks = async () => {
    if (!activeProject) return;
    setLoadingArchived(true);
    try {
      const res = await getArchivedProjectTasks(activeProject._id);
      if (res.success) {
        setArchivedTasks(res.tasks);
      }
    } catch (err) {
      console.error("Error loading archived tasks:", err);
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleToggleArchiveTask = async (task: Task) => {
    Alert.alert(
      "Archive task",
      "Archive this task? It will be removed from the active board.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: async () => {
            try {
              const res = await updateTask(task._id, { isArchived: true });
              if (res.success) {
                setDetailModalVisible(false);
                setSelectedTask(null);
                await loadTasks();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to archive task.");
            }
          }
        }
      ]
    );
  };

  const handleRestoreTask = async (task: Task) => {
    try {
      const res = await updateTask(task._id, { isArchived: false });
      if (res.success) {
        await loadArchivedTasks();
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to restore task.");
    }
  };

  const dragInfoRef = React.useRef({
    draggingTask: null as Task | null,
    hoverStatus: null as string | null,
    hoverIndex: 0,
    scrollX: 0,
  });

  useEffect(() => {
    dragInfoRef.current = {
      draggingTask,
      hoverStatus,
      hoverIndex,
      scrollX,
    };
  }, [draggingTask, hoverStatus, hoverIndex, scrollX]);

  const handleDragStart = (task: Task, pageX: number, pageY: number) => {
    if (isViewer) return;
    setDraggingTask(task);
    setDragX(pageX);
    setDragY(pageY);
    setHoverStatus(task.status);
    setBoardScrollEnabled(false);
  };

  const handleInsertMarkdown = (syntax: string, isEditDetails: boolean = false) => {
    if (isEditDetails) {
      setEditDescText((prev) => prev + syntax);
    } else {
      setDescription((prev) => prev + syntax);
    }
  };

  const handleDragEnd = async () => {
    const { draggingTask: task, hoverStatus: status, hoverIndex: index } = dragInfoRef.current;
    resetDragState();
    if (!task || !status) return;

    try {
      const res = await updateTask(task._id, {
        status,
        position: index,
      });
      if (res.success) {
        await loadTasks();
      }
    } catch (err) {
      console.error("Failed to move task:", err);
      Alert.alert("Error", "Failed to move task.");
    }
  };

  const resetDragState = () => {
    setDraggingTask(null);
    setHoverStatus(null);
    setHoverIndex(0);
    setBoardScrollEnabled(true);
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => dragInfoRef.current.draggingTask !== null,
      onMoveShouldSetPanResponder: () => dragInfoRef.current.draggingTask !== null,
      onPanResponderMove: (evt, gestureState) => {
        setDragX(gestureState.moveX);
        setDragY(gestureState.moveY);

        const activeColumns = activeProject?.columns && activeProject.columns.length > 0 ? activeProject.columns : DEFAULT_BOARD_COLUMNS;
        const currentScrollX = dragInfoRef.current.scrollX;
        const contentX = gestureState.moveX + currentScrollX;
        const colIndex = Math.max(0, Math.min(activeColumns.length - 1, Math.floor(contentX / 292)));
        const hoverCol = activeColumns[colIndex].id;

        setHoverStatus(hoverCol);

        const relativeY = Math.max(0, gestureState.moveY - 160);
        const index = Math.floor(relativeY / 120);
        setHoverIndex(index);
      },
      onPanResponderRelease: () => {
        handleDragEnd();
      },
      onPanResponderTerminate: () => {
        resetDragState();
      },
    })
  ).current;

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [createRecurringFrequency, setCreateRecurringFrequency] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [createDependencies, setCreateDependencies] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Detail
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Label management states
  const [detailLabelInput, setDetailLabelInput] = useState("");
  
  // Mention suggestion states
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<"newComment" | "editComment" | "editDesc" | "createDesc" | null>(null);

  const getMentionSearchQuery = (text: string) => {
    const match = text.match(/@(\w*)$/);
    return match ? match[1] : null;
  };

  const getProjectMembers = () => {
    if (!activeProject || !activeProject.members) return [];
    return activeProject.members
      .map((m: any) => m.user)
      .filter((u: any) => u && typeof u === "object");
  };

  const handleSelectMention = (userObj: any) => {
    const mentionText = `@${userObj.username.firstname}_${userObj.username.lastname} `;
    
    if (mentionTarget === "newComment") {
      const updated = newCommentContent.replace(/@\w*$/, mentionText);
      setNewCommentContent(updated);
    } else if (mentionTarget === "editComment") {
      const updated = editCommentText.replace(/@\w*$/, mentionText);
      setEditCommentText(updated);
    } else if (mentionTarget === "editDesc") {
      const updated = editDescText.replace(/@\w*$/, mentionText);
      setEditDescText(updated);
    } else if (mentionTarget === "createDesc") {
      const updated = description.replace(/@\w*$/, mentionText);
      setDescription(updated);
    }
    
    setMentionQuery(null);
    setMentionTarget(null);
  };

  const handleNewCommentChangeText = (text: string) => {
    setNewCommentContent(text);
    const query = getMentionSearchQuery(text);
    if (query !== null) {
      setMentionQuery(query);
      setMentionTarget("newComment");
    } else {
      setMentionQuery(null);
      setMentionTarget(null);
    }
  };

  const handleEditCommentChangeText = (text: string) => {
    setEditCommentText(text);
    const query = getMentionSearchQuery(text);
    if (query !== null) {
      setMentionQuery(query);
      setMentionTarget("editComment");
    } else {
      setMentionQuery(null);
      setMentionTarget(null);
    }
  };

  const handleEditDescChangeText = (text: string) => {
    setEditDescText(text);
    const query = getMentionSearchQuery(text);
    if (query !== null) {
      setMentionQuery(query);
      setMentionTarget("editDesc");
    } else {
      setMentionQuery(null);
      setMentionTarget(null);
    }
  };

  const handleCreateDescChangeText = (text: string) => {
    setDescription(text);
    const query = getMentionSearchQuery(text);
    if (query !== null) {
      setMentionQuery(query);
      setMentionTarget("createDesc");
    } else {
      setMentionQuery(null);
      setMentionTarget(null);
    }
  };

  const renderMentionSuggestions = (target: "newComment" | "editComment" | "editDesc" | "createDesc") => {
    if (mentionQuery === null || mentionTarget !== target) return null;

    const query = mentionQuery.toLowerCase();
    const members = getProjectMembers();
    const filtered = members.filter((u: any) => {
      const firstname = (u.username?.firstname || "").toLowerCase();
      const lastname = (u.username?.lastname || "").toLowerCase();
      return firstname.startsWith(query) || lastname.startsWith(query);
    });

    if (filtered.length === 0) return null;

    return (
      <View style={{
        backgroundColor: "#1E2130",
        borderColor: "#2D354E",
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
        marginBottom: 8,
        maxHeight: 150,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 9999,
      }}>
        <Text style={{ color: "#8B92A9", fontSize: 9, fontWeight: "bold", paddingHorizontal: 8, paddingVertical: 4 }}>
          SUGGESTED TEAM MEMBERS
        </Text>
        <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
          {filtered.map((u: any) => {
            const fullName = `${u.username.firstname} ${u.username.lastname}`;
            const usernameHandle = `@${u.username.firstname}_${u.username.lastname}`;
            return (
              <TouchableOpacity
                key={u._id}
                onPress={() => handleSelectMention(u)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: "#161922",
                  marginVertical: 2,
                  gap: 8,
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: themeColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text style={{ color: "#000", fontSize: 9, fontWeight: "bold" }}>
                    {u.username.firstname[0]}{u.username.lastname[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{fullName}</Text>
                  <Text style={{ color: "#8B92A9", fontSize: 9 }}>{usernameHandle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };
  const [customLabelInput, setCustomLabelInput] = useState("");
  const [createLabels, setCreateLabels] = useState<string[]>([]);

  const handleAddLabelToTask = async () => {
    if (!selectedTask || !detailLabelInput.trim()) return;
    const newLabel = detailLabelInput.trim();
    const currentLabels = selectedTask.labels || [];
    if (currentLabels.includes(newLabel)) return;

    const updatedLabels = [...currentLabels, newLabel];
    try {
      const res = await updateTask(selectedTask._id, { labels: updatedLabels });
      if (res.success) {
        setSelectedTask(res.task);
        setDetailLabelInput("");
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to add label.");
    }
  };

  const handleRemoveLabelFromTask = async (labelToRemove: string) => {
    if (!selectedTask) return;
    const currentLabels = selectedTask.labels || [];
    const updatedLabels = currentLabels.filter(l => l !== labelToRemove);
    try {
      const res = await updateTask(selectedTask._id, { labels: updatedLabels });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to remove label.");
    }
  };

  useEffect(() => {
    if (activeProject) loadTasks();
  }, [activeProject]);

  useEffect(() => {
    if (activeView === "trash") {
      loadTrashTasks();
    }
  }, [activeView, activeProject]);

  useEffect(() => {
    startConnectivityMonitoring();
    const unsub = subscribeToOnlineStatus((status) => {
      setIsOnline(status);
      if (status) {
        syncOfflineQueue(async (action, success, res) => {
          if (success) {
            await loadTasks();
          }
        });
      }
    });

    return () => {
      unsub();
      stopConnectivityMonitoring();
    };
  }, []);

  const loadTasks = async () => {
    if (!activeProject) return;
    try {
      const res = await getProjectTasks(activeProject._id);
      if (res.success) {
        setTasks(res.tasks);
        await cacheData(`tasks_${activeProject._id}`, res.tasks);
      }
    } catch (err) {
      console.error("Error loading tasks, falling back to cache:", err);
      const cached = await getCachedData<Task[]>(`tasks_${activeProject._id}`);
      if (cached) {
        setTasks(cached);
      }
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
        labels: createLabels,
        dependencies: createDependencies.length > 0 ? createDependencies : undefined,
        recurring: createRecurringFrequency !== "none" ? { isRecurring: true, frequency: createRecurringFrequency } : undefined,
      });
      if (res.success) {
        setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setAssignedTo([]);
        setCreateRecurringFrequency("none"); setCreateDependencies([]);
        setCreateModalVisible(false);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to create task.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (task: Task, status: string) => {
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

  const handleUpdateDescription = async () => {
    if (!selectedTask) return;
    try {
      const res = await updateTask(selectedTask._id, { description: editDescText.trim() });
      if (res.success) {
        setSelectedTask(res.task);
        setIsEditingDesc(false);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update description.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert("Delete task", "Soft-delete this task? You can restore it from the Trash Bin or undo this action now.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Find task locally before deletion to keep its title for the banner
            const taskToDelete = tasks.find(t => t._id === taskId);
            const res = await deleteTask(taskId);
            if (res.success) {
              setDetailModalVisible(false);
              setSelectedTask(null);
              if (taskToDelete) {
                setUndoTask(taskToDelete);
                setShowUndoBanner(true);
                setTimeout(() => {
                  setShowUndoBanner(false);
                }, 5000);
              }
              await loadTasks();
            }
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to delete task.");
          }
        },
      },
    ]);
  };

  const handleUndoDelete = async () => {
    if (!undoTask) return;
    try {
      const res = await restoreTask(undoTask._id);
      if (res.success) {
        setShowUndoBanner(false);
        setUndoTask(null);
        await loadTasks();
      }
    } catch (err) {
      console.error("Failed to undo delete:", err);
    }
  };

  const loadTrashTasks = async () => {
    if (!activeProject) return;
    setLoadingTrash(true);
    try {
      const res = await getTrashTasks(activeProject._id);
      if (res.success) {
        setTrashTasks(res.tasks);
      }
    } catch (err) {
      console.error("Failed to load trash tasks:", err);
    } finally {
      setLoadingTrash(false);
    }
  };

  const handleRestoreTaskFromTrash = async (taskId: string) => {
    try {
      const res = await restoreTask(taskId);
      if (res.success) {
        await loadTrashTasks();
        await loadTasks();
        Alert.alert("Task restored", "Task has been successfully restored.");
      }
    } catch (err) {
      console.error("Failed to restore task:", err);
    }
  };

  const handlePermanentDeleteTask = async (taskId: string) => {
    Alert.alert("Permanently delete task", "This action is irreversible. The task and all associated comments will be permanently erased.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete permanently",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await deleteTaskPermanently(taskId);
            if (res.success) {
              await loadTrashTasks();
            }
          } catch (err) {
            console.error("Failed to delete permanently:", err);
          }
        }
      }
    ]);
  };

  const handleBulkUpdate = async (updates: any) => {
    if (selectedTasks.length === 0) return;
    try {
      const res = await bulkUpdateTasks(selectedTasks, updates);
      if (res.success) {
        setSelectedTasks([]);
        await loadTasks();
        Alert.alert("Success", "Bulk updates applied successfully.");
      }
    } catch (err) {
      console.error("Failed to bulk update:", err);
      Alert.alert("Error", "Failed to perform bulk actions.");
    }
  };

  const handleExportCSV = async () => {
    if (!activeProject) return;
    if (tasks.length === 0) {
      Alert.alert("No tasks", "There are no tasks to export.");
      return;
    }
    try {
      let csvContent = "Title,Description,Status,Priority,Due Date,Start Date,Estimated Hours,Actual Hours\n";
      tasks.forEach(t => {
        const title = `"${t.title.replace(/"/g, '""')}"`;
        const desc = `"${(t.description || "").replace(/"/g, '""')}"`;
        const status = t.status;
        const priority = t.priority;
        const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "";
        const start = t.startDate ? new Date(t.startDate).toLocaleDateString() : "";
        const est = t.estimatedHours || 0;
        const act = t.actualHours || 0;
        csvContent += `${title},${desc},${status},${priority},${due},${start},${est},${act}\n`;
      });

      const result = await Share.share({
        message: csvContent,
        title: `${activeProject.name} Tasks Export`,
      });
      if (result.action === Share.sharedAction) {
        console.log("CSV shared successfully.");
      }
    } catch (err) {
      console.error("CSV Export failed:", err);
    }
  };

  const handleImportCSV = async (csvText: string) => {
    if (!activeProject) return;
    if (!csvText.trim()) {
      Alert.alert("Empty input", "Please enter valid CSV text.");
      return;
    }
    try {
      const lines = csvText.split("\n").filter(l => l.trim().length > 0);
      const rows = lines.slice(1);
      const parsedTasks = rows.map(row => {
        const parts = row.split(",").map(p => p.replace(/^"|"$/g, "").trim());
        return {
          title: parts[0] || "Imported Task",
          description: parts[1] || "",
          status: (parts[2] || "todo") as any,
          priority: (parts[3] || "medium") as any,
          dueDate: parts[4] || undefined,
          startDate: parts[5] || undefined,
          estimatedHours: Number(parts[6]) || 0,
        };
      });

      for (const t of parsedTasks) {
        await createTask({
          title: t.title,
          description: t.description || undefined,
          project: activeProject._id,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          startDate: t.startDate,
          estimatedHours: t.estimatedHours,
        });
      }

      await loadTasks();
      Alert.alert("Success", `Successfully imported ${parsedTasks.length} tasks.`);
    } catch (err) {
      console.error("CSV Import failed:", err);
      Alert.alert("Import failed", "Make sure the CSV format is correct: Title,Description,Status,Priority,Due Date,Start Date,Estimated Hours");
    }
  };

  const handleLogTime = async () => {
    if (!selectedTask || !loggedHours || isNaN(Number(loggedHours))) {
      Alert.alert("Invalid input", "Please enter a valid number of hours.");
      return;
    }
    try {
      const res = await logTime(selectedTask._id, Number(loggedHours), logDescription.trim());
      if (res.success) {
        setSelectedTask(res.task);
        setLoggedHours("");
        setLogDescription("");
        await loadTasks();
      }
    } catch (err) {
      console.error("Failed to log time:", err);
      Alert.alert("Error", "Failed to log time.");
    }
  };

  const handleDeleteTimeLog = async (logId: string) => {
    if (!selectedTask) return;
    try {
      const res = await deleteTimeLog(selectedTask._id, logId);
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err) {
      console.error("Failed to delete time log:", err);
    }
  };

  const handleUpdateEstimate = async (est: string) => {
    if (!selectedTask) return;
    const estNum = Number(est);
    if (isNaN(estNum)) return;
    try {
      const res = await updateTask(selectedTask._id, { estimatedHours: estNum });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err) {
      console.error("Failed to update estimate:", err);
    }
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

  const handleUpdateRecurring = async (freq: "none" | "daily" | "weekly" | "monthly") => {
    if (!selectedTask) return;
    try {
      const res = await updateTask(selectedTask._id, {
        recurring: {
          isRecurring: freq !== "none",
          frequency: freq,
        },
      });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update recurrence.");
    }
  };

  const handleToggleDependency = async (depId: string) => {
    if (!selectedTask) return;
    const currentDeps = selectedTask.dependencies || [];
    const isAlreadyDep = currentDeps.includes(depId);
    const updatedDeps = isAlreadyDep
      ? currentDeps.filter((id) => id !== depId)
      : [...currentDeps, depId];

    try {
      const res = await updateTask(selectedTask._id, { dependencies: updatedDeps });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update dependencies.");
    }
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
    if (isViewer) return;
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

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const res = await updateComment(commentId, content);
      if (res.success) {
        setEditingCommentId(null);
        setEditCommentText("");
        if (selectedTask) await loadComments(selectedTask._id);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update comment.");
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      const res = await toggleCommentReaction(commentId, emoji);
      if (res.success && selectedTask) {
        await loadComments(selectedTask._id);
      }
    } catch (err: any) {
      console.error("Failed to toggle reaction:", err);
    }
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

  const [isPinned, setIsPinned] = useState(false);

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setEditDescText(task.description || "");
    setIsEditingDesc(false);
    setDetailModalVisible(true);
    
    try {
      const pinRes = await getPinnedItemsApi();
      if (pinRes.success) {
        const pinned = pinRes.pinnedTasks.some((t: any) => t._id === task._id);
        setIsPinned(pinned);
      }
    } catch (err) {
      console.error("Check pinned tasks error:", err);
    }

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

  const getFilteredAndSortedTasks = () => {
    let result = [...tasks];

    // 1. Filter by Assignee
    if (filterAssignee) {
      result = result.filter((t) => {
        const assignees = t.assignedTo || [];
        return assignees.some((a: any) => (typeof a === "object" ? a._id : a) === filterAssignee);
      });
    }

    // 2. Filter by Priority
    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }

    // 3. Filter by Label
    if (filterLabel) {
      result = result.filter((t) => t.labels && t.labels.includes(filterLabel));
    }

    // 4. Filter by Due Date
    if (filterDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      result = result.filter((t) => {
        if (!t.dueDate) return false;
        const dDate = new Date(t.dueDate);
        
        if (filterDueDate === "overdue") {
          return dDate < today && t.status !== "completed";
        } else if (filterDueDate === "today") {
          return dDate >= today && dDate < tomorrow;
        } else if (filterDueDate === "week") {
          return dDate >= today && dDate <= endOfWeek;
        }
        return true;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof Task];
      let valB: any = b[sortBy as keyof Task];

      if (sortBy === "priority") {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        valA = priorityWeight[a.priority] || 0;
        valB = priorityWeight[b.priority] || 0;
      }

      if (!valA && valA !== 0) return sortOrder === "asc" ? 1 : -1;
      if (!valB && valB !== 0) return sortOrder === "asc" ? -1 : 1;

      if (typeof valA === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (valA instanceof Date || !isNaN(Date.parse(valA))) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });

    return result;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "calendar": {
        const { firstDay, totalDays } = getDaysInMonth(currentMonth);
        const days = [];
        for (let i = 0; i < firstDay; i++) {
          days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
          days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
        }

        const selectedStr = selectedCalendarDate.toISOString().split("T")[0];
        const dueTasksToday = tasks.filter(t => t.dueDate && t.dueDate.split("T")[0] === selectedStr);

        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            {/* Mode & Navigation Header */}
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
              <View style={[s.row, { gap: 6 }]}>
                {["month", "week", "day"].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setCalendarMode(mode as any)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: calendarMode === mode ? themeColor : C.card,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: calendarMode === mode ? "#0C101B" : C.textSecondary, textTransform: "capitalize" }}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[s.row, { gap: 12 }]}>
                <TouchableOpacity onPress={() => {
                  const prev = new Date(currentMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentMonth(prev);
                }}>
                  <Ionicons name="chevron-back" size={20} color={C.textPrimary} />
                </TouchableOpacity>
                <Text style={{ color: C.textPrimary, fontWeight: "700" }}>
                  {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                </Text>
                <TouchableOpacity onPress={() => {
                  const next = new Date(currentMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonth(next);
                }}>
                  <Ionicons name="chevron-forward" size={20} color={C.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {calendarMode === "month" && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16 }}>
                {/* Weekday headers */}
                <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 8 }}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <Text key={day} style={{ color: C.textSecondary, fontSize: 11, width: 36, textAlign: "center", fontWeight: "600" }}>{day}</Text>
                  ))}
                </View>

                {/* Day cells */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" }}>
                  {days.map((day, idx) => {
                    if (!day) return <View key={`empty-${idx}`} style={{ width: 36, height: 36, margin: 4 }} />;
                    
                    const dateStr = day.toISOString().split("T")[0];
                    const tasksDue = tasks.filter(t => t.dueDate && t.dueDate.split("T")[0] === dateStr);
                    const isSelected = selectedCalendarDate.getDate() === day.getDate() && selectedCalendarDate.getMonth() === day.getMonth();

                    return (
                      <TouchableOpacity
                        key={dateStr}
                        onPress={() => setSelectedCalendarDate(day)}
                        style={{
                          width: 36,
                          height: 36,
                          margin: 4,
                          borderRadius: 18,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? themeColor : "transparent",
                          borderWidth: tasksDue.length > 0 && !isSelected ? 1 : 0,
                          borderColor: themeColor,
                        }}
                      >
                        <Text style={{ color: isSelected ? "#0C101B" : C.textPrimary, fontWeight: "600", fontSize: 12 }}>
                          {day.getDate()}
                        </Text>
                        {tasksDue.length > 0 && (
                          <View style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? "#0C101B" : themeColor,
                            position: "absolute",
                            bottom: 4
                          }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {calendarMode === "week" && (
              <View style={{ marginBottom: 16 }}>
                {/* Render current week */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const startOfWeek = new Date(selectedCalendarDate);
                  const dayOfWeek = startOfWeek.getDay();
                  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + i);
                  
                  const dStr = startOfWeek.toISOString().split("T")[0];
                  const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.split("T")[0] === dStr);
                  const isToday = new Date().toDateString() === startOfWeek.toDateString();

                  return (
                    <View key={dStr} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: isToday ? themeColor : C.cardBorder }}>
                      <Text style={{ color: isToday ? themeColor : C.textPrimary, fontWeight: "700", marginBottom: 8 }}>
                        {startOfWeek.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}
                      </Text>
                      {dayTasks.length === 0 ? (
                        <Text style={{ color: C.textSecondary, fontSize: 11 }}>No tasks due</Text>
                      ) : (
                        dayTasks.map(t => (
                          <TouchableOpacity
                            key={t._id}
                            onPress={() => openTaskDetail(t)}
                            style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}
                          >
                            <Text style={{ color: C.textPrimary, fontWeight: "600", fontSize: 13 }}>{t.title}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* List of Tasks for selected day */}
            {calendarMode !== "week" && (
              <View>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 12 }}>
                  Tasks Due on {selectedCalendarDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                {dueTasksToday.length === 0 ? (
                  <View style={{ padding: 24, alignItems: "center", backgroundColor: C.card, borderRadius: 16 }}>
                    <Ionicons name="happy-outline" size={32} color={C.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={{ color: C.textSecondary, fontSize: 12 }}>No tasks due on this day</Text>
                  </View>
                ) : (
                  dueTasksToday.map(t => (
                    <TouchableOpacity
                      key={t._id}
                      onPress={() => openTaskDetail(t)}
                      style={{
                        backgroundColor: C.card,
                        borderColor: C.cardBorder,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 10,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 14 }}>{t.title}</Text>
                        <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 4 }}>Priority: {t.priority.toUpperCase()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        );
      }
      case "timeline": {
        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 16, gap: 8 }]}>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", flex: 1 }}>Project Timeline (Gantt Chart)</Text>
              <View style={[s.row, { gap: 8 }]}>
                <TouchableOpacity
                  onPress={handleExportCSV}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder }}
                >
                  <Ionicons name="share-outline" size={12} color={themeColor} style={{ marginRight: 4 }} />
                  <Text style={{ color: themeColor, fontSize: 11, fontWeight: "600" }}>Export CSV</Text>
                </TouchableOpacity>
                {!isViewer && (
                  <TouchableOpacity
                    onPress={() => setImportModalVisible(true)}
                    style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder }}
                  >
                    <Ionicons name="download-outline" size={12} color={themeColor} style={{ marginRight: 4 }} />
                    <Text style={{ color: themeColor, fontSize: 11, fontWeight: "600" }}>Import CSV</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {tasks.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center", backgroundColor: C.card, borderRadius: 16 }}>
                <Text style={{ color: C.textSecondary }}>No tasks to schedule on the timeline.</Text>
              </View>
            ) : (
              tasks.map((t) => {
                const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
                const end = t.dueDate ? new Date(t.dueDate) : null;
                
                // Mock bar width based on date ranges
                let daysSpan = 3;
                if (end) {
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  daysSpan = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                }

                return (
                  <View key={t._id} style={{ backgroundColor: C.card, borderColor: C.cardBorder, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => openTaskDetail(t)} style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 14 }}>{t.title}</Text>
                        <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }}>
                          {start.toLocaleDateString()} — {end ? end.toLocaleDateString() : "No due date"}
                        </Text>
                      </TouchableOpacity>
                      <View style={{ backgroundColor: t.status === "completed" ? "rgba(93,202,165,0.15)" : t.status === "in-progress" ? "rgba(239,159,39,0.15)" : "rgba(255,255,255,0.05)", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", color: t.status === "completed" ? "#5DCAA5" : t.status === "in-progress" ? "#EF9F27" : C.textSecondary }}>
                          {t.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Gantt Bar Visualization */}
                    <View style={{ height: 10, width: "100%", backgroundColor: C.border, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                      <View style={{
                        height: "100%",
                        width: `${Math.min(100, daysSpan * 10)}%`,
                        backgroundColor: t.status === "completed" ? "#5DCAA5" : themeColor,
                        borderRadius: 5
                      }} />
                    </View>

                    {/* Dependencies */}
                    {t.dependencies && t.dependencies.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <Ionicons name="link-outline" size={10} color="#EF9F27" />
                        <Text style={{ color: "#EF9F27", fontSize: 10, fontWeight: "700" }}>Blocked By:</Text>
                        {t.dependencies.map((depId: any) => {
                          const dep = tasks.find(tsk => tsk._id === depId);
                          return (
                            <View key={depId} style={{ backgroundColor: "rgba(239,159,39,0.1)", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                              <Text style={{ color: "#EF9F27", fontSize: 9, fontWeight: "600" }}>
                                {dep ? dep.title : "Incomplete Task"}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        );
      }
      case "workload": {
        const members = activeProject.members || [];
        
        // Filter members by selected task in the workload view
        const filteredMembers = members.filter((member: any) => {
          if (!workloadTaskFilter) return true;
          const u = member.user;
          if (!u) return false;
          const mId = typeof u === "object" ? u._id : u;
          const targetTask = tasks.find(t => t._id === workloadTaskFilter);
          if (!targetTask) return false;
          const assignees = targetTask.assignedTo || [];
          const list = Array.isArray(assignees) ? assignees.map(a => typeof a === "object" ? a._id : a) : [];
          return list.includes(mId);
        });

        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 12 }]}>
              <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700" }}>Team Workload & Allocation</Text>
              <View style={{ backgroundColor: C.card, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: C.cardBorder }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: themeColor }}>
                  {members.length} {members.length === 1 ? "Member" : "Members"} Total
                </Text>
              </View>
            </View>

            {/* Task Filter for Workload */}
            {members.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: "600", marginBottom: 8 }}>
                  Filter Members by Assigned Task:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    onPress={() => setWorkloadTaskFilter(null)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: !workloadTaskFilter ? themeColor : C.card,
                      borderWidth: 1,
                      borderColor: !workloadTaskFilter ? themeColor : C.cardBorder,
                      marginRight: 8
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: !workloadTaskFilter ? "#0C101B" : C.textPrimary }}>
                      All Members ({members.length})
                    </Text>
                  </TouchableOpacity>
                  {tasks.map((t) => {
                    // Count how many project members are assigned to this task
                    const assignedCount = members.filter((m: any) => {
                      const mId = typeof m.user === "object" ? m.user._id : m.user;
                      const assignees = t.assignedTo || [];
                      const list = Array.isArray(assignees) ? assignees.map(a => typeof a === "object" ? a._id : a) : [];
                      return list.includes(mId);
                    }).length;

                    if (assignedCount === 0) return null; // Only show tasks that have members assigned

                    const active = workloadTaskFilter === t._id;
                    return (
                      <TouchableOpacity
                        key={t._id}
                        onPress={() => setWorkloadTaskFilter(t._id)}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: active ? themeColor : C.card,
                          borderWidth: 1,
                          borderColor: active ? themeColor : C.cardBorder,
                          marginRight: 8
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "600", color: active ? "#0C101B" : C.textPrimary }}>
                          {t.title} ({assignedCount})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {members.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center", backgroundColor: C.card, borderRadius: 16 }}>
                <Text style={{ color: C.textSecondary }}>No members added to this project.</Text>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center", backgroundColor: C.card, borderRadius: 16 }}>
                <Text style={{ color: C.textSecondary }}>No members assigned to the selected task.</Text>
              </View>
            ) : (
              filteredMembers.map((member: any) => {
                const u = member.user;
                if (!u || typeof u !== "object") return null;

                const mId = u._id;
                const activeAssigned = tasks.filter(t => {
                  const assignees = t.assignedTo || [];
                  const list = Array.isArray(assignees) ? assignees.map(a => typeof a === "object" ? a._id : a) : [];
                  return t.status !== "completed" && list.includes(mId);
                });

                const completedAssigned = tasks.filter(t => {
                  const assignees = t.assignedTo || [];
                  const list = Array.isArray(assignees) ? assignees.map(a => typeof a === "object" ? a._id : a) : [];
                  return t.status === "completed" && list.includes(mId);
                });

                const totalAssigned = activeAssigned.length + completedAssigned.length;
                const estHours = activeAssigned.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                const actHours = activeAssigned.reduce((sum, t) => sum + (t.actualHours || 0), 0);
                
                const isOverloaded = activeAssigned.length > 5 || estHours > 40;
                const completionPct = totalAssigned > 0 ? Math.round((completedAssigned.length / totalAssigned) * 100) : 0;

                // All tasks this member is assigned to
                const memberTasks = [...activeAssigned, ...completedAssigned];

                return (
                  <View key={mId} style={{ backgroundColor: C.card, borderColor: isOverloaded ? "#E24B4A" : C.cardBorder, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColor, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Text style={{ fontWeight: "700", color: "#0C101B", fontSize: 11 }}>
                            {u.username?.firstname?.[0]?.toUpperCase()}{u.username?.lastname?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 14 }}>
                            {u.username?.firstname} {u.username?.lastname}
                          </Text>
                          <Text style={{ color: C.textSecondary, fontSize: 11 }}>{u.email}</Text>
                        </View>
                      </View>

                      {isOverloaded && (
                        <View style={{ backgroundColor: "rgba(226,75,74,0.15)", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="warning-outline" size={10} color="#E24B4A" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#E24B4A" }}>OVERLOADED</Text>
                        </View>
                      )}
                    </View>

                    {/* Task Counts */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <View>
                        <Text style={{ color: C.textSecondary, fontSize: 10, textTransform: "uppercase" }}>Active Tasks</Text>
                        <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 16 }}>{activeAssigned.length}</Text>
                      </View>
                      <View>
                        <Text style={{ color: C.textSecondary, fontSize: 10, textTransform: "uppercase" }}>Hours Estimate</Text>
                        <Text style={{ color: themeColor, fontWeight: "700", fontSize: 16 }}>{estHours}h</Text>
                      </View>
                      <View>
                        <Text style={{ color: C.textSecondary, fontSize: 10, textTransform: "uppercase" }}>Hours Spent</Text>
                        <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 16 }}>{actHours}h</Text>
                      </View>
                      <View>
                        <Text style={{ color: C.textSecondary, fontSize: 10, textTransform: "uppercase" }}>Task Rate</Text>
                        <Text style={{ color: "#5DCAA5", fontWeight: "700", fontSize: 16 }}>{completionPct}%</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ height: 6, width: "100%", backgroundColor: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                      <View style={{ height: "100%", width: `${completionPct}%`, backgroundColor: "#5DCAA5", borderRadius: 3 }} />
                    </View>

                    {/* Assigned Tasks Detail List */}
                    <View style={{ borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 12 }}>
                      <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: "600", marginBottom: 6 }}>
                        Assigned Tasks ({memberTasks.length}):
                      </Text>
                      {memberTasks.length === 0 ? (
                        <Text style={{ color: C.textMuted, fontSize: 11, fontStyle: "italic" }}>No tasks assigned in this project.</Text>
                      ) : (
                        <View style={{ gap: 6 }}>
                          {memberTasks.map(t => (
                            <TouchableOpacity
                              key={t._id}
                              onPress={() => openTaskDetail(t)}
                              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#151823", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 0.5, borderColor: C.border }}
                            >
                              <Text style={{ color: C.textPrimary, fontSize: 12, flex: 1, marginRight: 8 }} numberOfLines={1}>
                                {t.title}
                              </Text>
                              <View style={{ backgroundColor: t.status === "completed" ? "rgba(93,202,165,0.15)" : t.status === "in-progress" ? "rgba(239,159,39,0.15)" : "rgba(168,172,185,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: t.status === "completed" ? "#5DCAA5" : t.status === "in-progress" ? "#EF9F27" : C.textSecondary, fontSize: 9, fontWeight: "700" }}>
                                  {t.status === "completed" ? "Completed" : t.status === "in-progress" ? "In Progress" : "To Do"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        );
      }
      case "bulk": {
        return (
          <View style={s.flex}>
            <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
              <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700" }}>Bulk Edit Mode ({selectedTasks.length} selected)</Text>
                {selectedTasks.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedTasks([])}>
                    <Text style={{ color: themeColor, fontSize: 12, fontWeight: "600" }}>Clear Selection</Text>
                  </TouchableOpacity>
                )}
              </View>

              {tasks.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center", backgroundColor: C.card, borderRadius: 16 }}>
                  <Text style={{ color: C.textSecondary }}>No tasks to edit.</Text>
                </View>
              ) : (
                tasks.map((t) => {
                  const isSelected = selectedTasks.includes(t._id);
                  return (
                    <TouchableOpacity
                      key={t._id}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedTasks(selectedTasks.filter(id => id !== t._id));
                        } else {
                          setSelectedTasks([...selectedTasks, t._id]);
                        }
                      }}
                      style={{
                        backgroundColor: C.card,
                        borderColor: isSelected ? themeColor : C.cardBorder,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 10,
                        flexDirection: "row",
                        alignItems: "center"
                      }}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isSelected ? themeColor : C.textSecondary,
                        backgroundColor: isSelected ? themeColor : "transparent",
                        marginRight: 12,
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#0C101B" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.textPrimary, fontWeight: "700" }}>{t.title}</Text>
                        <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }}>{t.status.toUpperCase()} • Priority: {t.priority.toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Floating Bulk Action Bar */}
            {selectedTasks.length > 0 && (
              <View style={{
                position: "absolute",
                bottom: 24,
                left: 16,
                right: 16,
                backgroundColor: C.card,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: C.cardBorder,
                flexDirection: "row",
                justifyContent: "space-around",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5
              }}>
                <TouchableOpacity onPress={() => handleBulkUpdate({ status: "todo" })} style={{ alignItems: "center" }}>
                  <Ionicons name="ellipse-outline" size={18} color={C.textSecondary} />
                  <Text style={{ color: C.textPrimary, fontSize: 10, marginTop: 4 }}>To Do</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBulkUpdate({ status: "in-progress" })} style={{ alignItems: "center" }}>
                  <Ionicons name="play-circle-outline" size={18} color="#EF9F27" />
                  <Text style={{ color: C.textPrimary, fontSize: 10, marginTop: 4 }}>In Progress</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBulkUpdate({ status: "completed" })} style={{ alignItems: "center" }}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#5DCAA5" />
                  <Text style={{ color: C.textPrimary, fontSize: 10, marginTop: 4 }}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBulkUpdate({ isArchived: true })} style={{ alignItems: "center" }}>
                  <Ionicons name="archive-outline" size={18} color={themeColor} />
                  <Text style={{ color: C.textPrimary, fontSize: 10, marginTop: 4 }}>Archive</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  Alert.alert("Bulk delete", `Move ${selectedTasks.length} tasks to Trash Bin?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => handleBulkUpdate({ isDeleted: true }) }
                  ]);
                }} style={{ alignItems: "center" }}>
                  <Ionicons name="trash-outline" size={18} color="#E24B4A" />
                  <Text style={{ color: C.textPrimary, fontSize: 10, marginTop: 4 }}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }
      case "trash": {
        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 16 }}>Trash Bin (Soft Deleted Items)</Text>

            {loadingTrash ? (
              <ActivityIndicator size="small" color={themeColor} />
            ) : trashTasks.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center", backgroundColor: C.card, borderRadius: 16 }}>
                <Ionicons name="trash-bin-outline" size={32} color={C.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: C.textSecondary, fontSize: 12 }}>Trash bin is empty</Text>
              </View>
            ) : (
              trashTasks.map((t) => (
                <View key={t._id} style={{ backgroundColor: C.card, borderColor: C.cardBorder, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 14 }}>{t.title}</Text>
                  <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 4 }}>
                    Deleted on: {t.deletedAt ? new Date(t.deletedAt).toLocaleString() : "Recently"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => handleRestoreTaskFromTrash(t._id)}
                      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(93,202,165,0.1)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                    >
                      <Ionicons name="refresh-outline" size={12} color="#5DCAA5" style={{ marginRight: 4 }} />
                      <Text style={{ color: "#5DCAA5", fontSize: 11, fontWeight: "700" }}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handlePermanentDeleteTask(t._id)}
                      style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(226,75,74,0.1)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                    >
                      <Ionicons name="alert-circle-outline" size={12} color="#E24B4A" style={{ marginRight: 4 }} />
                      <Text style={{ color: "#E24B4A", fontSize: 11, fontWeight: "700" }}>Erase</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        );
      }
      default: {
        const activeColumns = activeProject?.columns && activeProject.columns.length > 0 ? activeProject.columns : DEFAULT_BOARD_COLUMNS;
        return (
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.flex}
              contentContainerStyle={s.boardContent}
              scrollEnabled={boardScrollEnabled}
              onScroll={(e: any) => setScrollX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
            >
              {activeColumns.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);
                return (
                  <KanbanColumn
                    key={col.id}
                    statusKey={col.id}
                    tasks={colTasks}
                    allTasks={tasks}
                    themeColor={themeColor}
                    onCardPress={openTaskDetail}
                    onDragStart={handleDragStart}
                    hoverStatus={hoverStatus}
                    hoverIndex={hoverIndex}
                    colConfig={col}
                  />
                );
              })}
            </ScrollView>
          );
        }
      }
  };

  const filteredTasks = getFilteredAndSortedTasks();

  // ── Main board ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[s.flex, { backgroundColor: C.bg }]}
      {...(draggingTask ? panResponder.panHandlers : {})}
    >

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>{activeProject.name}</Text>
          <Text style={s.headerTitle}>Task board</Text>
        </View>
        <View style={[s.row, { gap: 8 }]}>
          {!isViewer && (
            <TouchableOpacity
              style={s.headerActionBtn}
              onPress={() => setProjectSettingsModalVisible(true)}
              accessibilityLabel="Project Settings"
            >
              <Ionicons name="settings-outline" size={14} color={C.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.headerActionBtn}
            onPress={() => openArchivedLog()}
          >
            <Ionicons name="archive-outline" size={14} color={C.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterBtn, filterPanelVisible && { borderColor: themeColor }]}
            onPress={() => setFilterPanelVisible(!filterPanelVisible)}
          >
            <Ionicons name="funnel-outline" size={14} color={filterPanelVisible ? themeColor : C.textSecondary} />
            <Text style={[s.filterBtnText, { color: filterPanelVisible ? themeColor : C.textSecondary }]}>Filters</Text>
          </TouchableOpacity>

          {!isViewer && (
            <TouchableOpacity
              style={[s.addTaskBtn, { backgroundColor: themeColor }]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Ionicons name="add" size={16} color="#0C101B" />
              <Text style={s.addTaskBtnText}>Add task</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Offline Status Indicator */}
      {!isOnline && (
        <View style={{ backgroundColor: "#EF9F27", paddingVertical: 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="cloud-offline-outline" size={14} color="#0C101B" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#0C101B" }}>Offline Mode — changes will sync automatically</Text>
        </View>
      )}

      {/* View Switcher Navigation Bar */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: C.bg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {[
            { id: "board", label: "Board", icon: "apps-outline" },
            { id: "calendar", label: "Calendar", icon: "calendar-outline" },
            { id: "timeline", label: "Timeline", icon: "git-commit-outline" },
            { id: "workload", label: "Workload", icon: "people-outline" },
            !isViewer && { id: "bulk", label: "Bulk Actions", icon: "checkbox-outline" },
            !isViewer && { id: "trash", label: "Trash Bin", icon: "trash-outline" },
          ].filter((v): v is { id: string; label: string; icon: string } => typeof v === "object" && v !== null).map((v) => {
            const active = activeView === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  setActiveView(v.id as any);
                  if (v.id !== "bulk") setSelectedTasks([]);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: active ? themeColor : C.card,
                  borderWidth: 1,
                  borderColor: active ? themeColor : C.cardBorder,
                }}
              >
                <Ionicons name={v.icon as any} size={14} color={active ? "#0C101B" : C.textSecondary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#0C101B" : C.textPrimary }}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filters & Sorting Panel */}
      {filterPanelVisible && (
        <View style={s.filterPanel}>
          <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
            <Text style={s.filterPanelTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => {
              setFilterAssignee(null);
              setFilterPriority(null);
              setFilterDueDate(null);
              setFilterLabel(null);
              setSortBy("position");
              setSortOrder("asc");
            }}>
              <Text style={{ fontSize: 11, color: themeColor, fontWeight: "600" }}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {/* Assignee Filter */}
            <View style={s.filterGroup}>
              <Text style={s.filterGroupLabel}>Assignee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
                <TouchableOpacity
                  onPress={() => setFilterAssignee(null)}
                  style={[s.filterChip, !filterAssignee && s.filterChipActive]}
                >
                  <Text style={[s.filterChipText, !filterAssignee && s.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {activeProject.members.map((m: any) => {
                  const mId = typeof m.user === "object" ? m.user._id : m.user;
                  const name = typeof m.user === "object" ? `${m.user.username.firstname} ${m.user.username.lastname}` : "User";
                  const active = filterAssignee === mId;
                  return (
                    <TouchableOpacity
                      key={mId}
                      onPress={() => setFilterAssignee(mId)}
                      style={[s.filterChip, active && s.filterChipActive]}
                    >
                      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={[s.row, { gap: 12, marginBottom: 12 }]}>
            {/* Priority Filter */}
            <View style={s.flex}>
              <Text style={s.filterGroupLabel}>Priority</Text>
              <View style={[s.row, { gap: 6 }]}>
                {["all", "low", "medium", "high"].map((p) => {
                  const active = p === "all" ? !filterPriority : filterPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setFilterPriority(p === "all" ? null : p)}
                      style={[s.filterChip, active && s.filterChipActive, { flex: 1, alignItems: "center" }]}
                    >
                      <Text style={[s.filterChipText, active && s.filterChipTextActive, { textTransform: "capitalize" }]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Due Date Filter */}
            <View style={s.flex}>
              <Text style={s.filterGroupLabel}>Due Date</Text>
              <View style={[s.row, { gap: 6 }]}>
                {[
                  { label: "All", value: null },
                  { label: "Overdue", value: "overdue" },
                  { label: "Today", value: "today" },
                  { label: "Week", value: "week" }
                ].map((item) => {
                  const active = filterDueDate === item.value;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => setFilterDueDate(item.value)}
                      style={[s.filterChip, active && s.filterChipActive, { flex: 1, alignItems: "center" }]}
                    >
                      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Sorting Row */}
          <View style={s.dividerLight} />
          <View style={[s.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <View style={[s.row, { gap: 8 }]}>
              <Text style={s.filterGroupLabel}>Sort By</Text>
              {[
                { label: "Custom", value: "position" },
                { label: "Due Date", value: "dueDate" },
                { label: "Priority", value: "priority" },
                { label: "Created", value: "createdAt" }
              ].map((item) => {
                const active = sortBy === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setSortBy(item.value)}
                    style={[s.sortChip, active && { borderColor: themeColor, backgroundColor: C.border }]}
                  >
                    <Text style={[s.sortChipText, active && { color: themeColor }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              style={s.sortOrderBtn}
            >
              <Ionicons name={sortOrder === "asc" ? "arrow-up" : "arrow-down"} size={14} color={C.textSecondary} />
              <Text style={s.sortOrderBtnText}>{sortOrder.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Filter Presets */}
          <View style={s.dividerLight} />
          <Text style={s.filterGroupLabel}>Saved Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {(savedFiltersList || []).length === 0 ? (
              <Text style={[s.bodyMuted, { fontSize: 11, fontStyle: "italic" }]}>No saved presets yet</Text>
            ) : (
              (savedFiltersList || []).map((preset) => (
                <View
                  key={preset._id}
                  style={[
                    s.row,
                    {
                      backgroundColor: C.card,
                      borderWidth: 0.5,
                      borderColor: C.border,
                      borderRadius: 8,
                      paddingLeft: 10,
                      paddingRight: 6,
                      paddingVertical: 4,
                      marginRight: 8,
                      gap: 6,
                    }
                  ]}
                >
                  <TouchableOpacity onPress={() => handleApplyPreset(preset)}>
                    <Text style={{ fontSize: 11, color: C.textPrimary, fontWeight: "600" }}>{preset.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePreset(preset._id)} style={{ padding: 2 }}>
                    <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Save Current Filters Form */}
          <View style={[s.row, { gap: 8 }]}>
            <View style={[s.flex, s.inputWrap, { paddingVertical: 4 }]}>
              <TextInput
                style={[s.input, { paddingVertical: 6, fontSize: 12 }]}
                placeholder="Preset name (e.g. My bugs)..."
                placeholderTextColor={C.textMuted}
                value={newFilterPresetName}
                onChangeText={setNewFilterPresetName}
              />
            </View>
            <TouchableOpacity
              onPress={handleSaveFilterPreset}
              disabled={isSavingPreset}
              style={[
                s.inlineBtn,
                {
                  backgroundColor: themeColor,
                  opacity: isSavingPreset ? 0.6 : 1,
                  flexDirection: "row",
                  gap: 4,
                }
              ]}
            >
              <Text style={s.inlineBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderActiveView()}

      {/* Undo Delete Toast Banner */}
      {showUndoBanner && undoTask && (
        <View style={{
          position: "absolute",
          bottom: 24,
          left: 20,
          right: 20,
          backgroundColor: "#1E222B",
          borderColor: C.cardBorder,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>
            Task "{undoTask.title}" deleted.
          </Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={{ color: themeColor, fontSize: 13, fontWeight: "700" }}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Card Container */}
      {draggingTask && (
        <View
          style={[
            s.floatingCardContainer,
            {
              left: dragX - 140,
              top: dragY - 60,
            }
          ]}
          pointerEvents="none"
        >
          <TaskCard
            task={draggingTask}
            themeColor={themeColor}
            onPress={() => {}}
            isDragging
          />
        </View>
      )}

      {/* ── Modal: CSV Import ─────────────────────────────────────────────── */}
      <Modal visible={importModalVisible} transparent animationType="fade" onRequestClose={() => setImportModalVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setImportModalVisible(false)} />
          <View style={s.createModal}>
            <Text style={s.modalTitle}>Import Tasks via CSV</Text>
            
            <Text style={[s.bodyMuted, { marginBottom: 12, fontSize: 12 }]}>
              Paste CSV content below. The header row should match:{"\n"}
              <Text style={{ fontWeight: "700", color: themeColor }}>
                Title,Description,Status,Priority,Due Date,Start Date,Estimated Hours
              </Text>
            </Text>

            <View style={[s.inputWrap, s.inputMultiline, { marginBottom: 20 }]}>
              <TextInput
                style={[s.input, { minHeight: 150, textAlignVertical: "top" }]}
                placeholder={"Title,Description,Status,Priority,Due Date,Start Date,Estimated Hours\nImplement UI,Create beautiful user screens,in-progress,high,2026-06-20,2026-06-17,8"}
                placeholderTextColor={C.textMuted}
                value={csvInputText}
                onChangeText={setCsvInputText}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[s.row, { gap: 10 }]}>
              <TouchableOpacity style={[s.flex, s.secondaryBtn]} onPress={() => setImportModalVisible(false)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.flex, s.primaryBtn, { backgroundColor: themeColor }]}
                onPress={async () => {
                  if (!csvInputText.trim()) {
                    Alert.alert("Empty Input", "Please paste CSV content.");
                    return;
                  }
                  try {
                    await handleImportCSV(csvInputText);
                    setCsvInputText("");
                    setImportModalVisible(false);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <Text style={s.primaryBtnText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Create task ─────────────────────────────────────────────── */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setCreateModalVisible(false)} />
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
              <MarkdownToolbar onInsert={(syntax) => handleInsertMarkdown(syntax, false)} />
              <View style={[s.inputWrap, s.inputMultiline, { marginBottom: 16 }]}>
                <TextInput
                  style={[s.input, { minHeight: 72 }]}
                  placeholder="Details about the task"
                  placeholderTextColor={C.textMuted}
                  value={description}
                  onChangeText={handleCreateDescChangeText}
                  multiline
                />
              </View>
              {renderMentionSuggestions("createDesc")}

              <SectionLabel>Priority</SectionLabel>
              <View style={[s.row, { gap: 8, marginBottom: 16 }]}>
                {(["low", "medium", "high"] as const).map((p) => {
                  const cfg = getPriorityConfig(C)[p];
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

              <SectionLabel>Labels</SectionLabel>
              <View style={[s.row, { flexWrap: "wrap", gap: 6, marginBottom: 12 }]}>
                {["Bug", "Feature", "Backend", "Frontend", "Urgent", "Testing"].map((lbl) => {
                  const selected = createLabels.includes(lbl);
                  const colors = getLabelColor(lbl);
                  return (
                    <TouchableOpacity
                      key={lbl}
                      onPress={() => setCreateLabels(prev => 
                        prev.includes(lbl) ? prev.filter(l => l !== lbl) : [...prev, lbl]
                      )}
                      style={[
                        s.formLabelChip,
                        selected
                          ? { backgroundColor: colors.bg, borderColor: colors.text }
                          : { backgroundColor: C.surface, borderColor: C.border }
                      ]}
                    >
                      <Text style={[s.formLabelChipText, { color: selected ? colors.text : C.textSecondary }]}>
                        {lbl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[s.row, { gap: 8, marginBottom: 24 }]}>
                <View style={[s.flex, s.inputWrap, { paddingVertical: 4 }]}>
                  <TextInput
                    style={[s.input, { paddingVertical: 6 }]}
                    placeholder="Add custom label…"
                    placeholderTextColor={C.textMuted}
                    value={customLabelInput}
                    onChangeText={setCustomLabelInput}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (customLabelInput.trim()) {
                      const newLabel = customLabelInput.trim();
                      if (!createLabels.includes(newLabel)) {
                        setCreateLabels(prev => [...prev, newLabel]);
                      }
                      setCustomLabelInput("");
                    }
                  }}
                  style={[s.inlineBtn, { backgroundColor: themeColor }]}
                >
                  <Text style={s.inlineBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <SectionLabel>Recurring frequency</SectionLabel>
              <View style={[s.row, { gap: 8, marginBottom: 16 }]}>
                {(["none", "daily", "weekly", "monthly"] as const).map((freq) => {
                  const selected = createRecurringFrequency === freq;
                  return (
                    <TouchableOpacity
                      key={freq}
                      onPress={() => setCreateRecurringFrequency(freq)}
                      style={[
                        s.priorityBtn,
                        selected
                          ? { backgroundColor: themeColor + "15", borderColor: themeColor }
                          : { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                    >
                      <Text style={[s.priorityBtnText, { color: selected ? themeColor : C.textMuted, textTransform: "capitalize" }]}>
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <SectionLabel>Blocked by (Dependencies)</SectionLabel>
              {tasks.length === 0 ? (
                <Text style={[s.bodyMuted, { marginBottom: 16 }]}>No other tasks available</Text>
              ) : (
                <View style={[s.inputWrap, { marginBottom: 24, paddingVertical: 8 }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {tasks.map((t) => {
                      const selected = createDependencies.includes(t._id);
                      return (
                        <TouchableOpacity
                          key={t._id}
                          onPress={() => setCreateDependencies((prev) =>
                            prev.includes(t._id) ? prev.filter((id) => id !== t._id) : [...prev, t._id]
                          )}
                          style={[
                            s.assigneeChip,
                            selected
                              ? { backgroundColor: C.accentBg, borderColor: C.accent }
                              : { backgroundColor: C.surface, borderColor: C.border }
                          ]}
                        >
                          <Text style={[s.assigneeChipText, { color: selected ? C.accentText : C.textPrimary }]}>
                            {t.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
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
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDetailModalVisible(false)} />
          <View style={s.detailPanel}>
            {/* Drag handle */}
            <View style={s.dragHandle} />

            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Title and Pin button */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={[s.h2, { flex: 1, marginRight: 12, marginBottom: 0 }]}>{selectedTask.title}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const res = await pinTaskApi(selectedTask._id);
                        if (res.success) {
                          setIsPinned(!isPinned);
                        }
                      } catch (err) {
                        console.error("Failed to pin task:", err);
                      }
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name={isPinned ? "star" : "star-outline"} size={22} color={themeColor} />
                  </TouchableOpacity>
                </View>

                {/* Status switcher */}
                <SectionLabel>Status</SectionLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(activeProject?.columns && activeProject.columns.length > 0 ? activeProject.columns : DEFAULT_BOARD_COLUMNS).map((st) => {
                      const active = selectedTask.status === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => handleUpdateStatus(selectedTask, st.id)}
                          style={[
                            s.statusTab,
                            active ? { backgroundColor: themeColor } : {},
                            { minWidth: 80, paddingHorizontal: 12 }
                          ]}
                        >
                          <Text style={[s.statusTabText, { color: active ? "#0C101B" : C.textSecondary }]}>
                            {st.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Info grid */}
                <View style={{ marginBottom: 20, gap: 12 }}>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={[s.infoCell, { flex: 1, borderRightWidth: 0.5, borderRightColor: C.border }]}>
                      <Text style={s.infoCellLabel}>Priority</Text>
                      <Text style={[s.infoCellValue, { color: getPriorityConfig(C)[selectedTask.priority]?.color ?? C.textPrimary }]}>
                        {getPriorityConfig(C)[selectedTask.priority]?.label ?? selectedTask.priority}
                      </Text>
                    </View>
                    <View style={[s.infoCell, { flex: 1 }]}>
                      <Text style={s.infoCellLabel}>Due date</Text>
                      <Text style={s.infoCellValue}>{formatDate(selectedTask.dueDate) || "None"}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 12 }}>
                    <View style={[s.infoCell, { flex: 1, borderRightWidth: 0.5, borderRightColor: C.border }]}>
                      <Text style={s.infoCellLabel}>Start date</Text>
                      <Text style={s.infoCellValue}>{formatDate(selectedTask.startDate) || "None"}</Text>
                    </View>
                    <View style={[s.infoCell, { flex: 1 }]}>
                      <Text style={s.infoCellLabel}>Members</Text>
                      <Text style={s.infoCellValue}>
                        {Array.isArray(selectedTask.assignedTo) ? `${selectedTask.assignedTo.length} assigned` : "Unassigned"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Custom Fields Section */}
                {activeProject.customFields && activeProject.customFields.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <SectionLabel>Custom Fields</SectionLabel>
                    <View style={{ gap: 10 }}>
                      {(activeProject.customFields || []).map((field: any) => {
                        const valObj = selectedTask.customFields?.find((f: any) => f.name === field.name);
                        const initialVal = valObj ? valObj.value : undefined;
                        
                        if (field.type === "boolean") {
                          const active = !!initialVal;
                          return (
                            <View
                              key={field.name}
                              style={[
                                s.row,
                                {
                                  justifyContent: "space-between",
                                  backgroundColor: C.card,
                                  borderWidth: 0.5,
                                  borderColor: C.border,
                                  borderRadius: 10,
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                }
                              ]}
                            >
                              <Text style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}>
                                {field.name}
                                {field.required && <Text style={{ color: C.danger }}> *</Text>}
                              </Text>
                              <TouchableOpacity
                                disabled={isViewer}
                                onPress={() => handleSaveCustomFieldVal(field.name, !active)}
                                style={{
                                  width: 44,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: active ? themeColor : C.border,
                                  padding: 2,
                                  justifyContent: "center",
                                  alignItems: active ? "flex-end" : "flex-start",
                                }}
                              >
                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
                              </TouchableOpacity>
                            </View>
                          );
                        } else {
                          return (
                            <View key={field.name}>
                              <Text style={s.infoCellLabel}>
                                {field.name}
                                {field.required && <Text style={{ color: C.danger }}> *</Text>}
                              </Text>
                              <CustomFieldTextInput
                                field={field}
                                initialValue={initialVal}
                                onSave={handleSaveCustomFieldVal}
                                isViewer={isViewer}
                              />
                            </View>
                          );
                        }
                      })}
                    </View>
                  </View>
                )}

                {/* Description */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <SectionLabel>Description</SectionLabel>
                    {!isViewer && !isEditingDesc && (
                      <TouchableOpacity
                        onPress={() => {
                          setEditDescText(selectedTask.description || "");
                          setIsEditingDesc(true);
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="create-outline" size={14} color={themeColor} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isEditingDesc ? (
                    <View style={{ gap: 8 }}>
                      <MarkdownToolbar onInsert={(syntax) => handleInsertMarkdown(syntax, true)} />
                      <View style={[s.inputWrap, s.inputMultiline]}>
                        <TextInput
                          style={[s.input, { minHeight: 80 }]}
                          placeholder="Task description..."
                          placeholderTextColor={C.textMuted}
                          value={editDescText}
                          onChangeText={handleEditDescChangeText}
                          multiline
                        />
                      </View>
                      {renderMentionSuggestions("editDesc")}
                      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                        <TouchableOpacity
                          onPress={() => setIsEditingDesc(false)}
                          style={[s.inlineBtn, { backgroundColor: "#1E2130" }]}
                        >
                          <Text style={s.inlineBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleUpdateDescription}
                          style={[s.inlineBtn, { backgroundColor: themeColor }]}
                        >
                          <Text style={[s.inlineBtnText, { color: "#0C101B" }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    selectedTask.description ? (
                      <FormattedText text={selectedTask.description} themeColor={themeColor} />
                    ) : (
                      <Text style={[s.bodyMuted, { fontStyle: "italic" }]}>No description provided.</Text>
                    )
                  )}
                </View>

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

                {/* Labels */}
                <SectionLabel>Labels</SectionLabel>
                <View style={[s.row, { flexWrap: "wrap", gap: 6, marginBottom: 12 }]}>
                  {selectedTask.labels?.map((lbl, idx) => {
                    const colors = getLabelColor(lbl);
                    return (
                      <View key={idx} style={[s.formLabelChip, { backgroundColor: colors.bg, borderColor: colors.text }]}>
                        <Text style={[s.formLabelChipText, { color: colors.text }]}>{lbl}</Text>
                        {!isViewer && (
                          <TouchableOpacity onPress={() => handleRemoveLabelFromTask(lbl)} style={{ marginLeft: 4 }}>
                            <Ionicons name="close-circle" size={13} color={colors.text} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  {(!selectedTask.labels || selectedTask.labels.length === 0) && (
                    <Text style={[s.bodyMuted, { marginBottom: 4 }]}>No labels assigned</Text>
                  )}
                </View>
                {!isViewer && (
                  <View style={[s.row, { gap: 8, marginBottom: 20 }]}>
                    <View style={[s.flex, s.inputWrap, { paddingVertical: 4 }]}>
                      <TextInput
                        style={[s.input, { paddingVertical: 6 }]}
                        placeholder="Add label (e.g. Bug, Urgent)…"
                        placeholderTextColor={C.textMuted}
                        value={detailLabelInput}
                        onChangeText={setDetailLabelInput}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAddLabelToTask()}
                      style={[s.inlineBtn, { backgroundColor: themeColor }]}
                    >
                      <Text style={s.inlineBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Attachments */}
                <SectionLabel>Attachments</SectionLabel>
                {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    {selectedTask.attachments.map((att, idx) => {
                      const isImage = att.fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(att.name);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => att.url && setPreviewAttachment(att)}
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
                          <Ionicons name="eye-outline" size={14} color={themeColor} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[s.bodyMuted, { marginBottom: 12 }]}>No attachments yet</Text>
                )}
                {!isViewer && (
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
                )}
                {uploading && (
                  <View style={[s.row, { justifyContent: "center", gap: 8, marginBottom: 16 }]}>
                    <ActivityIndicator size="small" color={themeColor} />
                    <Text style={s.bodyMuted}>Uploading…</Text>
                  </View>
                )}

                {/* Time Tracking */}
                <SectionLabel>Time Tracking</SectionLabel>
                <View style={{ marginBottom: 16 }}>
                  {/* Estimated Hours Input */}
                  <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 12 }]}>
                    <Text style={s.bodyMuted}>Estimated Hours</Text>
                    <View style={[s.inputWrap, { width: 100, paddingVertical: 4 }]}>
                      <TextInput
                        style={[s.input, { paddingVertical: 4, textAlign: "center" }]}
                        placeholder="0"
                        placeholderTextColor={C.textMuted}
                        keyboardType="numeric"
                        defaultValue={estHours ? estHours.toString() : ""}
                        onChangeText={handleUpdateEstimate}
                      />
                    </View>
                  </View>

                  {/* Hours Logged Progress Bar */}
                  {estHours > 0 ? (
                    <View style={{ marginBottom: 16 }}>
                      <View style={[s.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                        <Text style={s.bodyMuted}>Logged vs Estimate</Text>
                        <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>
                          {selectedTask.actualHours || 0} / {estHours} hrs ({Math.round(((selectedTask.actualHours || 0) / estHours) * 100)}%)
                        </Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" }}>
                        <View
                          style={{
                            height: "100%",
                            width: `${Math.min(((selectedTask.actualHours || 0) / estHours) * 100, 100)}%`,
                            backgroundColor: (selectedTask.actualHours || 0) > estHours ? "#EF4444" : "#10B981"
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[s.bodyMuted, { fontStyle: "italic" }]}>Set estimated hours to track progress.</Text>
                    </View>
                  )}

                  {/* Form to Log Time */}
                  {!isViewer && (
                    <View style={{ marginBottom: 16, gap: 8 }}>
                      <Text style={[s.bodyMuted, { fontSize: 12, fontWeight: "600", marginBottom: 2 }]}>Log New Time Entry</Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={[s.inputWrap, { flex: 1, paddingVertical: 4 }]}>
                          <TextInput
                            style={[s.input, { paddingVertical: 6 }]}
                            placeholder="Hours (e.g. 2.5)"
                            placeholderTextColor={C.textMuted}
                            keyboardType="numeric"
                            value={loggedHours}
                            onChangeText={setLoggedHours}
                          />
                        </View>
                        <View style={[s.inputWrap, { flex: 2, paddingVertical: 4 }]}>
                          <TextInput
                            style={[s.input, { paddingVertical: 6 }]}
                            placeholder="Activity description"
                            placeholderTextColor={C.textMuted}
                            value={logDescription}
                            onChangeText={setLogDescription}
                          />
                        </View>
                        <TouchableOpacity
                          onPress={handleLogTime}
                          style={[s.inlineBtn, { backgroundColor: themeColor, height: 40, justifyContent: "center", minWidth: 60 }]}
                        >
                          <Text style={[s.inlineBtnText, { color: "#0C101B" }]}>Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* List of Time Logs */}
                  <Text style={[s.bodyMuted, { fontSize: 12, fontWeight: "600", marginBottom: 6 }]}>Time Log History</Text>
                  {selectedTask.timeLogs && selectedTask.timeLogs.length > 0 ? (
                    <View style={[s.membersBox, { marginBottom: 16 }]}>
                      {selectedTask.timeLogs.map((log: any, idx: number) => {
                        const logDate = formatDate(log.date) || formatDate(log.createdAt);
                        const initials = getInitials(log.loggedBy);
                        const name = getFullName(log.loggedBy);
                        const isMyLog = log.loggedBy?._id === user?._id || log.loggedBy === user?._id;
                        return (
                          <View key={log._id || idx} style={[s.memberRow, idx > 0 && { borderTopWidth: 0.5, borderTopColor: C.border }, { paddingVertical: 8 }]}>
                            <View style={s.memberAvatar}>
                              <Text style={s.memberAvatarText}>{initials}</Text>
                            </View>
                            <View style={s.flex}>
                              <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
                                <Text style={[s.memberName, { fontWeight: "600", color: C.textPrimary }]}>{log.hours} hrs</Text>
                                <Text style={[s.bodyMuted, { fontSize: 10 }]}>{logDate}</Text>
                              </View>
                              <Text style={[s.memberEmail, { marginTop: 2, fontSize: 12 }]} numberOfLines={2}>
                                {log.description || "No description"}
                              </Text>
                              {name ? <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>Logged by: {name}</Text> : null}
                            </View>
                            {!isViewer && (isMyLog || user?.role === "admin") && (
                              <TouchableOpacity onPress={() => handleDeleteTimeLog(log._id)} style={{ padding: 4, marginLeft: 8 }}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[s.bodyMuted, { marginBottom: 16, fontStyle: "italic", fontSize: 12 }]}>No logged time entries yet.</Text>
                  )}
                </View>

                {/* Checklist */}
                <SectionLabel>
                  {`Checklist (${selectedTask.subtasks.filter(s => s.isCompleted).length}/${selectedTask.subtasks.length})`}
                </SectionLabel>
                {selectedTask.subtasks.length > 0 && (
                  <View style={[s.membersBox, { marginBottom: 12 }]}>
                    {selectedTask.subtasks.map((sub, idx) => (
                      <View key={sub._id || idx} style={[s.subtaskRow, idx > 0 && { borderTopWidth: 0.5, borderTopColor: C.border }]}>
                        <TouchableOpacity disabled={isViewer} onPress={() => !isViewer && handleToggleSubtask(idx)} style={[s.checkbox, sub.isCompleted && { backgroundColor: themeColor, borderColor: themeColor }]}>
                          {sub.isCompleted && <Ionicons name="checkmark" size={11} color="#0C101B" />}
                        </TouchableOpacity>
                        <Text style={[s.flex, s.subtaskText, sub.isCompleted && s.subtaskDone]}>{sub.title}</Text>
                        {!isViewer && (
                          <TouchableOpacity onPress={() => handleDeleteSubtask(idx)}>
                            <Text style={s.deleteLink}>Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {!isViewer && (
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
                )}

                {/* Recurring Task Settings */}
                <SectionLabel>Recurring settings</SectionLabel>
                <View style={[s.row, { gap: 8, marginBottom: 20 }]}>
                  {(["none", "daily", "weekly", "monthly"] as const).map((freq) => {
                    const selected = (selectedTask.recurring?.frequency || "none") === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        disabled={isViewer}
                        onPress={() => !isViewer && handleUpdateRecurring(freq)}
                        style={[
                          s.priorityBtn,
                          selected
                            ? { backgroundColor: themeColor + "15", borderColor: themeColor }
                            : { backgroundColor: C.surface, borderColor: C.border },
                        ]}
                      >
                        <Text style={[s.priorityBtnText, { color: selected ? themeColor : C.textMuted, textTransform: "capitalize" }]}>
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedTask.recurring?.isRecurring && selectedTask.recurring?.nextRun ? (
                  <Text style={[s.bodyMuted, { fontSize: 11, marginTop: -14, marginBottom: 20, marginLeft: 2 }]}>
                    Next auto-spawn: {new Date(selectedTask.recurring.nextRun).toLocaleString()}
                  </Text>
                ) : null}

                {/* Dependencies Section */}
                <SectionLabel>Blocked by (Dependencies)</SectionLabel>
                {selectedTask.dependencies && selectedTask.dependencies.length > 0 ? (
                  <View style={[s.row, { flexWrap: "wrap", gap: 6, marginBottom: 12 }]}>
                    {selectedTask.dependencies.map((depId) => {
                      const depTask = tasks.find((t) => t._id === depId);
                      if (!depTask) return null;
                      return (
                        <View key={depId} style={[s.formLabelChip, { borderColor: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.08)" }]}>
                          <Ionicons name="lock-closed" size={10} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={[s.formLabelChipText, { color: "#EF4444" }]}>{depTask.title}</Text>
                          {!isViewer && (
                            <TouchableOpacity onPress={() => handleToggleDependency(depId)} style={{ marginLeft: 6 }}>
                              <Ionicons name="close-circle" size={13} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[s.bodyMuted, { marginBottom: 12 }]}>No active dependencies</Text>
                )}

                {!isViewer && (() => {
                  const availableTasks = tasks.filter(
                    (t) => t._id !== selectedTask._id && !(selectedTask.dependencies || []).includes(t._id)
                  );
                  if (availableTasks.length === 0) return null;
                  return (
                    <>
                      <Text style={[s.bodyMuted, { fontSize: 11, marginBottom: 8 }]}>Add blocker dependency:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        {availableTasks.map((t) => (
                          <TouchableOpacity
                            key={t._id}
                            onPress={() => handleToggleDependency(t._id)}
                            style={s.addMemberChip}
                          >
                            <Ionicons name="lock-open-outline" size={11} color={themeColor} />
                            <Text style={s.addMemberName}>{t.title}</Text>
                            <Ionicons name="add" size={13} color={themeColor} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  );
                })()}

                {/* Divider */}
                <View style={s.divider} />

                {/* Comments */}
                <SectionLabel>Comments</SectionLabel>
                
                {!isViewer && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={[s.row, { gap: 8 }]}>
                      <View style={[s.flex, s.inputWrap]}>
                        <TextInput
                          style={[s.input, { minHeight: 40 }]}
                          placeholder="Write a comment…"
                          placeholderTextColor={C.textMuted}
                          value={newCommentContent}
                          onChangeText={handleNewCommentChangeText}
                          multiline
                        />
                      </View>
                      <TouchableOpacity onPress={handlePostComment} style={[s.inlineBtn, { backgroundColor: themeColor }]}>
                        <Text style={s.inlineBtnText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 8 }}>
                      {renderMentionSuggestions("newComment")}
                    </View>
                  </View>
                )}

                {loadingComments ? (
                  <ActivityIndicator color={themeColor} style={{ marginVertical: 16 }} />
                ) : comments.length === 0 ? (
                  <Text style={[s.bodyMuted, { textAlign: "center", marginVertical: 12 }]}>No comments yet</Text>
                ) : (
                  <View style={{ marginBottom: 12 }}>
                    {comments.map((comm) => {
                      const isOwner = comm.user?._id === user?._id;
                      const isEditing = editingCommentId === comm._id;

                      return (
                        <View key={comm._id} style={s.commentCard}>
                          <View style={s.commentMeta}>
                            <Text style={[s.commentAuthor, { color: themeColor }]}>
                              {getFullName(comm.user)}
                            </Text>
                            <View style={s.row}>
                              {comm.createdAt && (
                                <Text style={[s.bodyMuted, { fontSize: 10, marginRight: 8 }]}>
                                  {new Date(comm.createdAt).toLocaleDateString()}
                                </Text>
                              )}
                              {isOwner && !isEditing && (
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  <TouchableOpacity onPress={() => { setEditingCommentId(comm._id); setEditCommentText(comm.content); }}>
                                    <Text style={{ color: themeColor, fontSize: 11, fontWeight: "600" }}>Edit</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteComment(comm._id)}>
                                    <Text style={s.deleteLink}>Delete</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>

                          {isEditing ? (
                            <View style={{ gap: 8, marginTop: 4 }}>
                              <View style={[s.inputWrap, { paddingVertical: 4 }]}>
                                <TextInput
                                  style={[s.input, { minHeight: 36 }]}
                                  value={editCommentText}
                                  onChangeText={handleEditCommentChangeText}
                                  multiline
                                />
                              </View>
                              {renderMentionSuggestions("editComment")}
                              <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                                <TouchableOpacity onPress={() => { setEditingCommentId(null); setEditCommentText(""); }} style={[s.inlineBtn, { backgroundColor: "#1E2130" }]}>
                                  <Text style={s.inlineBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleUpdateComment(comm._id, editCommentText)} style={[s.inlineBtn, { backgroundColor: themeColor }]}>
                                  <Text style={[s.inlineBtnText, { color: "#0C101B" }]}>Save</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <Text style={s.commentBody}>{renderInline(comm.content, themeColor)}</Text>
                          )}

                          {/* Reaction chips */}
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {(["👍", "❤️", "🎉", "🚀"] as const).map((emoji) => {
                              const reactionsList = comm.reactions || [];
                              const count = reactionsList.filter((r) => r.emoji === emoji).length;
                              const hasReacted = reactionsList.some(
                                (r) => r.emoji === emoji && (typeof r.user === "object" ? r.user._id : r.user) === user?._id
                              );

                              return (
                                <TouchableOpacity
                                  key={emoji}
                                  disabled={isViewer}
                                  onPress={() => !isViewer && handleToggleReaction(comm._id, emoji)}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                    backgroundColor: hasReacted ? `${themeColor}22` : "#161922",
                                    borderColor: hasReacted ? themeColor : "#232A40",
                                    borderWidth: 0.5,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                  }}
                                >
                                  <Text style={{ fontSize: 11 }}>{emoji}</Text>
                                  {count > 0 ? (
                                    <Text style={{ color: hasReacted ? themeColor : "#8B92A9", fontSize: 10, fontWeight: "bold" }}>
                                      {count}
                                    </Text>
                                  ) : null}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Archive */}
                {!isViewer && (
                  <TouchableOpacity
                    onPress={() => handleToggleArchiveTask(selectedTask)}
                    style={s.archiveBtn}
                  >
                    <Ionicons name="archive-outline" size={15} color={C.inprog} />
                    <Text style={s.archiveBtnText}>Archive task</Text>
                  </TouchableOpacity>
                )}

                {/* Delete */}
                {!isViewer && (
                  <TouchableOpacity
                    onPress={() => handleDeleteTask(selectedTask._id)}
                    style={s.dangerBtn}
                  >
                    <Ionicons name="trash-outline" size={15} color={C.danger} />
                    <Text style={s.dangerBtnText}>Delete task</Text>
                  </TouchableOpacity>
                )}

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

      {/* ── Modal: Attachment Preview ────────────────────────────────────── */}
      <Modal visible={previewAttachment !== null} transparent animationType="fade" onRequestClose={() => setPreviewAttachment(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: "90%", height: "80%", backgroundColor: "#131825", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#232A40", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#232A40", paddingBottom: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }} numberOfLines={1}>
                  {previewAttachment?.name}
                </Text>
                <Text style={{ color: "#8B92A9", fontSize: 11, marginTop: 2 }}>
                  {previewAttachment?.fileType.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewAttachment(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#8B92A9" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              {previewAttachment && (previewAttachment.fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(previewAttachment.name)) ? (
                <Image
                  source={{ uri: previewAttachment.url }}
                  style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ alignItems: "center", gap: 16, padding: 20 }}>
                  <Ionicons name="document-text-outline" size={80} color={themeColor} />
                  <Text style={{ color: "#F1F3F9", fontSize: 15, fontWeight: "600", textAlign: "center" }}>
                    No inline preview available for this file type
                  </Text>
                  <Text style={{ color: "#8B92A9", fontSize: 12, textAlign: "center" }}>
                    You can open it in an external viewer or browser.
                  </Text>
                  <TouchableOpacity
                    onPress={() => previewAttachment?.url && Linking.openURL(previewAttachment.url)}
                    style={{ backgroundColor: themeColor, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 }}
                  >
                    <Text style={{ color: "#0C101B", fontWeight: "800", fontSize: 13 }}>Open in Browser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setPreviewAttachment(null)}
              style={{ backgroundColor: "#1A2036", borderWidth: 0.5, borderColor: "#232A40", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 16 }}
            >
              <Text style={{ color: "#F1F3F9", fontWeight: "700", fontSize: 13 }}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Archived Tasks ─────────────────────────────────────────── */}
      <Modal visible={archivedModalVisible} transparent animationType="fade" onRequestClose={() => setArchivedModalVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setArchivedModalVisible(false)} />
          <View style={[s.createModal, { maxHeight: "80%" }]}>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
              <Text style={s.modalTitle}>Archived Tasks</Text>
              <TouchableOpacity onPress={() => setArchivedModalVisible(false)}>
                <Ionicons name="close" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingArchived ? (
              <ActivityIndicator color={themeColor} size="small" style={{ marginVertical: 20 }} />
            ) : archivedTasks.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Ionicons name="archive-outline" size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
                <Text style={s.bodyMuted}>No archived tasks in this project</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {archivedTasks.map((task) => (
                  <View key={task._id} style={s.archivedItemRow}>
                    <View style={s.flex}>
                      <Text style={s.archivedItemTitle}>{task.title}</Text>
                      <View style={[s.row, { gap: 6, marginTop: 4 }]}>
                        <PriorityBadge priority={task.priority} />
                        {task.dueDate ? <Text style={s.dueDateText}>{formatDate(task.dueDate)}</Text> : null}
                      </View>
                    </View>
                    {!isViewer && (
                      <View style={[s.row, { gap: 8 }]}>
                        <TouchableOpacity
                          onPress={() => handleRestoreTask(task)}
                          style={s.restoreBtn}
                        >
                          <Text style={s.restoreBtnText}>Restore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteTask(task._id)}
                          style={s.deleteIconBtn}
                        >
                          <Ionicons name="trash-outline" size={14} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={s.secondaryBtn} onPress={() => setArchivedModalVisible(false)}>
              <Text style={s.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Project Settings Modal (Columns & Custom Fields) */}
      <Modal
        visible={projectSettingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectSettingsModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.createModal, { maxHeight: "85%" }]}>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 20 }]}>
              <Text style={[s.modalTitle, { marginBottom: 0 }]}>Project Settings</Text>
              <TouchableOpacity onPress={() => setProjectSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Settings Tab Selector */}
            <View style={[s.statusRow, { marginBottom: 20 }]}>
              <TouchableOpacity
                onPress={() => setActiveSettingsTab("columns")}
                style={[
                  s.statusTab,
                  activeSettingsTab === "columns" ? { backgroundColor: themeColor } : {}
                ]}
              >
                <Text
                  style={[
                    s.statusTabText,
                    { color: activeSettingsTab === "columns" ? "#0C101B" : C.textSecondary }
                  ]}
                >
                  Columns
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveSettingsTab("fields")}
                style={[
                  s.statusTab,
                  activeSettingsTab === "fields" ? { backgroundColor: themeColor } : {}
                ]}
              >
                <Text
                  style={[
                    s.statusTabText,
                    { color: activeSettingsTab === "fields" ? "#0C101B" : C.textSecondary }
                  ]}
                >
                  Custom Fields
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {activeSettingsTab === "columns" ? (
                <View>
                  {/* List Columns */}
                  <SectionLabel>Current Columns</SectionLabel>
                  <View style={{ gap: 8, marginBottom: 20 }}>
                    {(activeProject.columns && activeProject.columns.length > 0 ? activeProject.columns : DEFAULT_BOARD_COLUMNS).map((col) => (
                      <View
                        key={col.id}
                        style={[
                          s.row,
                          {
                            justifyContent: "space-between",
                            backgroundColor: C.card,
                            borderWidth: 0.5,
                            borderColor: C.border,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                          }
                        ]}
                      >
                        <View style={[s.row, { gap: 8 }]}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: col.color }} />
                          <Text style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}>{col.label}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteColumn(col.id)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <View style={s.dividerLight} />

                  {/* Add Column Form */}
                  <SectionLabel>Add New Column</SectionLabel>
                  <View style={[s.inputWrap, { marginBottom: 12 }]}>
                    <TextInput
                      style={s.input}
                      placeholder="Column label (e.g. Testing, Blocked)..."
                      placeholderTextColor={C.textMuted}
                      value={newColLabel}
                      onChangeText={setNewColLabel}
                    />
                  </View>

                  <SectionLabel>Column Color</SectionLabel>
                  <View style={[s.row, { gap: 10, marginBottom: 20, flexWrap: "wrap" }]}>
                    {["#A8ACB9", "#EF9F27", "#5DCAA5", "#6C63FF", "#EF4444", "#3B82F6", "#EC4899"].map((color) => {
                      const selected = newColColor === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setNewColColor(color)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: color,
                            borderWidth: 2,
                            borderColor: selected ? C.textPrimary : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={handleAddColumn} style={[s.primaryBtn, { backgroundColor: themeColor }]}>
                    <Text style={s.primaryBtnText}>Add Column</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* List Custom Fields */}
                  <SectionLabel>Current Custom Fields</SectionLabel>
                  <View style={{ gap: 8, marginBottom: 20 }}>
                    {(activeProject.customFields || []).length === 0 ? (
                      <Text style={[s.bodyMuted, { fontStyle: "italic" }]}>No custom fields configured.</Text>
                    ) : (
                      (activeProject.customFields || []).map((field) => (
                        <View
                          key={field.name}
                          style={[
                            s.row,
                            {
                              justifyContent: "space-between",
                              backgroundColor: C.card,
                              borderWidth: 0.5,
                              borderColor: C.border,
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                            }
                          ]}
                        >
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}>
                              {field.name}
                              {field.required && <Text style={{ color: C.danger }}> *</Text>}
                            </Text>
                            <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2, textTransform: "uppercase" }}>
                              Type: {field.type}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteCustomField(field.name)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={16} color={C.danger} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={s.dividerLight} />

                  {/* Add Custom Field Form */}
                  <SectionLabel>Add Custom Field</SectionLabel>
                  <View style={[s.inputWrap, { marginBottom: 12 }]}>
                    <TextInput
                      style={s.input}
                      placeholder="Field Name (e.g. Story Points, Client)..."
                      placeholderTextColor={C.textMuted}
                      value={newFieldName}
                      onChangeText={setNewFieldName}
                    />
                  </View>

                  <SectionLabel>Field Type</SectionLabel>
                  <View style={[s.row, { gap: 6, marginBottom: 16 }]}>
                    {["text", "number", "date", "boolean"].map((type) => {
                      const selected = newFieldType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setNewFieldType(type as any)}
                          style={[
                            s.filterChip,
                            selected && s.filterChipActive,
                            { flex: 1, alignItems: "center", marginRight: 0 }
                          ]}
                        >
                          <Text style={[s.filterChipText, selected && s.filterChipTextActive, { textTransform: "capitalize" }]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Required Switch */}
                  <View style={[s.row, { justifyContent: "space-between", marginBottom: 20 }]}>
                    <Text style={{ fontSize: 13, color: C.textPrimary, fontWeight: "500" }}>Required Field</Text>
                    <TouchableOpacity
                      onPress={() => setNewFieldRequired(!newFieldRequired)}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: newFieldRequired ? themeColor : C.border,
                        padding: 2,
                        justifyContent: "center",
                        alignItems: newFieldRequired ? "flex-end" : "flex-start",
                      }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleAddCustomField} style={[s.primaryBtn, { backgroundColor: themeColor }]}>
                    <Text style={s.primaryBtnText}>Add Custom Field</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={s.secondaryBtn} onPress={() => setProjectSettingsModalVisible(false)}>
              <Text style={s.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Drag and drop styles
  floatingCardContainer: {
    position: "absolute",
    width: 280,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
    opacity: 0.9,
    transform: [{ scale: 1.05 }],
  },
  grabHandle: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: C.bg,
    borderWidth: 0.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderCard: {
    height: 70,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127,119,221,0.05)",
    marginBottom: 8,
    gap: 4,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  blockedBadgeText: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "600",
  },
  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  recurringBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "capitalize",
  },

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

  // Filter panel styles
  filterPanel: {
    backgroundColor: C.surface,
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  filterPanelTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterGroup: {
    marginRight: 16,
  },
  filterGroupLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
    marginRight: 6,
  },
  filterChipActive: {
    borderColor: "#7F77DD",
    backgroundColor: "rgba(127,119,221,0.1)",
  },
  filterChipText: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#C5C2F5",
    fontWeight: "600",
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  sortChipText: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
  },
  sortOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  sortOrderBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dividerLight: {
    height: 0.5,
    backgroundColor: C.border,
    marginVertical: 10,
  },
  headerActionBtn: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  archiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(239,159,39,0.12)",
    borderWidth: 0.5,
    borderColor: "rgba(239,159,39,0.25)",
    marginTop: 16,
  },
  archiveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.inprog,
  },
  archivedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    gap: 12,
  },
  archivedItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
  },
  restoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.accentBg,
    borderWidth: 0.5,
    borderColor: C.accent,
    borderRadius: 8,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.accentText,
  },
  deleteIconBtn: {
    padding: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 0.5,
    borderColor: C.dangerBorder,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  labelChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  labelChipText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  formLabelChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    marginRight: 6,
    marginBottom: 6,
  },
  formLabelChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});