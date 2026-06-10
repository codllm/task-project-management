import axios from "axios";
import * as SecureStore from "expo-secure-store";

// ─── Base URL ────────────────────────────────────────────────────────────────
const BASE_URL = "http://192.168.1.3:5137"; // ← your local machine IP

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

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RegisterPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  age: number;
  gender: string;
  usertype: "individual" | "team" | "admin";
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
  return res.data; // { success, token, user }
};

export const registerApi = async (payload: RegisterPayload) => {
  const res = await api.post("/api/users/new/register", {
    username: {
      firstname: payload.firstname,
      lastname: payload.lastname,
    },
    email: payload.email,
    password: payload.password,
    age: payload.age,
    gender: payload.gender,
    usertype: payload.usertype,
  });
  return res.data; // { success, token, user }
};

export const getProfileApi = async () => {
  const res = await api.get("/api/users/profile");
  return res.data; // { success, user }
};

export const logoutApi = async () => {
  const res = await api.post("/api/users/logout");
  await SecureStore.deleteItemAsync("token");
  return res.data;
};

export default api;