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
  NativeSyntheticEvent,
  NativeScrollEvent,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
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
import { ConfirmDialog, ConfirmDialogAction } from "../../components/ConfirmDialog";
import { createUploadFormData } from "../../utils/uploadFormData";
import { useRouter } from "expo-router";
import { TodoModeTasksView } from "../../Screen/TodoMode";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Design tokens ────────────────────────────────────────────────────────────
// One flat, calm base (#15171C) instead of three layered surfaces, one
// consistent accent instead of several competing ones, and muted/translucent
// tints for semantic colors (priority, status, labels) so they read as quiet
// tags rather than loud blocks. Every other helper (priority config, column
// config, label colors) derives from this single object so the whole screen
// stays visually consistent.
const C = {
  // Backgrounds
  bg: "#0D1117",
  surface: "#161B22",
  card: "#161B22",
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
  accentText: "#A7B3FF",
  accentBorder: "rgba(94,106,210,0.30)",

  // Priority colors
  high: "#F85149",
  highBg: "rgba(248,81,73,0.12)",
  highBorder: "rgba(248,81,73,0.28)",

  med: "#58A6FF",
  medBg: "rgba(88,166,255,0.12)",
  medBorder: "rgba(88,166,255,0.28)",

  low: "#3FB950",
  lowBg: "rgba(63,185,80,0.12)",
  lowBorder: "rgba(63,185,80,0.28)",

  // Kanban columns
  todo: "#58A6FF",
  inprog: "#D29922",
  done: "#3FB950",

  // Danger
  danger: "#F85149",
  dangerBg: "rgba(248,81,73,0.08)",
  dangerBorder: "rgba(248,81,73,0.18)",

  // Warning
  warn: "#D29922",
  warnBg: "rgba(210,153,34,0.12)",
  warnBorder: "rgba(210,153,34,0.28)",
};

const DEFAULT_BOARD_COLUMNS = [
  { id: "todo", label: "To do", color: C.todo },
  { id: "in-progress", label: "In progress", color: C.inprog },
  { id: "completed", label: "Done", color: C.done },
];

const getPriorityConfig = (Ctok: any) => ({
  high:   { color: Ctok.high, bg: Ctok.highBg, border: Ctok.highBorder, label: "High" },
  medium: { color: Ctok.med,  bg: Ctok.medBg,  border: Ctok.medBorder,  label: "Medium" },
  low:    { color: Ctok.low,  bg: Ctok.lowBg,  border: Ctok.lowBorder,  label: "Low" },
});

const getColumnConfig = (Ctok: any) => ({
  "todo":        { label: "To do",       accent: Ctok.todo },
  "in-progress": { label: "In progress", accent: Ctok.inprog },
  "completed":   { label: "Done",        accent: Ctok.done },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (member: any): string => {
  if (typeof member !== "object" || !member?.username) return "?";
  return `${member.username.firstname[0]}${member.username.lastname[0]}`.toUpperCase();
};

const labelColors: { [key: string]: { bg: string; text: string } } = {
  bug: { bg: "rgba(226,75,74,0.14)", text: "#F0827E" },
  feature: { bg: "rgba(93,202,165,0.14)", text: "#5DCAA5" },
  backend: { bg: "rgba(91,141,239,0.14)", text: "#85ACF2" },
  urgent: { bg: "rgba(239,159,39,0.14)", text: "#EF9F27" },
  testing: { bg: "rgba(91,141,239,0.14)", text: "#5B8DEF" },
  design: { bg: "rgba(224,147,192,0.14)", text: "#E093C0" },
  frontend: { bg: "rgba(111,195,214,0.14)", text: "#6FC3D6" },
};

const getLabelColor = (label: string) => {
  const normalized = label.toLowerCase().trim();
  if (labelColors[normalized]) return labelColors[normalized];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    { bg: "rgba(91,141,239,0.14)", text: "#85ACF2" },
    { bg: "rgba(93,202,165,0.14)", text: "#5DCAA5" },
    { bg: "rgba(239,159,39,0.14)", text: "#EF9F27" },
    { bg: "rgba(226,75,74,0.14)", text: "#F0827E" },
    { bg: "rgba(224,147,192,0.14)", text: "#E093C0" },
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

const getUserId = (userField: any): string =>
  typeof userField === "object" && userField !== null ? userField._id : userField;

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <Text style={s.sectionLabel}>{children}</Text>
);

const PriorityBadge = ({ priority }: { priority: "low" | "medium" | "high" }) => {
  const cfg = getPriorityConfig(C)[priority];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
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
// Flatter than before: no left accent stripe eating into the layout, priority
// shown as a small tag instead of a colored bar, thinner progress bar, and a
// tighter footer row. Card is a single flat surface so it reads cleanly even
// when several stack vertically.
const TaskCard = ({
  task,
  themeColor,
  onPress,
  onCommentPress,
  onAttachmentPress,
  onDragStart,
  isDragging,
  isBlocked,
}: {
  task: Task;
  themeColor: string;
  onPress: () => void;
  onCommentPress?: (task: Task) => void;
  onAttachmentPress?: (task: Task) => void;
  onDragStart?: (task: Task, pageX: number, pageY: number) => void;
  isDragging?: boolean;
  isBlocked?: boolean;
}) => {
  const cfg = getPriorityConfig(C)[task.priority] ?? getPriorityConfig(C).low;
  const subtaskDone = task.subtasks.filter((sub) => sub.isCompleted).length;
  const subtaskTotal = task.subtasks.length;
  const progress = subtaskTotal > 0 ? subtaskDone / subtaskTotal : 0;
  const isCompleted = task.status === "completed";

  const now = new Date();
  const dueTime = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueTime && dueTime < now && !isCompleted;
  const diffTime = dueTime ? dueTime.getTime() - now.getTime() : 0;
  const isDueSoon = dueTime && diffTime > 0 && diffTime <= 24 * 60 * 60 * 1000 && !isCompleted;

  return (
    <View
      style={[s.card, isCompleted && s.cardCompleted, isDragging && s.cardDragging]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ width: "100%" }}
      >
        {/* Top row: tags + due date */}
        <View style={s.cardTopRow}>
          <View style={[s.row, { gap: 6, flexWrap: "wrap", flex: 1 }]}>
            {onDragStart && !isDragging && (
              <View
                onTouchStart={(e) => onDragStart(task, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                style={s.grabHandle}
              >
                <Ionicons name="reorder-two-outline" size={12} color={C.textMuted} />
              </View>
            )}
            <PriorityBadge priority={task.priority} />
            {isBlocked && (
              <View style={s.blockedBadge}>
                <Ionicons name="lock-closed" size={9} color={C.danger} />
                <Text style={s.blockedBadgeText}>Blocked</Text>
              </View>
            )}
            {task.recurring?.isRecurring && (
              <View style={s.recurringBadge}>
                <Ionicons name="sync" size={9} color={C.accent} />
                <Text style={s.recurringBadgeText}>{task.recurring.frequency}</Text>
              </View>
            )}
          </View>
          {task.dueDate ? (
            <View style={s.dueDateRow}>
              <Ionicons
                name="calendar-outline"
                size={11}
                color={isOverdue ? C.danger : isDueSoon ? C.warn : C.textMuted}
              />
              <Text style={[s.dueDateText, { color: isOverdue ? C.danger : isDueSoon ? C.warn : C.textMuted }]}>
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
                <View key={index} style={[s.labelChip, { backgroundColor: colors.bg }]}>
                  <Text style={[s.labelChipText, { color: colors.text }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Progress bar */}
        {subtaskTotal > 0 && (
          <View style={s.progressArea}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={s.progressCount}>{subtaskDone}/{subtaskTotal}</Text>
          </View>
        )}
      </TouchableOpacity>

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
        <View style={[s.row, { gap: 14 }]}>
          <TouchableOpacity
            style={s.cardIconBtn}
            onPress={(e) => {
              if (e && typeof e.stopPropagation === "function") {
                e.stopPropagation();
              }
              onCommentPress && onCommentPress(task);
            }}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-outline" size={13} color={C.textSecondary} />
            {((task.commentsCount !== undefined ? task.commentsCount : (task as any).comments?.length) || 0) > 0 ? (
              <Text style={s.cardIconText}>
                {task.commentsCount !== undefined ? task.commentsCount : (task as any).comments?.length}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.cardIconBtn}
            onPress={(e) => {
              if (e && typeof e.stopPropagation === "function") {
                e.stopPropagation();
              }
              onAttachmentPress && onAttachmentPress(task);
            }}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="document-attach-outline" size={13} color={C.textSecondary} />
            {Array.isArray(task.attachments) && task.attachments.length > 0 ? (
              <Text style={s.cardIconText}>{task.attachments.length}</Text>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Swipeable Kanban Board ───────────────────────────────────────────────────
// Replaces the old side-by-side horizontal scroll with true full-width
// paging: one column fills the screen at a time, swipe left/right (or tap a
// tab) to switch. A small tab row up top doubles as both navigation and a
// live count per column, and dot indicators echo the current page below it.
// Drag-and-drop is preserved: dragging a card still works across pages using
// the same PanResponder logic from the parent, just re-targeted at page
// index instead of x-coordinate bands (see SwipeableKanbanBoard usage below).
const SwipeableKanbanBoard = ({
  columns,
  tasksByColumn,
  allTasks,
  themeColor,
  onCardPress,
  onCommentPress,
  onAttachmentPress,
  onDragStart,
  hoverStatus,
  hoverIndex,
  activePage,
  onPageChange,
  scrollRef,
}: {
  columns: Array<{ id: string; label: string; color: string }>;
  tasksByColumn: Record<string, Task[]>;
  allTasks: Task[];
  themeColor: string;
  onCardPress: (task: Task) => void;
  onCommentPress: (task: Task) => void;
  onAttachmentPress: (task: Task) => void;
  onDragStart: (task: Task, pageX: number, pageY: number) => void;
  hoverStatus: string | null;
  hoverIndex: number;
  activePage: number;
  onPageChange: (page: number) => void;
  scrollRef: React.RefObject<ScrollView | null>;
}) => {
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== activePage) onPageChange(page);
  };

  return (
    <View style={s.flex} >
      {/* Tab row: switch columns directly, shows live counts */}
      <View style={s.columnTabRow}>
        {columns.map((col, idx) => {
          const active = idx === activePage;
          const count = (tasksByColumn[col.id] || []).length;
          return (
            <TouchableOpacity
              key={col.id}
              onPress={() => {
                onPageChange(idx);
                scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
              }}
              style={[s.columnTab, active && { borderBottomColor: col.color }]}
            >
              <View style={[s.columnTabDot, { backgroundColor: col.color }]} />
              <Text style={[s.columnTabText, active && { color: C.textPrimary, fontWeight: "700" }]}>
                {col.label}
              </Text>
              <View style={[s.columnTabCount, active && { backgroundColor: col.color + "22" }]}>
                <Text style={[s.columnTabCountText, active && { color: col.color }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
      >
        {columns.map((col) => {
          const colTasks = tasksByColumn[col.id] || [];
          let showPlaceholder = false;
          let placeholderIdx = 0;
          if (hoverStatus === col.id) {
            showPlaceholder = true;
            placeholderIdx = Math.min(hoverIndex, colTasks.length);
          }

          return (
            <ScrollView
              key={col.id}
              style={{ width: SCREEN_WIDTH }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 80 }}
            >
              {colTasks.length === 0 && !showPlaceholder ? (
                <View style={s.emptyColumn}>
                  <Ionicons name="file-tray-outline" size={22} color={C.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={s.emptyColumnText}>No tasks here</Text>
                </View>
              ) : (
                (() => {
                  const elements: React.ReactNode[] = [];
                  let taskCount = 0;
                  const maxElements = colTasks.length + (showPlaceholder ? 1 : 0);
                  for (let i = 0; i < maxElements; i++) {
                    if (showPlaceholder && i === placeholderIdx) {
                      elements.push(
                        <View key="placeholder" style={s.placeholderCard}>
                          <Text style={s.placeholderText}>Drop here</Text>
                        </View>
                      );
                    } else {
                      const task = colTasks[taskCount];
                      if (task) {
                        const isBlocked = !!(task.dependencies && task.dependencies.some((depId) => {
                          const depTask = allTasks.find((t) => t._id === depId);
                          return depTask && depTask.status !== "completed";
                        }));
                        elements.push(
                          <TaskCard
                            key={task._id}
                            task={task}
                            themeColor={themeColor}
                            onPress={() => onCardPress(task)}
                            onCommentPress={onCommentPress}
                            onAttachmentPress={onAttachmentPress}
                            onDragStart={onDragStart}
                            isBlocked={isBlocked}
                          />
                        );
                        taskCount++;
                      }
                    }
                  }
                  return elements;
                })()
              )}
            </ScrollView>
          );
        })}
      </ScrollView>

      {/* Dot indicators echoing the active page */}
      <View style={s.pageDotsRow}>
        {columns.map((col, idx) => (
          <View
            key={col.id}
            style={[
              s.pageDot,
              idx === activePage
                ? { width: 18, backgroundColor: col.color }
                : { backgroundColor: C.borderLight },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

function MarkdownToolbar({ onInsert }: { onInsert: (syntax: string) => void }) {
  return (
    <View style={s.mdToolbar}>
      <TouchableOpacity onPress={() => onInsert("**bold**")} style={s.mdBtn}>
        <Text style={s.mdBtnTextBold}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("*italic*")} style={s.mdBtn}>
        <Text style={s.mdBtnTextItalic}>I</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("\n- ")} style={s.mdBtn}>
        <Text style={s.mdBtnText}>• List</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("\n- [ ] ")} style={s.mdBtn}>
        <Text style={s.mdBtnText}>☑ Todo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onInsert("\n```\ncode\n```\n")} style={s.mdBtn}>
        <Text style={s.mdBtnText}>{"</>"} Code</Text>
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
          <View key={`code-${index}`} style={s.codeBlock}>
            <Text style={s.codeBlockText}>{codeLines.join("\n")}</Text>
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
        <View key={`bullet-${index}`} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{renderInline(content, C.accent)}</Text>
        </View>
      );
      return;
    }

    if (line.trim().startsWith("- [ ] ") || line.trim().startsWith("- [x] ")) {
      const checked = line.trim().startsWith("- [x] ");
      const content = line.trim().substring(6);
      elements.push(
        <View key={`checklist-${index}`} style={s.bulletRow}>
          <View style={[s.inlineCheckbox, checked && { backgroundColor: C.accent, borderColor: C.accent }]}>
            {checked && <Text style={{ color: C.onAccent, fontSize: 9, fontWeight: "bold" }}>✓</Text>}
          </View>
          <Text style={[s.bulletText, checked && { textDecorationLine: "line-through", color: C.textMuted }]}>
            {renderInline(content, C.accent)}
          </Text>
        </View>
      );
      return;
    }

    if (line.trim() === "") {
      elements.push(<View key={`empty-${index}`} style={{ height: 6 }} />);
    } else {
      elements.push(
        <Text key={`line-${index}`} style={s.formattedLine}>
          {renderInline(line, C.accent)}
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
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        tokens.push({ type: "code", text: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ type: "bold", text: text.substring(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1) {
        tokens.push({ type: "italic", text: text.substring(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "@") {
      const match = text.slice(i).match(/^@(\w+)/);
      if (match) {
        tokens.push({ type: "mention", text: match[0] });
        i += match[0].length;
        continue;
      }
    }
    if (text[i] === "[") {
      const titleEnd = text.indexOf("]", i + 1);
      if (titleEnd !== -1 && text[titleEnd + 1] === "(") {
        const urlEnd = text.indexOf(")", titleEnd + 2);
        if (urlEnd !== -1) {
          tokens.push({
            type: "link",
            text: text.substring(i + 1, titleEnd),
            linkUrl: text.substring(titleEnd + 2, urlEnd),
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
        return <Text key={index} style={{ fontWeight: "bold", color: C.textPrimary }}>{token.text}</Text>;
      case "italic":
        return <Text key={index} style={{ fontStyle: "italic", color: C.textSecondary }}>{token.text}</Text>;
      case "code":
        return (
          <Text key={index} style={s.inlineCode}>
            {token.text}
          </Text>
        );
      case "mention":
        return (
          <Text key={index} style={[s.mentionChip, { color: C.accent }]}>
            {token.text}
          </Text>
        );
      case "link":
        return (
          <Text
            key={index}
            style={{ color: C.accent, textDecorationLine: "underline" }}
            onPress={() => Alert.alert("Link", `Navigate to: ${token.linkUrl}`)}
          >
            {token.text}
          </Text>
        );
      default:
        return <Text key={index} style={{ color: C.textSecondary }}>{token.text}</Text>;
    }
  });
}
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

interface CalendarDatePickerModalProps {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onChange: (val: string) => void;
  title: string;
}

const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
  visible,
  value,
  onClose,
  onChange,
  title,
}) => {
  const [viewDate, setViewDate] = useState<Date>(new Date());

  useEffect(() => {
    if (visible) {
      setViewDate(value ? new Date(value) : new Date());
    }
  }, [visible, value]);

  const handleSelectDay = (day: Date) => {
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    onClose();
  };

  const handleClear = () => {
    onChange("");
    onClose();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  const selectedDate = value ? new Date(value) : null;
  const isSelected = (day: Date) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === day.getFullYear() &&
      selectedDate.getMonth() === day.getMonth() &&
      selectedDate.getDate() === day.getDate()
    );
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return (
      today.getFullYear() === day.getFullYear() &&
      today.getMonth() === day.getMonth() &&
      today.getDate() === day.getDate()
    );
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.createModal, { width: 320, padding: 16 }]}>
          <Text style={[s.modalTitle, { fontSize: 16, marginBottom: 14, textAlign: "center" }]}>{title}</Text>

          <View style={[s.row, { justifyContent: "space-between", marginBottom: 16, alignItems: "center" }]}>
            <TouchableOpacity onPress={handlePrevMonth} style={s.calNavBtn}>
              <Ionicons name="chevron-back" size={16} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={s.calMonthLabel}>
              {viewDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={s.calNavBtn}>
              <Ionicons name="chevron-forward" size={16} color={C.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 8 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <Text key={day} style={[s.calWeekdayLabel, { width: 36, textAlign: "center" }]}>{day}</Text>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", marginBottom: 16 }}>
            {days.map((day, idx) => {
              if (!day) {
                return <View key={`empty-${idx}`} style={{ width: 36, height: 36, margin: 2 }} />;
              }

              const active = isSelected(day);
              const today = isToday(day);

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  onPress={() => handleSelectDay(day)}
                  style={[
                    s.calDayCell,
                    { width: 36, height: 36, margin: 2, borderRadius: 18 },
                    active && { backgroundColor: C.accent },
                    today && !active && { borderWidth: 1, borderColor: C.accentBorder }
                  ]}
                >
                  <Text style={[s.calDayText, active && { color: C.onAccent }, today && !active && { color: C.accent }]}>
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[s.row, { gap: 10, justifyContent: "flex-end" }]}>
            {value ? (
              <TouchableOpacity onPress={handleClear} style={[s.secondaryBtn, { flex: 0, paddingHorizontal: 12, paddingVertical: 6 }]}>
                <Text style={s.secondaryBtnText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} style={[s.primaryBtn, { flex: 0, paddingHorizontal: 12, paddingVertical: 6 }]}>
              <Text style={s.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const generateImageName = (fileName?: string | null) => {
  return fileName || `photo_${Date.now()}.jpg`;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const router = useRouter();
  const { user, activeProject, setActiveProject, activeWorkspace, themeColor, refreshProjects, todoMode } = useApp();

  if (todoMode) {
    return <TodoModeTasksView />;
  }

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
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [attachmentsModalVisible, setAttachmentsModalVisible] = useState(false);
  
  console.log("[DEBUG] TasksScreen Render:", {
    selectedTaskId: selectedTask?._id,
    selectedTaskTitle: selectedTask?.title,
    commentsModalVisible,
    attachmentsModalVisible,
    detailModalVisible
  });

  const estHours = selectedTask?.estimatedHours || 0;
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string; fileType: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleBackdropPress = (closeModal: () => void) => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      closeModal();
    }
  };

  // Advanced feature views states
  const [activeView, setActiveView] = useState<"board" | "calendar" | "timeline" | "workload" | "bulk" | "trash">("board");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message?: string;
    actions: ConfirmDialogAction[];
  } | null>(null);

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

  // Swipeable board page state (new — drives which column page is visible)
  const [activeBoardPage, setActiveBoardPage] = useState(0);
  const boardScrollRef = React.useRef<ScrollView>(null);

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
  const [newColColor, setNewColColor] = useState(C.todo);
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

    if (currentCols.some((c) => c.id === newId)) {
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
            const updatedCols = currentCols.filter((c) => c.id !== colId);
            try {
              const res = await updateProjectColumnsApi(activeProject._id, updatedCols);
              if (res.success) {
                setActiveProject(res.project);
                await refreshProjects();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete column.");
            }
          },
        },
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
    if (currentFields.some((f) => f.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
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
            const updatedFields = currentFields.filter((f) => f.name !== fieldName);
            try {
              const res = await updateProjectCustomFieldsApi(activeProject._id, updatedFields);
              if (res.success) {
                setActiveProject(res.project);
                await refreshProjects();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete custom field.");
            }
          },
        },
      ]
    );
  };

  const handleSaveCustomFieldVal = async (fieldName: string, value: any) => {
    if (!selectedTask) return;
    const currentTaskFields = selectedTask.customFields || [];
    let updatedTaskFields = [...currentTaskFields];
    const fieldIdx = updatedTaskFields.findIndex((f) => f.name === fieldName);

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
        sortOrder,
      };
      const res = await saveFilterApi({
        name: newFilterPresetName.trim(),
        project: activeProject._id,
        query,
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
    Alert.alert("Archive task", "Archive this task? It will be removed from the active board.", [
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
        },
      },
    ]);
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
    activeBoardPage: 0,
  });

  useEffect(() => {
    dragInfoRef.current = {
      draggingTask,
      hoverStatus,
      hoverIndex,
      activeBoardPage,
    };
  }, [draggingTask, hoverStatus, hoverIndex, activeBoardPage]);

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

  // With swipeable full-width pages, "which column am I hovering" is simply
  // the currently active page — there's no horizontal x-band math needed
  // anymore, since only one column is ever on screen at a time. Vertical
  // position still determines the drop index within that column.
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => dragInfoRef.current.draggingTask !== null,
      onMoveShouldSetPanResponder: () => dragInfoRef.current.draggingTask !== null,
      onPanResponderMove: (evt, gestureState) => {
        setDragX(gestureState.moveX);
        setDragY(gestureState.moveY);

        const activeColumns = activeProject?.columns && activeProject.columns.length > 0 ? activeProject.columns : DEFAULT_BOARD_COLUMNS;
        const pageIdx = Math.max(0, Math.min(activeColumns.length - 1, dragInfoRef.current.activeBoardPage));
        const hoverCol = activeColumns[pageIdx].id;
        setHoverStatus(hoverCol);

        const relativeY = Math.max(0, gestureState.moveY - 220);
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
  const [createDueDatePickerVisible, setCreateDueDatePickerVisible] = useState(false);
  const [createStartDatePickerVisible, setCreateStartDatePickerVisible] = useState(false);
  const [detailDueDatePickerVisible, setDetailDueDatePickerVisible] = useState(false);
  const [detailStartDatePickerVisible, setDetailStartDatePickerVisible] = useState(false);
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
    return activeProject.members.map((m: any) => m.user).filter((u: any) => u && typeof u === "object");
  };

  const handleSelectMention = (userObj: any) => {
    const mentionText = `@${userObj.username.firstname}_${userObj.username.lastname} `;

    if (mentionTarget === "newComment") {
      setNewCommentContent(newCommentContent.replace(/@\w*$/, mentionText));
    } else if (mentionTarget === "editComment") {
      setEditCommentText(editCommentText.replace(/@\w*$/, mentionText));
    } else if (mentionTarget === "editDesc") {
      setEditDescText(editDescText.replace(/@\w*$/, mentionText));
    } else if (mentionTarget === "createDesc") {
      setDescription(description.replace(/@\w*$/, mentionText));
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
      <View style={s.mentionPopover}>
        <Text style={s.mentionPopoverLabel}>SUGGESTED TEAM MEMBERS</Text>
        <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
          {filtered.map((u: any) => {
            const fullName = `${u.username.firstname} ${u.username.lastname}`;
            const usernameHandle = `@${u.username.firstname}_${u.username.lastname}`;
            return (
              <TouchableOpacity key={u._id} onPress={() => handleSelectMention(u)} style={s.mentionRow}>
                <View style={s.mentionAvatar}>
                  <Text style={s.mentionAvatarText}>
                    {u.username.firstname[0]}{u.username.lastname[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.mentionName}>{fullName}</Text>
                  <Text style={s.mentionHandle}>{usernameHandle}</Text>
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
    const updatedLabels = currentLabels.filter((l) => l !== labelToRemove);
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
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a task title.");
      return;
    }
    setCreating(true);
    try {
      const res = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project: activeProject._id,
        priority,
        dueDate: dueDate.trim() || undefined,
        startDate: startDate.trim() || undefined,
        assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
        labels: createLabels,
        dependencies: createDependencies.length > 0 ? createDependencies : undefined,
        recurring: createRecurringFrequency !== "none" ? { isRecurring: true, frequency: createRecurringFrequency } : undefined,
      });
      if (res.success) {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setDueDate("");
        setStartDate("");
        setAssignedTo([]);
        setCreateRecurringFrequency("none");
        setCreateDependencies([]);
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

  const handleUpdateDueDate = async (date: string) => {
    if (!selectedTask) return;
    try {
      const res = await updateTask(selectedTask._id, { dueDate: date || null });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update due date.");
    }
  };

  const handleUpdateStartDate = async (date: string) => {
    if (!selectedTask) return;
    try {
      const res = await updateTask(selectedTask._id, { startDate: date || null });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update start date.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmDialog({
      title: "Delete task",
      message: "Soft-delete this task? You can restore it from the Trash Bin or undo this action now.",
      actions: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const taskToDelete = tasks.find((t) => t._id === taskId);
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
      ],
    });
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
    setConfirmDialog({
      title: "Permanently delete task",
      message: "This action is irreversible. The task and all associated comments will be permanently erased.",
      actions: [
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
          },
        },
      ],
    });
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
      tasks.forEach((t) => {
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
      const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
      const rows = lines.slice(1);
      const parsedTasks = rows.map((row) => {
        const parts = row.split(",").map((p) => p.replace(/^"|"$/g, "").trim());
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
      if (res.success) {
        setSelectedTask(res.task);
        setNewSubtaskTitle("");
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to add item.");
    }
  };

  const handleToggleSubtask = async (index: number) => {
    if (!selectedTask) return;
    const updated = selectedTask.subtasks.map((sub, i) => (i === index ? { ...sub, isCompleted: !sub.isCompleted } : sub));
    try {
      const res = await updateTask(selectedTask._id, { subtasks: updated });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update item.");
    }
  };

  const handleDeleteSubtask = async (index: number) => {
    if (!selectedTask) return;
    const updated = selectedTask.subtasks.filter((_, i) => i !== index);
    try {
      const res = await updateTask(selectedTask._id, { subtasks: updated });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to delete item.");
    }
  };

  const handleAddTaskMember = async (memberId: string) => {
    if (!selectedTask) return;
    const current = (selectedTask.assignedTo as any[]).map(getMemberId);
    if (current.includes(memberId)) return;
    try {
      const res = await updateTask(selectedTask._id, { assignedTo: [...current, memberId] });
      if (res.success) {
        setSelectedTask(res.task);
        await loadTasks();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to add member.");
    }
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
            if (res.success) {
              setSelectedTask(res.task);
              await loadTasks();
            }
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to remove member.");
          }
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
            if (res.success) {
              setSelectedTask(res.task);
              await loadTasks();
            }
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to leave task.");
          }
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
    const updatedDeps = isAlreadyDep ? currentDeps.filter((id) => id !== depId) : [...currentDeps, depId];

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
    } catch (err) {
      console.error("Comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (isViewer) return;
    if (!selectedTask || !newCommentContent.trim()) return;
    try {
      const res = await createComment(selectedTask._id, newCommentContent.trim());
      if (res.success) {
        setNewCommentContent("");
        await loadComments(selectedTask._id);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to post comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await deleteComment(commentId);
      if (res.success && selectedTask) await loadComments(selectedTask._id);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to delete comment.");
    }
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
    if (!perm.granted) {
      Alert.alert("Permission denied", "Media library access is required.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        const fileName = generateImageName(a.fileName);
        const mimeType = a.mimeType || "image/jpeg";
        await handleUpload(a.uri, fileName, mimeType);
      }
    } catch (err) {
      console.error("Image pick error:", err);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        const name = a.name || "document.pdf";
        const mimeType = a.mimeType || "application/octet-stream";
        await handleUpload(a.uri, name, mimeType);
      }
    } catch (err) {
      console.error("Document pick error:", err);
    }
  };

  const handleUpload = async (uri: string, name: string, mimeType: string, desc?: string) => {
    if (!selectedTask) return;
    setUploading(true);
    try {
      const formData = await createUploadFormData({ uri, name, type: mimeType });
      const res = await uploadFile(formData);
      if (res.success) {
        const updateRes = await updateTask(selectedTask._id, {
          newAttachments: [{
            name: res.name || name,
            url: res.url,
            fileType: res.fileType || mimeType,
            uploadedBy: user?._id,
            description: desc?.trim() || undefined,
          }],
        });
        if (updateRes.success) {
          setSelectedTask(updateRes.task);
          setTasks((prev) => prev.map((t) => (t._id === updateRes.task._id ? updateRes.task : t)));
          setPendingAttachment(null);
          setAttachmentDescription("");
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

  const openCommentsView = async (task: Task) => {
    console.log("[DEBUG] openCommentsView called with:", task?._id, task?.title);
    setSelectedTask(task);
    setCommentsModalVisible(true);
    await loadComments(task._id);
  };

  const openAttachmentsView = (task: Task) => {
    console.log("[DEBUG] openAttachmentsView called with:", task?._id, task?.title);
    setSelectedTask(task);
    setPendingAttachment(null);
    setAttachmentDescription("");
    setAttachmentsModalVisible(true);
  };

  const [isPinned, setIsPinned] = useState(false);

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setEditDescText(task.description || "");
    setIsEditingDesc(false);
    setMemberSearchQuery("");
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
        <TouchableOpacity style={[s.btn, { backgroundColor: C.accent }]} onPress={() => router.push("/(tabs)/projects")}>
          <Text style={s.btnText}>Go to projects</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getFilteredAndSortedTasks = () => {
    let result = [...tasks];

    if (filterAssignee) {
      result = result.filter((t) => {
        const assignees = t.assignedTo || [];
        return assignees.some((a: any) => (typeof a === "object" ? a._id : a) === filterAssignee);
      });
    }

    if (filterPriority) {
      result = result.filter((t) => t.priority === filterPriority);
    }

    if (filterLabel) {
      result = result.filter((t) => t.labels && t.labels.includes(filterLabel));
    }

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
        const days: (Date | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));

        const selectedStr = selectedCalendarDate.toISOString().split("T")[0];
        const dueTasksToday = tasks.filter((t) => t.dueDate && t.dueDate.split("T")[0] === selectedStr);

        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
              <View style={s.segmentedControl}>
                {(["month", "week", "day"] as const).map((mode) => {
                  const active = calendarMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setCalendarMode(mode)}
                      style={[s.segmentedItem, active && s.segmentedItemActive]}
                    >
                      <Text style={[s.segmentedItemText, active && s.segmentedItemTextActive]}>{mode}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[s.row, { gap: 14 }]}>
                <TouchableOpacity
                  onPress={() => {
                    const prev = new Date(currentMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  style={s.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={16} color={C.textPrimary} />
                </TouchableOpacity>
                <Text style={s.calMonthLabel}>
                  {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = new Date(currentMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  style={s.calNavBtn}
                >
                  <Ionicons name="chevron-forward" size={16} color={C.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {calendarMode === "month" && (
              <View style={s.calGrid}>
                <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 10 }}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <Text key={day} style={s.calWeekdayLabel}>{day}</Text>
                  ))}
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" }}>
                  {days.map((day, idx) => {
                    if (!day) return <View key={`empty-${idx}`} style={{ width: 36, height: 36, margin: 4 }} />;

                    const dateStr = day.toISOString().split("T")[0];
                    const tasksDue = tasks.filter((t) => t.dueDate && t.dueDate.split("T")[0] === dateStr);
                    const isSelected = selectedCalendarDate.getDate() === day.getDate() && selectedCalendarDate.getMonth() === day.getMonth();

                    return (
                      <TouchableOpacity
                        key={dateStr}
                        onPress={() => setSelectedCalendarDate(day)}
                        style={[s.calDayCell, isSelected && { backgroundColor: C.accent }]}
                      >
                        <Text style={[s.calDayText, isSelected && { color: C.onAccent }]}>{day.getDate()}</Text>
                        {tasksDue.length > 0 && (
                          <View style={[s.calDayDot, isSelected && { backgroundColor: C.onAccent }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {calendarMode === "week" && (
              <View style={{ marginBottom: 16, gap: 10 }}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const startOfWeek = new Date(selectedCalendarDate);
                  const dayOfWeek = startOfWeek.getDay();
                  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + i);

                  const dStr = startOfWeek.toISOString().split("T")[0];
                  const dayTasks = tasks.filter((t) => t.dueDate && t.dueDate.split("T")[0] === dStr);
                  const isToday = new Date().toDateString() === startOfWeek.toDateString();

                  return (
                    <View key={dStr} style={[s.weekDayCard, isToday && { borderColor: C.accentBorder }]}>
                      <Text style={[s.weekDayLabel, isToday && { color: C.accent }]}>
                        {startOfWeek.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}
                      </Text>
                      {dayTasks.length === 0 ? (
                        <Text style={s.emptyHint}>No tasks due</Text>
                      ) : (
                        dayTasks.map((t) => (
                          <TouchableOpacity key={t._id} onPress={() => openTaskDetail(t)} style={s.weekDayTaskRow}>
                            <Text style={s.weekDayTaskText}>{t.title}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {calendarMode !== "week" && (
              <View>
                <Text style={s.listSectionTitle}>
                  Tasks due {selectedCalendarDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                {dueTasksToday.length === 0 ? (
                  <View style={s.emptyStateBox}>
                    <Ionicons name="happy-outline" size={26} color={C.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={s.emptyHint}>No tasks due on this day</Text>
                  </View>
                ) : (
                  dueTasksToday.map((t) => (
                    <TouchableOpacity key={t._id} onPress={() => openTaskDetail(t)} style={s.simpleListCard}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={s.simpleListTitle}>{t.title}</Text>
                        <PriorityBadge priority={t.priority} />
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
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
              <Text style={[s.listSectionTitle, { flex: 1, marginBottom: 0 }]}>Project timeline</Text>
              <View style={[s.row, { gap: 8 }]}>
                <TouchableOpacity onPress={handleExportCSV} style={s.smallActionBtn}>
                  <Ionicons name="share-outline" size={12} color={C.accent} style={{ marginRight: 4 }} />
                  <Text style={s.smallActionBtnText}>Export</Text>
                </TouchableOpacity>
                {!isViewer && (
                  <TouchableOpacity onPress={() => setImportModalVisible(true)} style={s.smallActionBtn}>
                    <Ionicons name="download-outline" size={12} color={C.accent} style={{ marginRight: 4 }} />
                    <Text style={s.smallActionBtnText}>Import</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {tasks.length === 0 ? (
              <View style={s.emptyStateBox}>
                <Text style={s.emptyHint}>No tasks to schedule on the timeline.</Text>
              </View>
            ) : (
              tasks.map((t) => {
                const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
                const end = t.dueDate ? new Date(t.dueDate) : null;
                let daysSpan = 3;
                if (end) {
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  daysSpan = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                }
                const statusColor = t.status === "completed" ? C.done : t.status === "in-progress" ? C.inprog : C.textSecondary;

                return (
                  <View key={t._id} style={s.timelineCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => openTaskDetail(t)} style={{ flex: 1, marginRight: 8 }}>
                        <Text style={s.timelineTitle}>{t.title}</Text>
                        <Text style={s.timelineDates}>
                          {start.toLocaleDateString()} — {end ? end.toLocaleDateString() : "No due date"}
                        </Text>
                      </TouchableOpacity>
                      <View style={[s.statusPill, { backgroundColor: statusColor + "22" }]}>
                        <Text style={[s.statusPillText, { color: statusColor }]}>{t.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={s.ganttTrack}>
                      <View style={[s.ganttFill, { width: `${Math.min(100, daysSpan * 10)}%`, backgroundColor: statusColor }]} />
                    </View>

                    {t.dependencies && t.dependencies.length > 0 && (
                      <View style={[s.row, { flexWrap: "wrap", gap: 6, marginTop: 10 }]}>
                        <Ionicons name="link-outline" size={10} color={C.warn} />
                        <Text style={s.depLabel}>Blocked by:</Text>
                        {t.dependencies.map((depId: any) => {
                          const dep = tasks.find((tsk) => tsk._id === depId);
                          return (
                            <View key={depId} style={s.depChip}>
                              <Text style={s.depChipText}>{dep ? dep.title : "Incomplete task"}</Text>
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
        const filteredMembers = members.filter((member: any) => {
          if (!workloadTaskFilter) return true;
          const u = member.user;
          if (!u) return false;
          const mId = typeof u === "object" ? u._id : u;
          const targetTask = tasks.find((t) => t._id === workloadTaskFilter);
          if (!targetTask) return false;
          const assignees = targetTask.assignedTo || [];
          const list = Array.isArray(assignees) ? assignees.map((a) => (typeof a === "object" ? a._id : a)) : [];
          return list.includes(mId);
        });

        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 14 }]}>
              <Text style={[s.listSectionTitle, { marginBottom: 0 }]}>Team workload</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{members.length} {members.length === 1 ? "member" : "members"}</Text>
              </View>
            </View>

            {members.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.filterGroupLabel}>Filter by assigned task</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={() => setWorkloadTaskFilter(null)}
                    style={[s.filterChip, !workloadTaskFilter && s.filterChipActive]}
                  >
                    <Text style={[s.filterChipText, !workloadTaskFilter && s.filterChipTextActive]}>
                      All members ({members.length})
                    </Text>
                  </TouchableOpacity>
                  {tasks.map((t) => {
                    const assignedCount = members.filter((m: any) => {
                      const mId = typeof m.user === "object" ? m.user._id : m.user;
                      const assignees = t.assignedTo || [];
                      const list = Array.isArray(assignees) ? assignees.map((a) => (typeof a === "object" ? a._id : a)) : [];
                      return list.includes(mId);
                    }).length;
                    if (assignedCount === 0) return null;
                    const active = workloadTaskFilter === t._id;
                    return (
                      <TouchableOpacity key={t._id} onPress={() => setWorkloadTaskFilter(t._id)} style={[s.filterChip, active && s.filterChipActive]}>
                        <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{t.title} ({assignedCount})</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {members.length === 0 ? (
              <View style={s.emptyStateBox}><Text style={s.emptyHint}>No members added to this project.</Text></View>
            ) : filteredMembers.length === 0 ? (
              <View style={s.emptyStateBox}><Text style={s.emptyHint}>No members assigned to the selected task.</Text></View>
            ) : (
              filteredMembers.map((member: any) => {
                const u = member.user;
                if (!u || typeof u !== "object") return null;
                const mId = u._id;
                const activeAssigned = tasks.filter((t) => {
                  const assignees = t.assignedTo || [];
                  const list = Array.isArray(assignees) ? assignees.map((a) => (typeof a === "object" ? a._id : a)) : [];
                  return t.status !== "completed" && list.includes(mId);
                });
                const completedAssigned = tasks.filter((t) => {
                  const assignees = t.assignedTo || [];
                  const list = Array.isArray(assignees) ? assignees.map((a) => (typeof a === "object" ? a._id : a)) : [];
                  return t.status === "completed" && list.includes(mId);
                });
                const totalAssigned = activeAssigned.length + completedAssigned.length;
                const estHoursTotal = activeAssigned.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                const actHoursTotal = activeAssigned.reduce((sum, t) => sum + (t.actualHours || 0), 0);
                const isOverloaded = activeAssigned.length > 5 || estHoursTotal > 40;
                const completionPct = totalAssigned > 0 ? Math.round((completedAssigned.length / totalAssigned) * 100) : 0;
                const memberTasks = [...activeAssigned, ...completedAssigned];

                return (
                  <View key={mId} style={[s.workloadCard, isOverloaded && { borderColor: C.dangerBorder }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={s.workloadAvatar}>
                          <Text style={s.workloadAvatarText}>
                            {u.username?.firstname?.[0]?.toUpperCase()}{u.username?.lastname?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={s.workloadName}>{u.username?.firstname} {u.username?.lastname}</Text>
                          <Text style={s.workloadEmail}>{u.email}</Text>
                        </View>
                      </View>
                      {isOverloaded && (
                        <View style={s.overloadPill}>
                          <Ionicons name="warning-outline" size={10} color={C.danger} style={{ marginRight: 4 }} />
                          <Text style={s.overloadPillText}>Overloaded</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                      <View><Text style={s.workloadStatLabel}>Active</Text><Text style={s.workloadStatValue}>{activeAssigned.length}</Text></View>
                      <View><Text style={s.workloadStatLabel}>Est. hrs</Text><Text style={[s.workloadStatValue, { color: C.accent }]}>{estHoursTotal}h</Text></View>
                      <View><Text style={s.workloadStatLabel}>Spent</Text><Text style={s.workloadStatValue}>{actHoursTotal}h</Text></View>
                      <View><Text style={s.workloadStatLabel}>Rate</Text><Text style={[s.workloadStatValue, { color: C.done }]}>{completionPct}%</Text></View>
                    </View>

                    <View style={s.workloadProgressTrack}>
                      <View style={[s.workloadProgressFill, { width: `${completionPct}%` }]} />
                    </View>

                    <View style={{ borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 12, marginTop: 12 }}>
                      <Text style={s.filterGroupLabel}>Assigned tasks ({memberTasks.length})</Text>
                      {memberTasks.length === 0 ? (
                        <Text style={s.emptyHint}>No tasks assigned in this project.</Text>
                      ) : (
                        <View style={{ gap: 6 }}>
                          {memberTasks.map((t) => {
                            const stColor = t.status === "completed" ? C.done : t.status === "in-progress" ? C.inprog : C.textSecondary;
                            return (
                              <TouchableOpacity key={t._id} onPress={() => openTaskDetail(t)} style={s.workloadTaskRow}>
                                <Text style={s.workloadTaskTitle} numberOfLines={1}>{t.title}</Text>
                                <View style={[s.statusPill, { backgroundColor: stColor + "22" }]}>
                                  <Text style={[s.statusPillText, { color: stColor }]}>
                                    {t.status === "completed" ? "Done" : t.status === "in-progress" ? "Doing" : "To do"}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
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
            <ScrollView style={s.flex} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
              <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
                <Text style={[s.listSectionTitle, { marginBottom: 0 }]}>Bulk edit ({selectedTasks.length} selected)</Text>
                {selectedTasks.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedTasks([])}>
                    <Text style={s.linkText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {tasks.length === 0 ? (
                <View style={s.emptyStateBox}><Text style={s.emptyHint}>No tasks to edit.</Text></View>
              ) : (
                tasks.map((t) => {
                  const isSelected = selectedTasks.includes(t._id);
                  return (
                    <TouchableOpacity
                      key={t._id}
                      onPress={() => {
                        setSelectedTasks(isSelected ? selectedTasks.filter((id) => id !== t._id) : [...selectedTasks, t._id]);
                      }}
                      style={[s.bulkRow, isSelected && { borderColor: C.accentBorder }]}
                    >
                      <View style={[s.bulkCheckbox, isSelected && { backgroundColor: C.accent, borderColor: C.accent }]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={C.onAccent} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.bulkRowTitle}>{t.title}</Text>
                        <Text style={s.bulkRowMeta}>{t.status.toUpperCase()} · {t.priority.toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {selectedTasks.length > 0 && (
              <View style={s.bulkActionBar}>
                <TouchableOpacity onPress={() => handleBulkUpdate({ status: "todo" })} style={s.bulkActionItem}>
                  <Ionicons name="ellipse-outline" size={17} color={C.textSecondary} />
                  <Text style={s.bulkActionLabel}>To do</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBulkUpdate({ status: "in-progress" })} style={s.bulkActionItem}>
                  <Ionicons name="play-circle-outline" size={17} color={C.inprog} />
                  <Text style={s.bulkActionLabel}>Doing</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBulkUpdate({ status: "completed" })} style={s.bulkActionItem}>
                  <Ionicons name="checkmark-circle-outline" size={17} color={C.done} />
                  <Text style={s.bulkActionLabel}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBulkUpdate({ isArchived: true })} style={s.bulkActionItem}>
                  <Ionicons name="archive-outline" size={17} color={C.accent} />
                  <Text style={s.bulkActionLabel}>Archive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setConfirmDialog({
                      title: "Bulk delete",
                      message: `Move ${selectedTasks.length} tasks to Trash Bin?`,
                      actions: [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => handleBulkUpdate({ isDeleted: true }) },
                      ],
                    });
                  }}
                  style={s.bulkActionItem}
                >
                  <Ionicons name="trash-outline" size={17} color={C.danger} />
                  <Text style={s.bulkActionLabel}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }

      case "trash": {
        return (
          <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.listSectionTitle}>Trash bin</Text>
            {loadingTrash ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : trashTasks.length === 0 ? (
              <View style={s.emptyStateBox}>
                <Ionicons name="trash-bin-outline" size={26} color={C.textMuted} style={{ marginBottom: 8 }} />
                <Text style={s.emptyHint}>Trash bin is empty</Text>
              </View>
            ) : (
              trashTasks.map((t) => (
                <View key={t._id} style={s.trashCard}>
                  <Text style={s.trashTitle}>{t.title}</Text>
                  <Text style={s.trashMeta}>Deleted: {t.deletedAt ? new Date(t.deletedAt).toLocaleString() : "Recently"}</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <TouchableOpacity onPress={() => handleRestoreTaskFromTrash(t._id)} style={s.trashRestoreBtn}>
                      <Ionicons name="refresh-outline" size={12} color={C.done} style={{ marginRight: 4 }} />
                      <Text style={s.trashRestoreText}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handlePermanentDeleteTask(t._id)} style={s.trashEraseBtn}>
                      <Ionicons name="alert-circle-outline" size={12} color={C.danger} style={{ marginRight: 4 }} />
                      <Text style={s.trashEraseText}>Erase</Text>
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
        const tasksByColumn: Record<string, Task[]> = {};
        activeColumns.forEach((col) => {
          tasksByColumn[col.id] = filteredTasks.filter((t) => t.status === col.id);
        });

        return (
          <SwipeableKanbanBoard
            columns={activeColumns}
            tasksByColumn={tasksByColumn}
            allTasks={tasks}
            themeColor={themeColor}
            onCardPress={openTaskDetail}
            onCommentPress={openCommentsView}
            onAttachmentPress={openAttachmentsView}
            onDragStart={handleDragStart}
            hoverStatus={hoverStatus}
            hoverIndex={hoverIndex}
            activePage={activeBoardPage}
            onPageChange={setActiveBoardPage}
            scrollRef={boardScrollRef}
          />
        );
      }
    }
  };

  const filteredTasks = getFilteredAndSortedTasks();
  // ── Main board ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']} {...(draggingTask ? panResponder.panHandlers : {})}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>{activeProject.name}</Text>
          <Text style={s.headerTitle}>Task board</Text>
        </View>
        <View style={[s.row, { gap: 8 }]}>
          {!isViewer && (
            <TouchableOpacity style={s.headerActionBtn} onPress={() => setProjectSettingsModalVisible(true)} accessibilityLabel="Project Settings">
              <Ionicons name="settings-outline" size={15} color={C.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.headerActionBtn} onPress={() => openArchivedLog()}>
            <Ionicons name="archive-outline" size={15} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.filterBtn, filterPanelVisible && { borderColor: C.accentBorder, backgroundColor: C.accentBg }]}
            onPress={() => setFilterPanelVisible(!filterPanelVisible)}
          >
            <Ionicons name="funnel-outline" size={14} color={filterPanelVisible ? C.accent : C.textSecondary} />
            <Text style={[s.filterBtnText, { color: filterPanelVisible ? C.accent : C.textSecondary }]}>Filters</Text>
          </TouchableOpacity>
          {!isViewer && (
            <TouchableOpacity style={s.addTaskBtn} onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add" size={16} color={C.onAccent} />
              <Text style={s.addTaskBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Offline Status Indicator */}
      {!isOnline && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={C.onAccent} style={{ marginRight: 6 }} />
          <Text style={s.offlineBannerText}>Offline — changes will sync automatically</Text>
        </View>
      )}

      {/* View Switcher Navigation Bar */}
      <View style={s.viewSwitcherWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {[
            { id: "board", label: "Board", icon: "apps-outline" },
            { id: "calendar", label: "Calendar", icon: "calendar-outline" },
            { id: "timeline", label: "Timeline", icon: "git-commit-outline" },
            { id: "workload", label: "Workload", icon: "people-outline" },
            !isViewer && { id: "bulk", label: "Bulk", icon: "checkbox-outline" },
            !isViewer && { id: "trash", label: "Trash", icon: "trash-outline" },
          ]
            .filter((v): v is { id: string; label: string; icon: string } => typeof v === "object" && v !== null)
            .map((v) => {
              const active = activeView === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => {
                    setActiveView(v.id as any);
                    if (v.id !== "bulk") setSelectedTasks([]);
                  }}
                  style={[s.viewTab, active && s.viewTabActive]}
                >
                  <Ionicons name={v.icon as any} size={14} color={active ? C.onAccent : C.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[s.viewTabText, active && { color: C.onAccent, fontWeight: "700" }]}>{v.label}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>

      {/* Filters & Sorting Panel */}
      {filterPanelVisible && (
        <View style={s.filterPanel}>
          <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
            <Text style={s.filterPanelTitle}>Filter & sort</Text>
            <TouchableOpacity
              onPress={() => {
                setFilterAssignee(null);
                setFilterPriority(null);
                setFilterDueDate(null);
                setFilterLabel(null);
                setSortBy("position");
                setSortOrder("asc");
              }}
            >
              <Text style={s.linkText}>Reset all</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={s.filterGroupLabel}>Assignee</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity onPress={() => setFilterAssignee(null)} style={[s.filterChip, !filterAssignee && s.filterChipActive]}>
                <Text style={[s.filterChipText, !filterAssignee && s.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {activeProject.members.map((m: any) => {
                const mId = typeof m.user === "object" ? m.user._id : m.user;
                const name = typeof m.user === "object" ? `${m.user.username.firstname} ${m.user.username.lastname}` : "User";
                const active = filterAssignee === mId;
                return (
                  <TouchableOpacity key={mId} onPress={() => setFilterAssignee(mId)} style={[s.filterChip, active && s.filterChipActive]}>
                    <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={[s.row, { gap: 12, marginBottom: 12 }]}>
            <View style={s.flex}>
              <Text style={s.filterGroupLabel}>Priority</Text>
              <View style={[s.row, { gap: 6 }]}>
                {["all", "low", "medium", "high"].map((p) => {
                  const active = p === "all" ? !filterPriority : filterPriority === p;
                  return (
                    <TouchableOpacity key={p} onPress={() => setFilterPriority(p === "all" ? null : p)} style={[s.filterChip, active && s.filterChipActive, { flex: 1, alignItems: "center" }]}>
                      <Text style={[s.filterChipText, active && s.filterChipTextActive, { textTransform: "capitalize" }]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.flex}>
              <Text style={s.filterGroupLabel}>Due date</Text>
              <View style={[s.row, { gap: 6 }]}>
                {[
                  { label: "All", value: null },
                  { label: "Overdue", value: "overdue" },
                  { label: "Today", value: "today" },
                  { label: "Week", value: "week" },
                ].map((item) => {
                  const active = filterDueDate === item.value;
                  return (
                    <TouchableOpacity key={item.label} onPress={() => setFilterDueDate(item.value)} style={[s.filterChip, active && s.filterChipActive, { flex: 1, alignItems: "center" }]}>
                      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={s.dividerLight} />
          <View style={[s.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <View style={[s.row, { gap: 8 }]}>
              <Text style={s.filterGroupLabel}>Sort</Text>
              {[
                { label: "Custom", value: "position" },
                { label: "Due", value: "dueDate" },
                { label: "Priority", value: "priority" },
                { label: "Created", value: "createdAt" },
              ].map((item) => {
                const active = sortBy === item.value;
                return (
                  <TouchableOpacity key={item.value} onPress={() => setSortBy(item.value)} style={[s.sortChip, active && { backgroundColor: C.accentBg }]}>
                    <Text style={[s.sortChipText, active && { color: C.accent }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} style={s.sortOrderBtn}>
              <Ionicons name={sortOrder === "asc" ? "arrow-up" : "arrow-down"} size={13} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={s.dividerLight} />
          <Text style={s.filterGroupLabel}>Saved presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {(savedFiltersList || []).length === 0 ? (
              <Text style={[s.bodyMuted, { fontSize: 11, fontStyle: "italic" }]}>No saved presets yet</Text>
            ) : (
              (savedFiltersList || []).map((preset) => (
                <View key={preset._id} style={s.presetChip}>
                  <TouchableOpacity onPress={() => handleApplyPreset(preset)}>
                    <Text style={s.presetChipText}>{preset.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePreset(preset._id)} style={{ padding: 2 }}>
                    <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

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
            <TouchableOpacity onPress={handleSaveFilterPreset} disabled={isSavingPreset} style={[s.inlineBtn, { opacity: isSavingPreset ? 0.6 : 1 }]}>
              <Text style={s.inlineBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderActiveView()}

      {/* Undo Delete Toast Banner */}
      {showUndoBanner && undoTask && (
        <View style={s.undoBanner}>
          <Text style={s.undoBannerText} numberOfLines={1}>"{undoTask.title}" deleted</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={s.undoBannerAction}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Card Container (drag preview) */}
      {draggingTask && (
        <View style={[s.floatingCardContainer, { left: dragX - 140, top: dragY - 60 }]} pointerEvents="none">
          <TaskCard task={draggingTask} themeColor={themeColor} onPress={() => {}} isDragging />
        </View>
      )}
      {/* ── Modal: CSV Import ─────────────────────────────────────────────── */}
      <Modal visible={importModalVisible} transparent animationType="fade" onRequestClose={() => setImportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => handleBackdropPress(() => setImportModalVisible(false))} />
            <View style={s.createModal}>
              <Text style={s.modalTitle}>Import tasks via CSV</Text>

              <Text style={[s.bodyMuted, { marginBottom: 12, fontSize: 12 }]}>
                Paste CSV content below. The header row should match:{"\n"}
                <Text style={{ fontWeight: "700", color: C.accent }}>
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
                  style={[s.flex, s.primaryBtn]}
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
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Create task ─────────────────────────────────────────────── */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => handleBackdropPress(() => setCreateModalVisible(false))} />
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
                      style={[s.priorityBtn, selected ? { backgroundColor: cfg.bg, borderColor: cfg.color } : { backgroundColor: C.card, borderColor: C.border }]}
                    >
                      <Text style={[s.priorityBtnText, { color: selected ? cfg.color : C.textMuted }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <SectionLabel>Due date</SectionLabel>
              <TouchableOpacity
                onPress={() => setCreateDueDatePickerVisible(true)}
                style={[s.inputWrap, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }]}
              >
                <Text style={[s.input, { color: dueDate ? C.textPrimary : C.textMuted, paddingVertical: 10 }]}>
                  {dueDate ? formatDate(dueDate) : "Select due date (optional)"}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={C.textMuted} style={{ marginRight: 10 }} />
              </TouchableOpacity>

              <SectionLabel>Start date</SectionLabel>
              <TouchableOpacity
                onPress={() => setCreateStartDatePickerVisible(true)}
                style={[s.inputWrap, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }]}
              >
                <Text style={[s.input, { color: startDate ? C.textPrimary : C.textMuted, paddingVertical: 10 }]}>
                  {startDate ? formatDate(startDate) : "Select start date (optional)"}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={C.textMuted} style={{ marginRight: 10 }} />
              </TouchableOpacity>

              <SectionLabel>Assign to</SectionLabel>
              <View style={[s.inputWrap, { marginBottom: 24, paddingVertical: 8 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={() => setAssignedTo([])}
                    style={[s.assigneeChip, assignedTo.length === 0 ? { backgroundColor: C.accentBg, borderColor: C.accentBorder } : { backgroundColor: C.card, borderColor: C.border }]}
                  >
                    <Text style={[s.assigneeChipText, { color: assignedTo.length === 0 ? C.accentText : C.textMuted }]}>Unassigned</Text>
                  </TouchableOpacity>
                  {activeProject.members.map((m: any) => {
                    const mId = getMemberId(m.user);
                    const name = getFullName(m.user);
                    const selected = assignedTo.includes(mId);
                    return (
                      <TouchableOpacity
                        key={mId}
                        onPress={() => setAssignedTo((prev) => (prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]))}
                        style={[s.assigneeChip, selected ? { backgroundColor: C.accentBg, borderColor: C.accentBorder } : { backgroundColor: C.card, borderColor: C.border }]}
                      >
                        <Text style={[s.assigneeChipText, { color: selected ? C.accentText : C.textPrimary }]}>{name}</Text>
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
                      onPress={() => setCreateLabels((prev) => (prev.includes(lbl) ? prev.filter((l) => l !== lbl) : [...prev, lbl]))}
                      style={[s.formLabelChip, selected ? { backgroundColor: colors.bg } : { backgroundColor: C.card, borderColor: C.border }]}
                    >
                      <Text style={[s.formLabelChipText, { color: selected ? colors.text : C.textSecondary }]}>{lbl}</Text>
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
                      if (!createLabels.includes(newLabel)) setCreateLabels((prev) => [...prev, newLabel]);
                      setCustomLabelInput("");
                    }
                  }}
                  style={s.inlineBtn}
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
                      style={[s.priorityBtn, selected ? { backgroundColor: C.accentBg, borderColor: C.accentBorder } : { backgroundColor: C.card, borderColor: C.border }]}
                    >
                      <Text style={[s.priorityBtnText, { color: selected ? C.accent : C.textMuted, textTransform: "capitalize" }]}>{freq}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <SectionLabel>Blocked by (dependencies)</SectionLabel>
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
                          onPress={() => setCreateDependencies((prev) => (prev.includes(t._id) ? prev.filter((id) => id !== t._id) : [...prev, t._id]))}
                          style={[s.assigneeChip, selected ? { backgroundColor: C.accentBg, borderColor: C.accentBorder } : { backgroundColor: C.card, borderColor: C.border }]}
                        >
                          <Text style={[s.assigneeChipText, { color: selected ? C.accentText : C.textPrimary }]}>{t.title}</Text>
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
              <TouchableOpacity style={[s.flex, s.primaryBtn]} onPress={handleCreateTask} disabled={creating}>
                {creating ? <ActivityIndicator color={C.onAccent} size="small" /> : <Text style={s.primaryBtnText}>Create task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <CalendarDatePickerModal
          visible={createDueDatePickerVisible}
          value={dueDate}
          onClose={() => setCreateDueDatePickerVisible(false)}
          onChange={setDueDate}
          title="Select Due Date"
        />

        <CalendarDatePickerModal
          visible={createStartDatePickerVisible}
          value={startDate}
          onClose={() => setCreateStartDatePickerVisible(false)}
          onChange={setStartDate}
          title="Select Start Date"
        />
        </KeyboardAvoidingView>
      </Modal>
      {/* ── Modal: Task detail ─────────────────────────────────────────────── */}
      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
          <View style={s.detailOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => handleBackdropPress(() => setDetailModalVisible(false))} />
            <View style={s.detailPanel}>
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
                        if (res.success) setIsPinned(!isPinned);
                      } catch (err) {
                        console.error("Failed to pin task:", err);
                      }
                    }}
                    style={s.pinBtn}
                  >
                    <Ionicons name={isPinned ? "star" : "star-outline"} size={20} color={isPinned ? C.warn : C.textSecondary} />
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
                          style={[s.statusChip, active && { backgroundColor: st.color, borderColor: st.color }]}
                        >
                          <Text style={[s.statusChipText, active && { color: C.onAccent, fontWeight: "700" }]}>{st.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Info grid */}
                <View style={s.infoGrid}>
                  <View style={{ flexDirection: "row" }}>
                    <View style={[s.infoCell, { borderRightWidth: 0.5, borderRightColor: C.border }]}>
                      <Text style={s.infoCellLabel}>Priority</Text>
                      <Text style={[s.infoCellValue, { color: getPriorityConfig(C)[selectedTask.priority]?.color ?? C.textPrimary }]}>
                        {getPriorityConfig(C)[selectedTask.priority]?.label ?? selectedTask.priority}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={isViewer}
                      onPress={() => setDetailDueDatePickerVisible(true)}
                      style={[s.infoCell, !isViewer && { backgroundColor: "rgba(94,106,210,0.05)" }]}
                    >
                      <Text style={s.infoCellLabel}>Due date</Text>
                      <Text style={[s.infoCellValue, { color: selectedTask.dueDate ? C.textPrimary : C.textMuted }]}>
                        {formatDate(selectedTask.dueDate) || "None"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.border }}>
                    <TouchableOpacity
                      disabled={isViewer}
                      onPress={() => setDetailStartDatePickerVisible(true)}
                      style={[s.infoCell, { borderRightWidth: 0.5, borderRightColor: C.border }, !isViewer && { backgroundColor: "rgba(94,106,210,0.05)" }]}
                    >
                      <Text style={s.infoCellLabel}>Start date</Text>
                      <Text style={[s.infoCellValue, { color: selectedTask.startDate ? C.textPrimary : C.textMuted }]}>
                        {formatDate(selectedTask.startDate) || "None"}
                      </Text>
                    </TouchableOpacity>
                    <View style={s.infoCell}>
                      <Text style={s.infoCellLabel}>Members</Text>
                      <Text style={s.infoCellValue}>
                        {Array.isArray(selectedTask.assignedTo) ? `${selectedTask.assignedTo.length} assigned` : "Unassigned"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Custom Fields Section */}
                {activeProject.customFields && activeProject.customFields.length > 0 && (
                  <View style={{ marginTop: 20, marginBottom: 4 }}>
                    <SectionLabel>Custom fields</SectionLabel>
                    <View style={{ gap: 10 }}>
                      {(activeProject.customFields || []).map((field: any) => {
                        const valObj = selectedTask.customFields?.find((f: any) => f.name === field.name);
                        const initialVal = valObj ? valObj.value : undefined;

                        if (field.type === "boolean") {
                          const active = !!initialVal;
                          return (
                            <View key={field.name} style={s.boolFieldRow}>
                              <Text style={s.boolFieldLabel}>
                                {field.name}
                                {field.required && <Text style={{ color: C.danger }}> *</Text>}
                              </Text>
                              <TouchableOpacity
                                disabled={isViewer}
                                onPress={() => handleSaveCustomFieldVal(field.name, !active)}
                                style={[s.toggleTrack, active && { backgroundColor: C.accent }]}
                              >
                                <View style={[s.toggleThumb, active && { alignSelf: "flex-end" }]} />
                              </TouchableOpacity>
                            </View>
                          );
                        }
                        return (
                          <View key={field.name}>
                            <Text style={s.infoCellLabel}>
                              {field.name}
                              {field.required && <Text style={{ color: C.danger }}> *</Text>}
                            </Text>
                            <CustomFieldTextInput field={field} initialValue={initialVal} onSave={handleSaveCustomFieldVal} isViewer={isViewer} />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Description */}
                <View style={{ marginTop: 20, marginBottom: 20 }}>
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
                        <Ionicons name="create-outline" size={14} color={C.accent} />
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
                        <TouchableOpacity onPress={() => setIsEditingDesc(false)} style={s.inlineBtnGhost}>
                          <Text style={s.inlineBtnGhostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleUpdateDescription} style={s.inlineBtn}>
                          <Text style={s.inlineBtnText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : selectedTask.description ? (
                    <FormattedText text={selectedTask.description} themeColor={themeColor} />
                  ) : (
                    <Text style={[s.bodyMuted, { fontStyle: "italic" }]}>No description provided.</Text>
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
                              {isMe && <Text style={{ color: C.accent, fontSize: 11 }}>(Me)</Text>}
                            </Text>
                            {email ? <Text style={s.memberEmail}>{email}</Text> : null}
                          </View>
                          {!isViewer && (
                            <TouchableOpacity onPress={() => (isMe ? handleLeaveTask(mId) : handleRemoveTaskMember(mId))} style={s.memberAction}>
                              <Text style={s.memberActionText}>{isMe ? "Leave" : "Remove"}</Text>
                            </TouchableOpacity>
                          )}
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
                {!isViewer && activeProject.members?.length > 0 && (() => {
                  const currentIds = (selectedTask.assignedTo as any[]).map(getMemberId);
                  const allAvailable = activeProject.members.filter((pm: any) => !currentIds.includes(getMemberId(pm.user)));
                  if (allAvailable.length === 0) return null;

                  let available = [...allAvailable];
                  if (memberSearchQuery.trim()) {
                    const q = memberSearchQuery.toLowerCase();
                    available = available.filter((pm: any) => {
                      const name = getFullName(pm.user).toLowerCase();
                      const email = (pm.user?.email || "").toLowerCase();
                      return name.includes(q) || email.includes(q);
                    });
                  }

                  return (
                    <>
                      <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Add members</Text>
                      <View style={[s.inputWrap, { flexDirection: "row", alignItems: "center", marginBottom: 12, height: 40 }]}>
                        <Ionicons name="search-outline" size={15} color={C.textMuted} style={{ marginRight: 6 }} />
                        <TextInput
                          style={[s.input, { flex: 1, paddingVertical: 4 }]}
                          placeholder="Search members to add..."
                          placeholderTextColor={C.textMuted}
                          value={memberSearchQuery}
                          onChangeText={setMemberSearchQuery}
                        />
                        {memberSearchQuery ? (
                          <TouchableOpacity onPress={() => setMemberSearchQuery("")}>
                            <Ionicons name="close-circle" size={15} color={C.textMuted} />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {available.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                          {available.map((pm: any, idx: number) => {
                            const pmId = getMemberId(pm.user);
                            const name = getFullName(pm.user);
                            const initials = getInitials(pm.user);
                            return (
                              <TouchableOpacity key={pmId || idx} onPress={() => handleAddTaskMember(pmId)} style={s.addMemberChip}>
                                <View style={s.addMemberAvatar}>
                                  <Text style={s.addMemberAvatarText}>{initials}</Text>
                                </View>
                                <Text style={s.addMemberName}>{name}</Text>
                                <Ionicons name="add" size={13} color={C.accent} />
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <Text style={[s.bodyMuted, { fontStyle: "italic", marginBottom: 20 }]}>No members match your search.</Text>
                      )}
                    </>
                  );
                })()}

                {/* Labels */}
                <SectionLabel>Labels</SectionLabel>
                <View style={[s.row, { flexWrap: "wrap", gap: 6, marginBottom: 12 }]}>
                  {selectedTask.labels?.map((lbl, idx) => {
                    const colors = getLabelColor(lbl);
                    return (
                      <View key={idx} style={[s.formLabelChip, { backgroundColor: colors.bg, borderColor: "transparent" }]}>
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
                    <TouchableOpacity onPress={() => handleAddLabelToTask()} style={s.inlineBtn}>
                      <Text style={s.inlineBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}



                {/* Time Tracking */}
                <SectionLabel>Time tracking</SectionLabel>
                <View style={{ marginBottom: 16 }}>
                  <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 12 }]}>
                    <Text style={s.bodyMuted}>Estimated hours</Text>
                    <View style={[s.inputWrap, { width: 100, paddingVertical: 4 }]}>
                      <TextInput
                        style={[s.input, { paddingVertical: 4, textAlign: "center" }]}
                        placeholder="0"
                        placeholderTextColor={C.textMuted}
                        keyboardType="numeric"
                        defaultValue={estHours ? estHours.toString() : ""}
                        onChangeText={handleUpdateEstimate}
                        editable={!isViewer}
                      />
                    </View>
                  </View>

                  {estHours > 0 ? (
                    <View style={{ marginBottom: 16 }}>
                      <View style={[s.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                        <Text style={s.bodyMuted}>Logged vs estimate</Text>
                        <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "600" }}>
                          {selectedTask.actualHours || 0} / {estHours} hrs ({Math.round(((selectedTask.actualHours || 0) / estHours) * 100)}%)
                        </Text>
                      </View>
                      <View style={s.estimateTrack}>
                        <View
                          style={{
                            height: "100%",
                            width: `${Math.min(((selectedTask.actualHours || 0) / estHours) * 100, 100)}%`,
                            backgroundColor: (selectedTask.actualHours || 0) > estHours ? C.danger : C.done,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <Text style={[s.bodyMuted, { fontStyle: "italic", marginBottom: 12 }]}>Set estimated hours to track progress.</Text>
                  )}

                  {!isViewer && (
                    <View style={{ marginBottom: 16, gap: 8 }}>
                      <Text style={s.filterGroupLabel}>Log new time entry</Text>
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
                        <TouchableOpacity onPress={handleLogTime} style={[s.inlineBtn, { height: 40, minWidth: 56 }]}>
                          <Text style={s.inlineBtnText}>Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <Text style={[s.filterGroupLabel, { marginBottom: 6 }]}>Time log history</Text>
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
                                <Text style={[s.memberName, { fontWeight: "600" }]}>{log.hours} hrs</Text>
                                <Text style={[s.bodyMuted, { fontSize: 10 }]}>{logDate}</Text>
                              </View>
                              <Text style={[s.memberEmail, { marginTop: 2, fontSize: 12 }]} numberOfLines={2}>
                                {log.description || "No description"}
                              </Text>
                              {name ? <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>Logged by: {name}</Text> : null}
                            </View>
                            {!isViewer && (isMyLog || user?.role === "admin") && (
                              <TouchableOpacity onPress={() => handleDeleteTimeLog(log._id)} style={{ padding: 4, marginLeft: 8 }}>
                                <Ionicons name="trash-outline" size={16} color={C.danger} />
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
                  {`Checklist (${selectedTask.subtasks.filter((sub) => sub.isCompleted).length}/${selectedTask.subtasks.length})`}
                </SectionLabel>
                {selectedTask.subtasks.length > 0 && (
                  <View style={[s.membersBox, { marginBottom: 12 }]}>
                    {selectedTask.subtasks.map((sub, idx) => (
                      <View key={sub._id || idx} style={[s.subtaskRow, idx > 0 && { borderTopWidth: 0.5, borderTopColor: C.border }]}>
                        <TouchableOpacity
                          disabled={isViewer}
                          onPress={() => !isViewer && handleToggleSubtask(idx)}
                          style={[s.checkbox, sub.isCompleted && { backgroundColor: C.accent, borderColor: C.accent }]}
                        >
                          {sub.isCompleted && <Ionicons name="checkmark" size={12} color={C.onAccent} />}
                        </TouchableOpacity>
                        <Text style={[s.flex, s.subtaskText, sub.isCompleted && s.subtaskDone]}>{sub.title}</Text>
                        {!isViewer && (
                          <TouchableOpacity onPress={() => handleDeleteSubtask(idx)} style={s.subtaskDeleteHit}>
                            <Ionicons name="close" size={14} color={C.danger} />
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
                    <TouchableOpacity onPress={handleAddSubtask} style={s.inlineBtn}>
                      <Text style={s.inlineBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Attachments Section */}
                <SectionLabel>Attachments</SectionLabel>
                <View style={{ marginBottom: 16 }}>
                  {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {selectedTask.attachments.map((att, idx) => {
                        const isImage = att.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(att.name);
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => att.url && setPreviewAttachment(att)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: C.card,
                              borderRadius: 12,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              marginRight: 8,
                              borderWidth: 1,
                              borderColor: C.border,
                            }}
                          >
                            <Ionicons name={isImage ? "image-outline" : "document-text-outline"} size={16} color={C.accent} style={{ marginRight: 6 }} />
                            <Text style={{ color: C.textPrimary, fontSize: 13, maxWidth: 120 }} numberOfLines={1}>
                              {att.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={[s.bodyMuted, { fontStyle: "italic", fontSize: 12, marginBottom: 4 }]}>No attachments uploaded.</Text>
                  )}
                  {!isViewer && (
                    <TouchableOpacity
                      onPress={() => openAttachmentsView(selectedTask)}
                      style={[s.inlineBtnGhost, { marginTop: 8, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border }]}
                    >
                      <Text style={[s.inlineBtnGhostText, { fontSize: 12 }]}>+ Add / Manage Attachments</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Comments Section */}
                <SectionLabel>Comments</SectionLabel>
                <View style={{ marginBottom: 20 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setCommentsModalVisible(true);
                    }}
                    style={[
                      s.secondaryBtn,
                      {
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 8,
                        height: 44,
                      },
                    ]}
                  >
                    <Ionicons name="chatbubbles-outline" size={18} color={C.textPrimary} />
                    <Text style={s.secondaryBtnText}>View & Post Comments</Text>
                  </TouchableOpacity>
                </View>

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
                        style={[s.priorityBtn, selected ? { backgroundColor: C.accentBg, borderColor: C.accentBorder } : { backgroundColor: C.card, borderColor: C.border }]}
                      >
                        <Text style={[s.priorityBtnText, { color: selected ? C.accent : C.textMuted, textTransform: "capitalize" }]}>{freq}</Text>
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
                <SectionLabel>Blocked by (dependencies)</SectionLabel>
                {selectedTask.dependencies && selectedTask.dependencies.length > 0 ? (
                  <View style={[s.row, { flexWrap: "wrap", gap: 6, marginBottom: 12 }]}>
                    {selectedTask.dependencies.map((depId) => {
                      const depTask = tasks.find((t) => t._id === depId);
                      if (!depTask) return null;
                      return (
                        <View key={depId} style={s.depPillRow}>
                          <Ionicons name="lock-closed" size={10} color={C.danger} style={{ marginRight: 4 }} />
                          <Text style={s.depPillText}>{depTask.title}</Text>
                          {!isViewer && (
                            <TouchableOpacity onPress={() => handleToggleDependency(depId)} style={{ marginLeft: 6 }}>
                              <Ionicons name="close-circle" size={13} color={C.danger} />
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
                  const availableTasks = tasks.filter((t) => t._id !== selectedTask._id && !(selectedTask.dependencies || []).includes(t._id));
                  if (availableTasks.length === 0) return null;
                  return (
                    <>
                      <Text style={[s.bodyMuted, { fontSize: 11, marginBottom: 8 }]}>Add blocker dependency:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        {availableTasks.map((t) => (
                          <TouchableOpacity key={t._id} onPress={() => handleToggleDependency(t._id)} style={s.addMemberChip}>
                            <Ionicons name="lock-open-outline" size={11} color={C.accent} />
                            <Text style={s.addMemberName}>{t.title}</Text>
                            <Ionicons name="add" size={13} color={C.accent} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  );
                })()}



                {/* Archive */}
                {!isViewer && (
                  <TouchableOpacity onPress={() => handleToggleArchiveTask(selectedTask)} style={s.archiveBtn}>
                    <Ionicons name="archive-outline" size={15} color={C.warn} />
                    <Text style={s.archiveBtnText}>Archive task</Text>
                  </TouchableOpacity>
                )}

                {/* Delete */}
                {!isViewer && (
                  <TouchableOpacity onPress={() => handleDeleteTask(selectedTask._id)} style={s.dangerBtn}>
                    <Ionicons name="trash-outline" size={15} color={C.danger} />
                    <Text style={s.dangerBtnText}>Delete task</Text>
                  </TouchableOpacity>
                )}

                {/* Close */}
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={[s.secondaryBtn, { marginTop: 8, marginBottom: 8 }]}>
                  <Text style={s.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>

        {selectedTask && (
          <>
            <CalendarDatePickerModal
              visible={detailDueDatePickerVisible}
              value={selectedTask.dueDate}
              onClose={() => setDetailDueDatePickerVisible(false)}
              onChange={handleUpdateDueDate}
              title="Update Due Date"
            />

            <CalendarDatePickerModal
              visible={detailStartDatePickerVisible}
              value={selectedTask.startDate}
              onClose={() => setDetailStartDatePickerVisible(false)}
              onChange={handleUpdateStartDate}
              title="Update Start Date"
            />
          </>
        )}
        </KeyboardAvoidingView>
      </Modal>
      {/* ── Modal: Attachment Preview ────────────────────────────────────── */}
      <Modal visible={previewAttachment !== null} transparent animationType="fade" onRequestClose={() => setPreviewAttachment(null)}>
        <View style={s.previewOverlay}>
          <View style={s.previewCard}>
            <View style={s.previewHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={s.previewTitle} numberOfLines={1}>{previewAttachment?.name}</Text>
                <Text style={s.previewSubtitle}>{previewAttachment?.fileType.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewAttachment(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              {previewAttachment && (previewAttachment.fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(previewAttachment.name)) ? (
                <Image source={{ uri: previewAttachment.url }} style={{ width: "100%", height: "100%", borderRadius: 12 }} resizeMode="contain" />
              ) : (
                <View style={{ alignItems: "center", gap: 16, padding: 20 }}>
                  <Ionicons name="document-text-outline" size={72} color={C.accent} />
                  <Text style={s.previewFallbackTitle}>No inline preview available for this file type</Text>
                  <Text style={s.previewFallbackHint}>You can open it in an external viewer or browser.</Text>
                  <TouchableOpacity
                    onPress={() => previewAttachment?.url && Linking.openURL(previewAttachment.url)}
                    style={s.previewOpenBtn}
                  >
                    <Text style={s.previewOpenBtnText}>Open in browser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={() => setPreviewAttachment(null)} style={[s.secondaryBtn, { marginTop: 16 }]}>
              <Text style={s.secondaryBtnText}>Close preview</Text>
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
              <Text style={s.modalTitle}>Archived tasks</Text>
              <TouchableOpacity onPress={() => setArchivedModalVisible(false)}>
                <Ionicons name="close" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingArchived ? (
              <ActivityIndicator color={C.accent} size="small" style={{ marginVertical: 20 }} />
            ) : archivedTasks.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Ionicons name="archive-outline" size={32} color={C.textMuted} style={{ marginBottom: 12 }} />
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
                        <TouchableOpacity onPress={() => handleRestoreTask(task)} style={s.restoreBtn}>
                          <Text style={s.restoreBtnText}>Restore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTask(task._id)} style={s.deleteIconBtn}>
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
      <Modal visible={projectSettingsModalVisible} transparent animationType="fade" onRequestClose={() => setProjectSettingsModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.createModal, { maxHeight: "85%" }]}>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 20 }]}>
              <Text style={[s.modalTitle, { marginBottom: 0 }]}>Project settings</Text>
              <TouchableOpacity onPress={() => setProjectSettingsModalVisible(false)}>
                <Ionicons name="close" size={22} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={s.segmentedControl}>
              <TouchableOpacity
                onPress={() => setActiveSettingsTab("columns")}
                style={[s.segmentedItem, activeSettingsTab === "columns" && s.segmentedItemActive]}
              >
                <Text style={[s.segmentedItemText, activeSettingsTab === "columns" && s.segmentedItemTextActive]}>Columns</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveSettingsTab("fields")}
                style={[s.segmentedItem, activeSettingsTab === "fields" && s.segmentedItemActive]}
              >
                <Text style={[s.segmentedItemText, activeSettingsTab === "fields" && s.segmentedItemTextActive]}>Custom fields</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16, marginBottom: 20 }}>
              {activeSettingsTab === "columns" ? (
                <View>
                  <SectionLabel>Current columns</SectionLabel>
                  <View style={{ gap: 8, marginBottom: 20 }}>
                    {(activeProject.columns && activeProject.columns.length > 0 ? activeProject.columns : DEFAULT_BOARD_COLUMNS).map((col) => (
                      <View key={col.id} style={s.columnSettingRow}>
                        <View style={[s.row, { gap: 8 }]}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: col.color }} />
                          <Text style={s.columnSettingLabel}>{col.label}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteColumn(col.id)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <View style={s.dividerLight} />

                  <SectionLabel>Add new column</SectionLabel>
                  <View style={[s.inputWrap, { marginBottom: 12 }]}>
                    <TextInput
                      style={s.input}
                      placeholder="Column label (e.g. Testing, Blocked)..."
                      placeholderTextColor={C.textMuted}
                      value={newColLabel}
                      onChangeText={setNewColLabel}
                    />
                  </View>

                  <SectionLabel>Column color</SectionLabel>
                  <View style={[s.row, { gap: 10, marginBottom: 20, flexWrap: "wrap" }]}>
                    {[C.todo, C.inprog, C.done, "#9D7BEA", C.danger, "#3B82F6", "#EC4899"].map((color) => {
                      const selected = newColColor === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setNewColColor(color)}
                          style={[s.colorSwatch, { backgroundColor: color }, selected && { borderColor: C.textPrimary }]}
                        >
                          {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={handleAddColumn} style={s.primaryBtn}>
                    <Text style={s.primaryBtnText}>Add column</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <SectionLabel>Current custom fields</SectionLabel>
                  <View style={{ gap: 8, marginBottom: 20 }}>
                    {(activeProject.customFields || []).length === 0 ? (
                      <Text style={[s.bodyMuted, { fontStyle: "italic" }]}>No custom fields configured.</Text>
                    ) : (
                      (activeProject.customFields || []).map((field) => (
                        <View key={field.name} style={s.columnSettingRow}>
                          <View>
                            <Text style={s.columnSettingLabel}>
                              {field.name}
                              {field.required && <Text style={{ color: C.danger }}> *</Text>}
                            </Text>
                            <Text style={s.fieldTypeLabel}>Type: {field.type}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteCustomField(field.name)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={16} color={C.danger} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={s.dividerLight} />

                  <SectionLabel>Add custom field</SectionLabel>
                  <View style={[s.inputWrap, { marginBottom: 12 }]}>
                    <TextInput
                      style={s.input}
                      placeholder="Field Name (e.g. Story Points, Client)..."
                      placeholderTextColor={C.textMuted}
                      value={newFieldName}
                      onChangeText={setNewFieldName}
                    />
                  </View>

                  <SectionLabel>Field type</SectionLabel>
                  <View style={[s.row, { gap: 6, marginBottom: 16 }]}>
                    {["text", "number", "date", "boolean"].map((type) => {
                      const selected = newFieldType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setNewFieldType(type as any)}
                          style={[s.filterChip, selected && s.filterChipActive, { flex: 1, alignItems: "center", marginRight: 0 }]}
                        >
                          <Text style={[s.filterChipText, selected && s.filterChipTextActive, { textTransform: "capitalize" }]}>{type}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[s.row, { justifyContent: "space-between", marginBottom: 20 }]}>
                    <Text style={{ fontSize: 13, color: C.textPrimary, fontWeight: "500" }}>Required field</Text>
                    <TouchableOpacity
                      onPress={() => setNewFieldRequired(!newFieldRequired)}
                      style={[s.toggleTrack, newFieldRequired && { backgroundColor: C.accent }]}
                    >
                      <View style={[s.toggleThumb, newFieldRequired && { alignSelf: "flex-end" }]} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleAddCustomField} style={s.primaryBtn}>
                    <Text style={s.primaryBtnText}>Add custom field</Text>
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

      {/* ── Modal: Focused Comments ─────────────────────────────────────────── */}
      <Modal visible={commentsModalVisible} transparent animationType="slide" onRequestClose={() => setCommentsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
          <View style={s.detailOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => handleBackdropPress(() => setCommentsModalVisible(false))} />
            <View style={[s.detailPanel, { maxHeight: "80%" }]}>
            <View style={s.dragHandle} />
            {selectedTask && (
              <View>
                <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
                  <View style={s.flex}>
                    <Text style={s.headerEyebrow}>Task Comments</Text>
                    <Text style={s.h2} numberOfLines={1}>{selectedTask.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCommentsModalVisible(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={C.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 20 }}>
                  <SectionLabel>{`Comments (${comments.length})`}</SectionLabel>

                  {!isViewer && (
                    <View style={s.commentComposer}>
                      <View style={[s.flex, s.commentComposerInputWrap]}>
                        <TextInput
                          style={s.commentComposerInput}
                          placeholder="Write a comment…"
                          placeholderTextColor={C.textMuted}
                          value={newCommentContent}
                          onChangeText={handleNewCommentChangeText}
                          multiline
                        />
                      </View>
                      <TouchableOpacity
                        onPress={handlePostComment}
                        disabled={!newCommentContent.trim()}
                        style={[s.commentSendBtn, !newCommentContent.trim() && { opacity: 0.4 }]}
                      >
                        <Ionicons name="arrow-up" size={18} color={C.onAccent} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {!isViewer && <View style={{ marginBottom: 8 }}>{renderMentionSuggestions("newComment")}</View>}

                  {loadingComments ? (
                    <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                  ) : comments.length === 0 ? (
                    <View style={s.emptyStateBox}>
                      <Ionicons name="chatbubbles-outline" size={22} color={C.textMuted} style={{ marginBottom: 6 }} />
                      <Text style={s.emptyHint}>No comments yet — be the first to say something</Text>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 12, gap: 10 }}>
                      {comments.map((comm) => {
                        const isOwner = comm.user?._id === user?._id;
                        const isEditing = editingCommentId === comm._id;

                        return (
                          <View key={comm._id} style={s.commentCard}>
                            <View style={s.commentMeta}>
                              <View style={s.commentAuthorRow}>
                                <View style={s.commentAvatar}>
                                  <Text style={s.commentAvatarText}>{getInitials(comm.user)}</Text>
                                </View>
                                <View>
                                  <Text style={s.commentAuthor}>{getFullName(comm.user)}</Text>
                                  {comm.createdAt && (
                                    <Text style={s.commentDate}>{new Date(comm.createdAt).toLocaleDateString()}</Text>
                                  )}
                                </View>
                              </View>
                              {isOwner && !isEditing && (
                                <View style={{ flexDirection: "row", gap: 4 }}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setEditingCommentId(comm._id);
                                      setEditCommentText(comm.content);
                                    }}
                                    style={s.commentIconBtn}
                                  >
                                    <Ionicons name="pencil-outline" size={14} color={C.accent} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteComment(comm._id)} style={s.commentIconBtn}>
                                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>

                            {isEditing ? (
                              <View style={{ gap: 8, marginTop: 8 }}>
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
                                  <TouchableOpacity
                                    onPress={() => {
                                      setEditingCommentId(null);
                                      setEditCommentText("");
                                    }}
                                    style={s.inlineBtnGhost}
                                  >
                                    <Text style={s.inlineBtnGhostText}>Cancel</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleUpdateComment(comm._id, editCommentText)} style={s.inlineBtn}>
                                    <Text style={s.inlineBtnText}>Save</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
                              <Text style={s.commentBody}>{renderInline(comm.content, themeColor)}</Text>
                            )}

                            {/* Reaction chips — larger hit area, even spacing */}
                            <View style={s.reactionRow}>
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
                                    style={[s.reactionChip, hasReacted && { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}
                                  >
                                    <Text style={{ fontSize: 13 }}>{emoji}</Text>
                                    {count > 0 ? (
                                      <Text style={[s.reactionCount, hasReacted && { color: C.accent }]}>{count}</Text>
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
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={s.secondaryBtn} onPress={() => setCommentsModalVisible(false)}>
              <Text style={s.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Focused Attachments ──────────────────────────────────────── */}
      <Modal visible={attachmentsModalVisible} transparent animationType="slide" onRequestClose={() => setAttachmentsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
          <View style={s.detailOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => handleBackdropPress(() => setAttachmentsModalVisible(false))} />
            <View style={[s.detailPanel, { maxHeight: "80%" }]}>
            <View style={s.dragHandle} />
            {selectedTask && (
              <View>
                <View style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}>
                  <View style={s.flex}>
                    <Text style={s.headerEyebrow}>Task Attachments</Text>
                    <Text style={s.h2} numberOfLines={1}>{selectedTask.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAttachmentsModalVisible(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={C.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 20 }}>
                  <SectionLabel>Attachments</SectionLabel>
                  {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      {selectedTask.attachments.map((att, idx) => {
                        const isImage = att.fileType?.startsWith("image/") || (att.name && /\.(jpg|jpeg|png|gif)$/i.test(att.name));
                        return (
                          <TouchableOpacity key={idx} onPress={() => att.url && setPreviewAttachment(att)} style={s.attachmentRow}>
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
                            <Ionicons name="eye-outline" size={14} color={C.accent} />
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
                      <ActivityIndicator size="small" color={C.accent} />
                      <Text style={s.bodyMuted}>Uploading…</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={s.secondaryBtn} onPress={() => setAttachmentsModalVisible(false)}>
              <Text style={s.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message}
        actions={confirmDialog?.actions || []}
        onClose={() => setConfirmDialog(null)}
        colors={{
          surface: C.surface,
          border: C.border,
          textPrimary: C.textPrimary,
          textSecondary: C.textSecondary,
          muted: C.textMuted,
          accent: C.accent,
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
// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },

  // Typography
  h2: { fontSize: 19, fontWeight: "700", color: C.textPrimary },
  bodyMuted: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted, marginBottom: 10 },
  linkText: { fontSize: 12, color: C.accent, fontWeight: "600" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  headerEyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4, color: C.textMuted, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: C.textPrimary },
  headerActionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: "transparent" },
  filterBtnText: { fontSize: 12, fontWeight: "600" },
  addTaskBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: C.accent },
  addTaskBtnText: { fontSize: 13, fontWeight: "700", color: C.onAccent },

  // Offline banner
  offlineBanner: { backgroundColor: C.warn, paddingVertical: 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  offlineBannerText: { fontSize: 11, fontWeight: "700", color: C.onAccent },

  // View switcher
  viewSwitcherWrap: { paddingBottom: 10 },
  viewTab: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.card },
  viewTabActive: { backgroundColor: C.accent },
  viewTabText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },

  // Board / Swipeable columns
  columnTabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 4 },
  columnTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  columnTabDot: { width: 6, height: 6, borderRadius: 3 },
  columnTabText: { fontSize: 12, color: C.textMuted, fontWeight: "600" },
  columnTabCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  columnTabCountText: { fontSize: 10, fontWeight: "700", color: C.textMuted },
  pageDotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 10 },
  pageDot: { width: 6, height: 6, borderRadius: 3 },

  // Empty column
  emptyColumn: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyColumnText: { fontSize: 12, color: C.textMuted },

  // Card
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardCompleted: { opacity: 0.6 },
  cardDragging: { opacity: 0.95 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: C.textPrimary, lineHeight: 20, marginBottom: 3 },
  cardTitleStrike: { textDecorationLine: "line-through", color: C.textMuted },
  cardDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  cardIconBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  cardIconText: { fontSize: 11, fontWeight: "600", color: C.textSecondary },
  grabHandle: { padding: 5, borderRadius: 6, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  blockedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.dangerBg, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, gap: 3 },
  blockedBadgeText: { color: C.danger, fontSize: 9, fontWeight: "700" },
  recurringBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.accentBg, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, gap: 3 },
  recurringBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "capitalize", color: C.accent },

  // Due date
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dueDateText: { fontSize: 10, fontWeight: "600" },

  // Progress
  progressArea: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: C.accent },
  progressCount: { fontSize: 10, fontWeight: "600", color: C.textMuted },

  // Avatars
  avatarStack: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.accentBg, borderWidth: 1.5, borderColor: C.card, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 8, fontWeight: "700", color: C.accentText },
  avatarMore: { backgroundColor: C.border },
  avatarMoreText: { fontSize: 7, fontWeight: "700", color: C.textMuted },
  unassignedPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  unassignedText: { fontSize: 10, color: C.textMuted },

  // Labels (chips)
  labelChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  labelChipText: { fontSize: 9, fontWeight: "700" },

  // Floating drag card
  floatingCardContainer: { position: "absolute", width: 280, zIndex: 9999, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 16, transform: [{ scale: 1.04 }] },
  placeholderCard: { height: 64, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.accentBorder, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.accentBg, marginBottom: 10 },
  placeholderText: { fontSize: 11, fontWeight: "700", color: C.accent, textTransform: "uppercase" },

  // Undo banner
  undoBanner: { position: "absolute", bottom: 20, left: 16, right: 16, backgroundColor: C.card, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  undoBannerText: { color: C.textPrimary, fontSize: 13, fontWeight: "600", flex: 1, marginRight: 12 },
  undoBannerAction: { color: C.accent, fontSize: 13, fontWeight: "700" },

  // Modals (generic)
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  createModal: { width: "100%", backgroundColor: C.surface, borderRadius: 22, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 18 },

  detailOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  detailPanel: { backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40, maxHeight: "90%" },
  dragHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  pinBtn: { padding: 4 },

  // Inputs
  inputWrap: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14 },
  inputMultiline: { paddingVertical: 8 },
  input: { color: C.textPrimary, fontSize: 14, paddingVertical: 12 },

  // Priority / status / segmented chips
  priorityBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: "center", borderWidth: 1 },
  priorityBtnText: { fontSize: 12, fontWeight: "700" },
  statusChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: C.card, minWidth: 84, alignItems: "center" },
  statusChipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },

  segmentedControl: { flexDirection: "row", backgroundColor: C.card, borderRadius: 11, padding: 3 },
  segmentedItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segmentedItemActive: { backgroundColor: C.accent },
  segmentedItemText: { fontSize: 12, fontWeight: "600", color: C.textSecondary, textTransform: "capitalize" },
  segmentedItemTextActive: { color: C.onAccent, fontWeight: "700" },

  // Assignee chips
  assigneeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  assigneeChipText: { fontSize: 12, fontWeight: "600" },

  // Buttons
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnText: { fontSize: 14, fontWeight: "700", color: C.onAccent },
  primaryBtn: { paddingVertical: 14, borderRadius: 13, alignItems: "center", backgroundColor: C.accent },
  primaryBtnText: { fontSize: 14, fontWeight: "700", color: C.onAccent },
  secondaryBtn: { paddingVertical: 14, borderRadius: 13, alignItems: "center", backgroundColor: C.card },
  secondaryBtnText: { fontSize: 14, fontWeight: "600", color: C.textPrimary },
  inlineBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, justifyContent: "center", alignItems: "center", backgroundColor: C.accent },
  inlineBtnText: { fontSize: 12, fontWeight: "700", color: C.onAccent },
  inlineBtnGhost: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, justifyContent: "center", alignItems: "center", backgroundColor: C.card },
  inlineBtnGhostText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 13, backgroundColor: C.dangerBg, marginTop: 10 },
  dangerBtnText: { fontSize: 14, fontWeight: "700", color: C.danger },
  attachBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, backgroundColor: C.card, borderRadius: 11 },
  attachBtnText: { fontSize: 12, color: C.textSecondary, fontWeight: "600" },

  // Info grid
  infoGrid: { backgroundColor: C.card, borderRadius: 14, overflow: "hidden" },
  infoCell: { flex: 1, padding: 14 },
  infoCellLabel: { fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: "600", textTransform: "uppercase" },
  infoCellValue: { fontSize: 13, fontWeight: "700", color: C.textPrimary },

  // Custom field toggles
  boolFieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12 },
  boolFieldLabel: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  toggleTrack: { width: 46, height: 26, borderRadius: 13, backgroundColor: C.border, padding: 3, justifyContent: "center" },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },

  // Members
  membersBox: { backgroundColor: C.card, borderRadius: 14, overflow: "hidden" },
  memberRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentBg, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 12, fontWeight: "700", color: C.accentText },
  memberName: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  memberEmail: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  memberAction: { paddingHorizontal: 11, paddingVertical: 7, backgroundColor: C.dangerBg, borderRadius: 9, minHeight: 32 },
  memberActionText: { fontSize: 11, fontWeight: "700", color: C.danger },

  addMemberChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, borderRadius: 20, marginRight: 8 },
  addMemberAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accentBg, alignItems: "center", justifyContent: "center" },
  addMemberAvatarText: { fontSize: 8, fontWeight: "700", color: C.accentText },
  addMemberName: { fontSize: 12, fontWeight: "600", color: C.textPrimary },

  // Attachments
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 10, marginBottom: 8 },
  attachmentThumb: { width: 44, height: 44, borderRadius: 9, overflow: "hidden" },
  attachmentThumbFile: { backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  attachmentName: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  attachmentType: { fontSize: 10, color: C.textMuted, marginTop: 2 },

  // Time tracking
  estimateTrack: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },

  // Checklist
  subtaskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.borderLight, alignItems: "center", justifyContent: "center" },
  subtaskText: { fontSize: 13, color: C.textPrimary },
  subtaskDone: { textDecorationLine: "line-through", color: C.textMuted },
  subtaskDeleteHit: { padding: 8 },

  // Dependencies
  depPillRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.dangerBg, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  depPillText: { fontSize: 11, fontWeight: "700", color: C.danger },
  depLabel: { color: C.warn, fontSize: 10, fontWeight: "700" },
  depChip: { backgroundColor: C.warnBg, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  depChipText: { color: C.warn, fontSize: 9, fontWeight: "700" },

  // Comments — redesigned for reach/accessibility
  commentComposer: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 6 },
  commentComposerInputWrap: { backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4, minHeight: 44, justifyContent: "center" },
  commentComposerInput: { color: C.textPrimary, fontSize: 14, paddingVertical: 8, maxHeight: 100 },
  commentSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  mentionPopover: { backgroundColor: C.card, borderRadius: 12, padding: 6, marginBottom: 10, maxHeight: 160, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5, zIndex: 999 },
  mentionPopoverLabel: { color: C.textMuted, fontSize: 9, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 6 },
  mentionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 8, borderRadius: 9, marginVertical: 1, gap: 8 },
  mentionAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentBg, alignItems: "center", justifyContent: "center" },
  mentionAvatarText: { color: C.accentText, fontSize: 9, fontWeight: "700" },
  mentionName: { color: C.textPrimary, fontSize: 12, fontWeight: "600" },
  mentionHandle: { color: C.textMuted, fontSize: 10 },

  commentCard: { backgroundColor: C.card, borderRadius: 14, padding: 14 },
  commentMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  commentAuthorRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.accentBg, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: C.accentText, fontSize: 10, fontWeight: "700" },
  commentAuthor: { fontSize: 12, fontWeight: "700", color: C.textPrimary },
  commentDate: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  commentIconBtn: { padding: 8, borderRadius: 8 },
  commentBody: { fontSize: 13, color: C.textPrimary, lineHeight: 19, marginTop: 10 },

  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  reactionChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: "transparent", minHeight: 30 },
  reactionCount: { fontSize: 10, fontWeight: "700", color: C.textSecondary },

  // Markdown toolbar / formatted text
  mdToolbar: { flexDirection: "row", gap: 6, marginBottom: 6, backgroundColor: C.card, padding: 6, borderRadius: 10 },
  mdBtn: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: C.bg, borderRadius: 6 },
  mdBtnText: { color: C.textSecondary, fontSize: 11, fontWeight: "600" },
  mdBtnTextBold: { color: C.textPrimary, fontWeight: "bold", fontSize: 11 },
  mdBtnTextItalic: { color: C.textPrimary, fontStyle: "italic", fontSize: 11 },
  codeBlock: { backgroundColor: C.bg, borderRadius: 10, padding: 10, marginVertical: 4 },
  codeBlockText: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 12, color: C.accentText },
  bulletRow: { flexDirection: "row", paddingLeft: 6, marginVertical: 3, alignItems: "flex-start" },
  bulletDot: { color: C.accent, fontSize: 13, marginRight: 8 },
  bulletText: { flex: 1, fontSize: 13, color: C.textSecondary },
  inlineCheckbox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: C.borderLight, marginRight: 8, alignItems: "center", justifyContent: "center", marginTop: 2 },
  formattedLine: { fontSize: 13, lineHeight: 19, color: C.textSecondary, marginBottom: 4 },
  inlineCode: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", backgroundColor: C.card, color: C.accentText, paddingHorizontal: 4, borderRadius: 4, fontSize: 12 },
  mentionChip: { fontWeight: "700", backgroundColor: C.accentBg, paddingHorizontal: 4, borderRadius: 4, overflow: "hidden" },

  // Filter panel
  filterPanel: { backgroundColor: C.surface, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  filterPanelTitle: { fontSize: 12, fontWeight: "700", color: C.textPrimary, textTransform: "uppercase", letterSpacing: 0.4 },
  filterGroupLabel: { fontSize: 10, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", marginBottom: 7, letterSpacing: 0.3 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9, backgroundColor: C.card, marginRight: 6 },
  filterChipActive: { backgroundColor: C.accentBg },
  filterChipText: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },
  filterChipTextActive: { color: C.accent, fontWeight: "700" },
  sortChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  sortChipText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  sortOrderBtn: { padding: 8, borderRadius: 8, backgroundColor: C.card },
  dividerLight: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },

  presetChip: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 9, paddingLeft: 10, paddingRight: 6, paddingVertical: 6, marginRight: 8, gap: 6 },
  presetChipText: { fontSize: 11, color: C.textPrimary, fontWeight: "600" },

  // Archive section
  archiveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 13, backgroundColor: C.warnBg, marginTop: 18 },
  archiveBtnText: { fontSize: 14, fontWeight: "700", color: C.warn },
  archivedItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 12 },
  archivedItemTitle: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  restoreBtn: { paddingHorizontal: 11, paddingVertical: 7, backgroundColor: C.accentBg, borderRadius: 9 },
  restoreBtnText: { fontSize: 11, fontWeight: "700", color: C.accentText },
  deleteIconBtn: { padding: 9, backgroundColor: C.dangerBg, borderRadius: 9, alignItems: "center", justifyContent: "center" },

  formLabelChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, marginRight: 6, marginBottom: 6 },
  formLabelChipText: { fontSize: 11, fontWeight: "700" },

  // Calendar
  calNavBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  calMonthLabel: { color: C.textPrimary, fontWeight: "700", fontSize: 13 },
  calGrid: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 16 },
  calWeekdayLabel: { color: C.textMuted, fontSize: 11, width: 36, textAlign: "center", fontWeight: "700" },
  calDayCell: { width: 36, height: 36, margin: 4, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  calDayText: { color: C.textPrimary, fontWeight: "600", fontSize: 12 },
  calDayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, position: "absolute", bottom: 5 },
  weekDayCard: { backgroundColor: C.card, borderRadius: 16, padding: 16 },
  weekDayLabel: { color: C.textPrimary, fontWeight: "700", marginBottom: 8, fontSize: 13 },
  weekDayTaskRow: { paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: C.border },
  weekDayTaskText: { color: C.textPrimary, fontWeight: "600", fontSize: 13 },
  emptyHint: { color: C.textSecondary, fontSize: 11 },
  listSectionTitle: { color: C.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 14 },
  emptyStateBox: { padding: 28, alignItems: "center", backgroundColor: C.card, borderRadius: 16 },
  simpleListCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  simpleListTitle: { color: C.textPrimary, fontWeight: "700", fontSize: 14, marginBottom: 6 },

  // Timeline
  smallActionBtn: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9 },
  smallActionBtnText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  timelineCard: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 12 },
  timelineTitle: { color: C.textPrimary, fontWeight: "700", fontSize: 14 },
  timelineDates: { color: C.textSecondary, fontSize: 11, marginTop: 3 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7 },
  statusPillText: { fontSize: 9, fontWeight: "700" },
  ganttTrack: { height: 8, width: "100%", backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },
  ganttFill: { height: "100%", borderRadius: 4 },

  // Workload
  countBadge: { backgroundColor: C.card, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: C.accent },
  workloadCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  workloadAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.accentBg, alignItems: "center", justifyContent: "center", marginRight: 10 },
  workloadAvatarText: { fontWeight: "700", color: C.accentText, fontSize: 11 },
  workloadName: { color: C.textPrimary, fontWeight: "700", fontSize: 14 },
  workloadEmail: { color: C.textSecondary, fontSize: 11 },
  overloadPill: { backgroundColor: C.dangerBg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7, flexDirection: "row", alignItems: "center" },
  overloadPillText: { fontSize: 9, fontWeight: "700", color: C.danger },
  workloadStatLabel: { color: C.textMuted, fontSize: 10, textTransform: "uppercase", marginBottom: 2 },
  workloadStatValue: { color: C.textPrimary, fontWeight: "700", fontSize: 15 },
  workloadProgressTrack: { height: 6, width: "100%", backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  workloadProgressFill: { height: "100%", backgroundColor: C.done, borderRadius: 3 },
  workloadTaskRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.bg, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10 },
  workloadTaskTitle: { color: C.textPrimary, fontSize: 12, flex: 1, marginRight: 8, fontWeight: "600" },

  // Bulk
  bulkRow: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "transparent" },
  bulkCheckbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: C.textSecondary, marginRight: 12, alignItems: "center", justifyContent: "center" },
  bulkRowTitle: { color: C.textPrimary, fontWeight: "700", fontSize: 13 },
  bulkRowMeta: { color: C.textSecondary, fontSize: 11, marginTop: 3 },
  bulkActionBar: { position: "absolute", bottom: 20, left: 16, right: 16, backgroundColor: C.card, borderRadius: 20, paddingVertical: 14, flexDirection: "row", justifyContent: "space-around", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  bulkActionItem: { alignItems: "center" },
  bulkActionLabel: { color: C.textPrimary, fontSize: 10, marginTop: 4, fontWeight: "600" },

  // Trash
  trashCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  trashTitle: { color: C.textPrimary, fontWeight: "700", fontSize: 14 },
  trashMeta: { color: C.textSecondary, fontSize: 11, marginTop: 4 },
  trashRestoreBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(93,202,165,0.12)", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9 },
  trashRestoreText: { color: C.done, fontSize: 11, fontWeight: "700" },
  trashEraseBtn: { flexDirection: "row", alignItems: "center", backgroundColor: C.dangerBg, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9 },
  trashEraseText: { color: C.danger, fontSize: 11, fontWeight: "700" },

  // Project settings
  columnSettingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11 },
  columnSettingLabel: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  fieldTypeLabel: { fontSize: 10, color: C.textMuted, marginTop: 2, textTransform: "uppercase" },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center" },

  // Attachment preview modal
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  previewCard: { width: "90%", height: "80%", backgroundColor: C.surface, borderRadius: 22, padding: 20, justifyContent: "space-between" },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12, marginBottom: 16 },
  previewTitle: { color: C.textPrimary, fontSize: 15, fontWeight: "700" },
  previewSubtitle: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  previewFallbackTitle: { color: C.textPrimary, fontSize: 14, fontWeight: "600", textAlign: "center" },
  previewFallbackHint: { color: C.textSecondary, fontSize: 12, textAlign: "center" },
  previewOpenBtn: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  previewOpenBtnText: { color: C.onAccent, fontWeight: "700", fontSize: 13 },
});
