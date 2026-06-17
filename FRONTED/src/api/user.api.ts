import axios from "axios";
import * as SecureStore from "expo-secure-store";

// ─── Base URL ────────────────────────────────────────────────────────────────
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.7:5137";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach token from SecureStore to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface RegisterPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  gender: string;
  usertype: "individual" | "team" | "admin";
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  _id: string;
  username: { firstname: string; lastname: string };
  email: string;
  usertype: string;
  profilePic?: string;
  notificationPreferences?: {
    comments: boolean;
    assignments: boolean;
    mentions: boolean;
    reminders: boolean;
  };
  pinnedProjects?: string[];
  pinnedTasks?: string[];
}

// ─── API Functions ────────────────────────────────────────────────────────────
export const loginApi = async (payload: LoginPayload) => {
  const res = await api.post("/api/users/login", payload);
  return { success: true, ...res.data };
};

export const registerApi = async (payload: RegisterPayload) => {
  const res = await api.post("/api/users/new/register", {
    username: {
      firstname: payload.firstname,
      lastname: payload.lastname,
    },
    email: payload.email,
    password: payload.password,
    gender: payload.gender,
    usertype: payload.usertype,
    phone: payload.phone,
  });
  return { success: true, ...res.data };
};

export const getProfileApi = async () => {
  const res = await api.get("/api/users/profile");
  return { success: true, ...res.data };
};

export interface UpdateProfilePayload {
  firstname?: string;
  lastname?: string;
  age?: number;
  gender?: string;
  phone?: string;
}

export const updateProfileApi = async (payload: UpdateProfilePayload) => {
  const body: any = {};
  if (payload.firstname || payload.lastname) {
    body.username = {
      firstname: payload.firstname,
      lastname: payload.lastname,
    };
  }
  if (payload.age !== undefined) body.age = payload.age;
  if (payload.gender) body.gender = payload.gender;
  if (payload.phone) body.phone = payload.phone;

  const res = await api.post("/api/users/update", body);
  return { success: true, ...res.data };
};

export const logoutApi = async () => {
  const res = await api.post("/api/users/logout");
  await SecureStore.deleteItemAsync("token");
  return { success: true, ...res.data };
};

export interface PreferencesPayload {
  comments?: boolean;
  assignments?: boolean;
  mentions?: boolean;
  reminders?: boolean;
}

export const updatePreferencesApi = async (payload: PreferencesPayload) => {
  const res = await api.put("/api/users/preferences", payload);
  return { success: true, ...res.data };
};

// Pinned Items API
export const pinProjectApi = async (projectId: string): Promise<{ success: boolean; pinnedProjects: string[] }> => {
  const res = await api.post(`/api/users/pin-project/${projectId}`);
  return res.data;
};

export const pinTaskApi = async (taskId: string): Promise<{ success: boolean; pinnedTasks: string[] }> => {
  const res = await api.post(`/api/users/pin-task/${taskId}`);
  return res.data;
};

export const getPinnedItemsApi = async (): Promise<{ success: boolean; pinnedProjects: any[]; pinnedTasks: any[] }> => {
  const res = await api.get("/api/users/pinned");
  return res.data;
};

// Profile avatar and saved filters endpoints
export const uploadAvatarApi = async (formData: FormData): Promise<{ success: boolean; avatarUrl: string; user: any }> => {
  const res = await api.put("/api/users/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const saveFilterApi = async (payload: { name: string; project: string; query: any }): Promise<{ success: boolean; filter: any }> => {
  const res = await api.post("/api/users/saved-filters", payload);
  return res.data;
};

export const getSavedFiltersApi = async (projectId: string): Promise<{ success: boolean; filters: any[] }> => {
  const res = await api.get(`/api/users/saved-filters/${projectId}`);
  return {
    success: res.data?.success,
    filters: res.data?.savedFilters || [],
  };
};

export const deleteSavedFilterApi = async (filterId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/users/saved-filters/${filterId}`);
  return res.data;
};

export default api;