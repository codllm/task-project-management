import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { getProfileApi } from "../api/user.api";
import { getUserWorkspace, Workspace } from "../api/workspace.api";
import { getWorkspaceProjects, Project } from "../api/project.api";
import { getNotifications } from "../api/notification.api";

interface AppContextType {
  user: any | null;
  setUser: (user: any | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  loading: boolean;
  themeColor: string;
  setThemeColor: (color: string) => Promise<void>;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => Promise<void>;
  C: any;
  
  // Handlers
  refreshData: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  refreshProjects: (workspaceId?: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  selectWorkspace: (workspace: Workspace | null) => Promise<void>;
  selectProject: (project: Project | null) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<any | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [themeColor, setThemeColorState] = useState<string>("#C2F193");
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(true);

  // Themes
  const darkTheme = {
    bg: "#15171C",
    card: "#1C1F26",
    cardBorder: "#2A2E38",
    border: "#2A2E38",
    cardUnread: "#1F232D",
    divider: "#232730",
    input: "#20242C",
    inputBorder: "#2E333D",
    textPrimary: "#FFFFFF",
    textSecondary: "#9DA3AE",
    textMuted: "#6B7280",
    textLabel: "#7A86A0",
    accent: "#6FC3D6",
    onAccent: "#0D2A30",
    danger: "#E2847A",
    dangerBg: "rgba(216,99,74,0.12)",
    dangerBorder: "rgba(216,99,74,0.25)",
    tagBg: "#232730",
    tagText: "#C8CDD6",
  };

  const lightTheme = {
    bg: "#F8F9FA",
    card: "#FFFFFF",
    cardBorder: "#E9ECEF",
    border: "#E9ECEF",
    cardUnread: "#EDF2FF",
    divider: "#DEE2E6",
    input: "#F1F3F5",
    inputBorder: "#CED4DA",
    textPrimary: "#1A1D20",
    textSecondary: "#495057",
    textMuted: "#868E96",
    textLabel: "#7A86A0",
    accent: "#6FC3D6",
    onAccent: "#0D2A30",
    danger: "#FA5252",
    dangerBg: "rgba(250,82,82,0.1)",
    dangerBorder: "rgba(250,82,82,0.2)",
    tagBg: "#E9ECEF",
    tagText: "#495057",
  };

  const C = isDarkMode ? darkTheme : lightTheme;

  // Custom setters that persist to SecureStore if needed
  const setUser = async (u: any | null) => {
    setUserState(u);
    if (u) {
      await SecureStore.setItemAsync("User", JSON.stringify(u));
    } else {
      await SecureStore.deleteItemAsync("User");
    }
  };

  const setToken = async (t: string | null) => {
    setTokenState(t);
    if (t) {
      await SecureStore.setItemAsync("token", t);
    } else {
      await SecureStore.deleteItemAsync("token");
    }
  };

  const setThemeColor = async (color: string) => {
    setThemeColorState(color);
    await SecureStore.setItemAsync("themeColor", color);
  };

  const setIsDarkMode = async (val: boolean) => {
    setIsDarkModeState(val);
    await SecureStore.setItemAsync("isDarkMode", val ? "true" : "false");
  };

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        const storedUser = await SecureStore.getItemAsync("User");
        const storedTheme = await SecureStore.getItemAsync("themeColor");
        const storedDarkMode = await SecureStore.getItemAsync("isDarkMode");
        
        if (storedDarkMode) {
          setIsDarkModeState(storedDarkMode === "true");
        }
        
        if (storedTheme) {
          setThemeColorState(storedTheme);
        }
        
        if (storedToken) {
          setTokenState(storedToken);
          if (storedUser) {
            setUserState(JSON.parse(storedUser));
          } else {
            // Fetch profile if user data is missing but token exists
            const profileRes = await getProfileApi();
            if (profileRes.success) {
              await setUser(profileRes.user);
            }
          }
        }
      } catch (err) {
        console.error("AppContext: error during bootstrap:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch workspaces & notifications once logged in
  useEffect(() => {
    if (user && token) {
      refreshData();
    } else {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setProjects([]);
      setActiveProject(null);
      setUnreadCount(0);
    }
  }, [user, token]);

  const refreshData = async () => {
    if (!user) return;
    await Promise.all([
      refreshWorkspaces(),
      refreshNotifications()
    ]);
  };

  const refreshWorkspaces = async () => {
    if (!user) return;
    try {
      const res = await getUserWorkspace(user._id);
      if (res.success) {
        setWorkspaces(res.workspaces);
        
        // Auto-select active workspace if not set or doesn't exist in new list
        if (res.workspaces.length > 0) {
          const currentActiveExists = activeWorkspace && res.workspaces.some((w: Workspace) => w._id === activeWorkspace._id);
          if (!currentActiveExists) {
            await selectWorkspace(res.workspaces[0]);
          } else {
            // Update current active workspace details
            const updatedActive = res.workspaces.find((w: Workspace) => w._id === activeWorkspace?._id);
            if (updatedActive) setActiveWorkspaceState(updatedActive);
          }
        } else {
          setActiveWorkspaceState(null);
          setProjects([]);
          setActiveProject(null);
        }
      }
    } catch (err: any) {
      console.error("AppContext: error fetching workspaces:", err);
      if (err?.response?.status === 401) {
        await logout();
      }
    }
  };

  const refreshProjects = async (workspaceId?: string) => {
    const wId = workspaceId || activeWorkspace?._id;
    if (!wId) {
      setProjects([]);
      setActiveProject(null);
      return;
    }
    try {
      const res = await getWorkspaceProjects(wId);
      if (res.success) {
        setProjects(res.projects);
        
        // Sync active project
        if (res.projects.length > 0) {
          const currentProjectExists = activeProject && res.projects.some(p => p._id === activeProject._id);
          if (currentProjectExists) {
            const updatedActive = res.projects.find(p => p._id === activeProject?._id);
            if (updatedActive) {
              setActiveProject(updatedActive);
              if (updatedActive.color) setThemeColorState(updatedActive.color);
            }
          } else {
            setActiveProject(res.projects[0]);
            if (res.projects[0].color) setThemeColorState(res.projects[0].color);
          }
        } else {
          setActiveProject(null);
        }
      }
    } catch (err: any) {
      console.error("AppContext: error fetching projects:", err);
      if (err?.response?.status === 401) {
        await logout();
      }
    }
  };

  const refreshNotifications = async () => {
    try {
      const res = await getNotifications();
      if (res.success) {
        const unread = res.notifications.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err: any) {
      console.error("AppContext: error fetching notifications:", err);
      if (err?.response?.status === 401) {
        await logout();
      }
    }
  };

  const selectWorkspace = async (workspace: Workspace | null) => {
    setActiveWorkspaceState(workspace);
    setActiveProject(null);
    const storedTheme = await SecureStore.getItemAsync("themeColor");
    setThemeColorState(storedTheme || "#C2F193");
    if (workspace) {
      await refreshProjects(workspace._id);
    } else {
      setProjects([]);
    }
  };

  const selectProject = (project: Project | null) => {
    setActiveProject(project);
    if (project && project.color) {
      setThemeColorState(project.color);
    } else {
      SecureStore.getItemAsync("themeColor").then((storedTheme) => {
        setThemeColorState(storedTheme || "#C2F193");
      });
    }
  };

  const logout = async () => {
    try {
      // Clear storage
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("User");
    } catch (err) {
      console.error("AppContext: logout storage cleanup error:", err);
    } finally {
      setUserState(null);
      setTokenState(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setProjects([]);
      setActiveProject(null);
      setUnreadCount(0);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        workspaces,
        setWorkspaces,
        activeWorkspace,
        setActiveWorkspace: setActiveWorkspaceState,
        projects,
        setProjects,
        activeProject,
        setActiveProject,
        unreadCount,
        setUnreadCount,
        loading,
        themeColor,
        setThemeColor,
        isDarkMode,
        setIsDarkMode,
        C,
        refreshData,
        refreshWorkspaces,
        refreshProjects,
        refreshNotifications,
        selectWorkspace,
        selectProject,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
