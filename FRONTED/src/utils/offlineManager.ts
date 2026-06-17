import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTask, updateTask, deleteTask, logTime, deleteTimeLog, bulkUpdateTasks } from "../api/task.api";

// Base API URL detection
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.7:5137";

export interface OfflineAction {
  id: string;
  type: "create_task" | "update_task" | "delete_task" | "log_time" | "delete_time_log" | "bulk_update";
  taskId?: string;
  payload: any;
  createdAt: number;
}

// Global state for online status
let isOnlineGlobal = true;
const listeners = new Set<(status: boolean) => void>();

export const getOnlineStatus = () => isOnlineGlobal;

export const subscribeToOnlineStatus = (callback: (status: boolean) => void) => {
  listeners.add(callback);
  callback(isOnlineGlobal);
  return () => {
    listeners.delete(callback);
  };
};

const setOnlineStatus = (status: boolean) => {
  if (isOnlineGlobal !== status) {
    isOnlineGlobal = status;
    listeners.forEach((cb) => cb(status));
  }
};

// Periodic connectivity checker
export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      method: "GET", // Use GET to confirm endpoint exists; 401/403/200 all prove we are online
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    // Any response from the host server means we can reach it
    const online = res.status >= 200 && res.status < 500;
    setOnlineStatus(online);
    return online;
  } catch (err) {
    setOnlineStatus(false);
    return false;
  }
};

// Start periodic pings
let pingInterval: any = null;
export const startConnectivityMonitoring = () => {
  if (pingInterval) return;
  checkConnectivity();
  pingInterval = setInterval(() => {
    checkConnectivity();
  }, 10000); // Check every 10 seconds
};

export const stopConnectivityMonitoring = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
};

// Cache functions
export const cacheData = async (key: string, data: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(data));
  } catch (err) {
    console.error("OfflineManager: Failed to cache data", err);
  }
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await AsyncStorage.getItem(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("OfflineManager: Failed to get cached data", err);
    return null;
  }
};

// Offline action queue functions
const QUEUE_KEY = "offline_sync_queue";

export const getOfflineQueue = async (): Promise<OfflineAction[]> => {
  try {
    const queueData = await AsyncStorage.getItem(QUEUE_KEY);
    return queueData ? JSON.parse(queueData) : [];
  } catch (err) {
    console.error("OfflineManager: Failed to load queue", err);
    return [];
  }
};

export const saveOfflineQueue = async (queue: OfflineAction[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("OfflineManager: Failed to save queue", err);
  }
};

export const queueOfflineAction = async (
  type: OfflineAction["type"],
  payload: any,
  taskId?: string
): Promise<OfflineAction> => {
  const newAction: OfflineAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    taskId,
    createdAt: Date.now(),
  };

  const queue = await getOfflineQueue();
  queue.push(newAction);
  await saveOfflineQueue(queue);
  console.log("OfflineManager: Action queued successfully", newAction);
  return newAction;
};

// Sync queue with backend
export const syncOfflineQueue = async (
  onActionSynced?: (action: OfflineAction, success: boolean, resultOrError: any) => void
): Promise<number> => {
  const isOnline = await checkConnectivity();
  if (!isOnline) {
    console.log("OfflineManager: Sync skipped because device is offline");
    return 0;
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return 0;
  }

  console.log(`OfflineManager: Starting sync of ${queue.length} actions...`);
  const remaining: OfflineAction[] = [];
  let syncedCount = 0;

  for (const action of queue) {
    let success = false;
    let result: any = null;

    try {
      switch (action.type) {
        case "create_task":
          result = await createTask(action.payload);
          success = result.success;
          break;
        case "update_task":
          if (action.taskId) {
            result = await updateTask(action.taskId, action.payload);
            success = result.success;
          }
          break;
        case "delete_task":
          if (action.taskId) {
            result = await deleteTask(action.taskId);
            success = result.success;
          }
          break;
        case "log_time":
          if (action.taskId) {
            const { hours, description, date } = action.payload;
            result = await logTime(action.taskId, hours, description, date);
            success = result.success;
          }
          break;
        case "delete_time_log":
          if (action.taskId && action.payload.logId) {
            result = await deleteTimeLog(action.taskId, action.payload.logId);
            success = result.success;
          }
          break;
        case "bulk_update":
          result = await bulkUpdateTasks(action.payload.taskIds, action.payload.updates);
          success = result.success;
          break;
      }
    } catch (err: any) {
      console.error(`OfflineManager: Action failed to sync: ${action.type}`, err);
      result = err;
      success = false;
    }

    if (success) {
      syncedCount++;
      if (onActionSynced) onActionSynced(action, true, result);
    } else {
      // Keep action in queue if it failed (e.g. server down or bad connection).
      // If it failed because of a validation error (e.g. status 400), we discard it to prevent blocking the queue.
      if (result && result.response && result.response.status >= 400 && result.response.status < 500) {
        console.warn("OfflineManager: Discarding invalid action (4xx client error)", action);
        if (onActionSynced) onActionSynced(action, false, result.response.data || result);
      } else {
        remaining.push(action);
        if (onActionSynced) onActionSynced(action, false, result);
      }
    }
  }

  await saveOfflineQueue(remaining);
  console.log(`OfflineManager: Sync completed. Synced: ${syncedCount}, Remaining: ${remaining.length}`);
  return syncedCount;
};
