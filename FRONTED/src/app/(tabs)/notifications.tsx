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
import { useApp } from "../../context/AppContext";
import { useRouter } from "expo-router";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
} from "../../api/notification.api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0E1A",
  card: "#111628",
  cardUnread: "#131A2E",
  input: "#0E1422",
  border: "#1E2438",
  borderSubtle: "#1A2030",
  textPrimary: "#F0F2F8",
  textSecondary: "#D8DCE8",
  textMuted: "#5E6A85",
  textLabel: "#7A86A0",
};

// ─── Notification type config ─────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; iconColor: string; iconBg: string }> = {
  WORKSPACE_INVITE: {
    icon: "💼",
    iconColor: "#38BDF8",
    iconBg: "rgba(56,189,248,0.08)",
  },
  PROJECT_ADDED: {
    icon: "🚀",
    iconColor: "#A78BFA",
    iconBg: "rgba(167,139,250,0.08)",
  },
  TASK_ASSIGNED: {
    icon: "🎯",
    iconColor: "#34D399",
    iconBg: "rgba(52,211,153,0.08)",
  },
  TASK_UPDATED: {
    icon: "⚡",
    iconColor: "#FBBF24",
    iconBg: "rgba(251,191,36,0.08)",
  },
  COMMENT_ADDED: {
    icon: "💬",
    iconColor: "#F472B6",
    iconBg: "rgba(244,114,182,0.08)",
  },
};

const DEFAULT_TYPE = {
  icon: "📌",
  iconColor: "#7A86A0",
  iconBg: "rgba(122,134,160,0.08)",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { refreshNotifications: updateGlobalUnread, themeColor, projects, selectProject } = useApp();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: C.border,
        }}
      >
        <View>
          <Text style={{ color: C.textPrimary, fontSize: 26, fontWeight: "500" }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={{
              backgroundColor: C.input,
              borderWidth: 0.5,
              borderColor: C.border,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: C.textSecondary, fontSize: 12, fontWeight: "500" }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColor}
              colors={[themeColor]}
            />
          }
        >
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            notifications.map((item, index) => (
              <NotificationCard
                key={item._id}
                item={item}
                themeColor={themeColor}
                formatTime={formatTime}
                onPress={() => handleNotificationPress(item)}
                onMarkRead={(e) => {
                  e.stopPropagation();
                  handleMarkRead(item);
                }}
                isLast={index === notifications.length - 1}
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

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: item.read ? C.card : C.cardUnread,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: item.read ? C.border : `${themeColor}40`,
        borderLeftWidth: item.read ? 0.5 : 3,
        borderLeftColor: item.read ? C.border : themeColor,
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 14,
        marginBottom: isLast ? 0 : 10,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: config.iconBg,
          borderWidth: 0.5,
          borderColor: `${config.iconColor}20`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 18 }}>{config.icon}</Text>
      </View>

      {/* Body */}
      <View style={{ flex: 1 }}>
        {/* Sender + time */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: "500" }}>
            {senderName}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={{
            color: item.read ? C.textSecondary : C.textPrimary,
            fontSize: 14,
            fontWeight: "500",
            lineHeight: 20,
            marginBottom: 3,
          }}
        >
          {item.title}
        </Text>

        {/* Message */}
        <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>
          {item.message}
        </Text>

        {/* Unread pill */}
        {!item.read && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: themeColor,
                marginRight: 5,
              }}
            />
            <Text
              style={{
                color: themeColor,
                fontSize: 10,
                fontWeight: "500",
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              New
            </Text>
          </View>
        )}
      </View>

      {/* Mark read button */}
      {!item.read && (
        <TouchableOpacity
          onPress={onMarkRead}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: C.input,
            borderWidth: 0.5,
            borderColor: C.border,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
            alignSelf: "center",
            flexShrink: 0,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: C.textLabel, fontSize: 12 }}>✓</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderWidth: 0.5,
        borderColor: C.border,
        borderRadius: 20,
        padding: 40,
        alignItems: "center",
        marginTop: 24,
      }}
    >
      <Text style={{ fontSize: 36, marginBottom: 14 }}>🔔</Text>
      <Text
        style={{
          color: C.textPrimary,
          fontSize: 15,
          fontWeight: "500",
          marginBottom: 6,
        }}
      >
        All caught up
      </Text>
      <Text
        style={{
          color: C.textMuted,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        New notifications will appear here when there's activity on your projects.
      </Text>
    </View>
  );
}