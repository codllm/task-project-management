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

export default api;