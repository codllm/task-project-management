import { Tabs } from "expo-router";
import { useApp } from "../../context/AppContext";
import React from "react";
import { Feather } from "@expo/vector-icons";

export default function TabsLayout() {
  const { unreadCount, themeColor } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#0B0F19",
          borderTopColor: "#22283A",
          borderTopWidth: 1,
          height: 65,
        },
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, size }) => (
            <Feather name="folder" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            color: "white",
            fontSize: 9,
            height: 16,
            minWidth: 16,
            borderRadius: 8,
            lineHeight: 14,
            textAlign: "center",
          },
          tabBarIcon: ({ color, size }) => (
            <Feather name="bell" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="createWorkspace"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
