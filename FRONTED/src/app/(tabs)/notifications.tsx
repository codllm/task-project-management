import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import { useRouter } from "expo-router";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from "../../api/notification.api";

// ─── Theme (matches Home / Tasks screens) ──────────────────────────────────────
const T = {
  bg:            "#15171C",
  surface:       "#1D2027",
  card:          "#22252E",
  cardUnread:    "#1B2030",
  border:        "#2A2D38",
  borderLight:   "#333748",
  textPrimary:   "#E2E4EA",
  textSecondary: "#6B7280",
  textMuted:     "#3D4049",
  accent:        "#5865F2",
  accentBg:      "rgba(88,101,242,0.12)",
  accentText:    "#A5AEFF",
  danger:        "#F04747",
  dangerBg:      "rgba(240,71,71,0.08)",
  dangerBorder:  "rgba(240,71,71,0.18)",
  green:         "#2BAE76",
};

// ─── Notification type config (recolored to theme palette) ───────────────────
const TYPE_CONFIG: Record<string, { icon: string; iconColor: string; iconBg: string }> = {
  WORKSPACE_INVITE: { icon: "briefcase",          iconColor: "#5865F2", iconBg: "rgba(88,101,242,0.10)" },
  PROJECT_ADDED:    { icon: "rocket",             iconColor: "#A5AEFF", iconBg: "rgba(165,174,255,0.10)" },
  TASK_ASSIGNED:    { icon: "checkmark-circle",   iconColor: "#2BAE76", iconBg: "rgba(43,174,118,0.10)" },
  TASK_UPDATED:      { icon: "flash",              iconColor: "#FAA61A", iconBg: "rgba(250,166,26,0.10)" },
  COMMENT_ADDED:    { icon: "chatbubble-ellipses",iconColor: "#E093C0", iconBg: "rgba(220,80,180,0.10)" },
};

const DEFAULT_TYPE = { icon: "notifications", iconColor: "#6B7280", iconBg: "rgba(107,114,128,0.10)" };

const FILTERS = [
  { id: "all",              label: "All",      icon: "apps-outline" },
  { id: "TASK_ASSIGNED",    label: "Tasks",     icon: "checkmark-circle-outline" },
  { id: "COMMENT_ADDED",    label: "Comments",  icon: "chatbubble-outline" },
  { id: "PROJECT_ADDED",    label: "Projects",  icon: "rocket-outline" },
  { id: "WORKSPACE_INVITE", label: "Invites",   icon: "briefcase-outline" },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { refreshNotifications: updateGlobalUnread, themeColor, projects, selectProject } = useApp();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      if (res.success) setNotifications(res.notifications);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getNotifications();
      if (res.success) setNotifications(res.notifications);
      await updateGlobalUnread();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkRead = async (notification: Notification) => {
    if (notification.read) return;
    try {
      const res = await markNotificationRead(notification._id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
        await updateGlobalUnread();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    await handleMarkRead(item);
    if (item.link) {
      const match = item.link.match(/\/projects\/([a-fA-F0-9]{24})/);
      if (match?.[1]) {
        const proj = projects.find((p) => p._id === match[1]);
        if (proj) {
          selectProject(proj);
          router.push("/(tabs)/tasks");
        } else {
          router.push("/(tabs)/projects");
        }
      } else {
        router.push("/(tabs)/home");
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        await updateGlobalUnread();
        Alert.alert("Done", "All notifications marked as read.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === now.toDateString()) return `Today · ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` · ${time}`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications =
    activeFilter === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeFilter);

  // Per-filter counts for badges
  const filterCounts: Record<string, number> = { all: notifications.length };
  FILTERS.slice(1).forEach((f) => {
    filterCounts[f.id] = notifications.filter((n) => n.type === f.id).length;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: T.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "500", color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
            Activity
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: T.textPrimary, fontSize: 20, fontWeight: "600" }}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: T.accentBg, borderWidth: 0.5, borderColor: T.accent + "50", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                <Text style={{ color: T.accent, fontSize: 11, fontWeight: "600" }}>{unreadCount} new</Text>
              </View>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            activeOpacity={0.75}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: T.surface,
              borderWidth: 0.5,
              borderColor: T.border,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 11,
            }}
          >
            <Ionicons name="checkmark-done-outline" size={14} color={T.textSecondary} />
            <Text style={{ color: T.textSecondary, fontSize: 12, fontWeight: "500" }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={{ borderBottomWidth: 0.5, borderBottomColor: T.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 7 }}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            const count = filterCounts[f.id] || 0;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderRadius: 10,
                  backgroundColor: active ? T.accent : T.surface,
                  borderWidth: 0.5,
                  borderColor: active ? T.accent : T.border,
                }}
              >
                <Ionicons name={f.icon as any} size={13} color={active ? "#fff" : T.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#fff" : T.textPrimary }}>
                  {f.label}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      backgroundColor: active ? "rgba(255,255,255,0.25)" : T.border,
                      borderRadius: 8,
                      minWidth: 16,
                      height: 16,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: "700", color: active ? "#fff" : T.textSecondary }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.accent}
              colors={[T.accent]}
            />
          }
        >
          {filteredNotifications.length === 0 ? (
            <EmptyState filtered={activeFilter !== "all"} />
          ) : (
            filteredNotifications.map((item, index) => (
              <NotificationCard
                key={item._id}
                item={item}
                themeColor={themeColor}
                formatTime={formatTime}
                onPress={() => handleNotificationPress(item)}
                onMarkRead={(e: any) => {
                  e.stopPropagation();
                  handleMarkRead(item);
                }}
                isLast={index === filteredNotifications.length - 1}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Notification card ────────────────────────────────────────────────────────
function NotificationCard({
  item,
  themeColor,
  formatTime,
  onPress,
  onMarkRead,
  isLast,
}: {
  item: Notification;
  themeColor: string;
  formatTime: (d: string) => string;
  onPress: () => void;
  onMarkRead: (e: any) => void;
  isLast: boolean;
}) {
  const config = TYPE_CONFIG[item.type] ?? DEFAULT_TYPE;
  const senderName = item.sender
    ? `${item.sender.username.firstname} ${item.sender.username.lastname}`
    : "System";
  const initials = item.sender
    ? `${item.sender.username.firstname[0]}${item.sender.username.lastname[0]}`.toUpperCase()
    : "SY";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        backgroundColor: item.read ? T.card : T.cardUnread,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: item.read ? T.border : T.accent + "35",
        flexDirection: "row",
        overflow: "hidden",
        marginBottom: isLast ? 0 : 10,
      }}
    >
      {/* Unread accent bar */}
      <View style={{ width: 3, backgroundColor: item.read ? "transparent" : T.accent }} />

      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", padding: 14 }}>
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: config.iconBg,
            borderWidth: 0.5,
            borderColor: config.iconColor + "30",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <Ionicons name={config.icon as any} size={18} color={config.iconColor} />
        </View>

        {/* Body */}
        <View style={{ flex: 1 }}>
          {/* Sender row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: T.accentBg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 7, fontWeight: "700", color: T.accent }}>{initials}</Text>
              </View>
              <Text style={{ color: T.textSecondary, fontSize: 11, fontWeight: "500" }}>{senderName}</Text>
            </View>
            <Text style={{ color: T.textMuted, fontSize: 10 }}>{formatTime(item.createdAt)}</Text>
          </View>

          {/* Title */}
          <Text
            style={{
              color: item.read ? T.textSecondary : T.textPrimary,
              fontSize: 14,
              fontWeight: "600",
              lineHeight: 20,
              marginBottom: 3,
            }}
          >
            {item.title}
          </Text>

          {/* Message */}
          <Text style={{ color: T.textMuted, fontSize: 12, lineHeight: 18 }} numberOfLines={3}>
            {item.message}
          </Text>

          {/* New pill */}
          {!item.read && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 9 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent, marginRight: 6 }} />
              <Text style={{ color: T.accent, fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 }}>
                New
              </Text>
            </View>
          )}
        </View>

        {/* Mark read button */}
        {!item.read && (
          <TouchableOpacity
            onPress={onMarkRead}
            activeOpacity={0.7}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: T.surface,
              borderWidth: 0.5,
              borderColor: T.border,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            <Ionicons name="checkmark" size={14} color={T.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <View
      style={{
        backgroundColor: T.card,
        borderWidth: 0.5,
        borderColor: T.border,
        borderRadius: 20,
        paddingVertical: 48,
        paddingHorizontal: 32,
        alignItems: "center",
        marginTop: 24,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: T.surface,
          borderWidth: 0.5,
          borderColor: T.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={filtered ? "filter-outline" : "notifications-outline"} size={28} color={T.textMuted} />
      </View>
      <Text style={{ color: T.textPrimary, fontSize: 15, fontWeight: "600", marginBottom: 6 }}>
        {filtered ? "Nothing here yet" : "All caught up"}
      </Text>
      <Text style={{ color: T.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
        {filtered
          ? "No notifications match this filter right now."
          : "New notifications will appear here when there's activity on your projects."}
      </Text>
    </View>
  );
}