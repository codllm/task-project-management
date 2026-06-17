import api from "./user.api";

export interface SearchUserResult {
  _id: string;
  username: {
    firstname: string;
    lastname: string;
  };
  email: string;
  profilePic?: string;
}

export interface GlobalSearchResults {
  users: SearchUserResult[];
  workspaces: any[];
  projects: any[];
  tasks: any[];
}

export const searchUsers = async (query: string): Promise<{ success: boolean; users: SearchUserResult[] }> => {
  const res = await api.get(`/api/search/users?q=${encodeURIComponent(query)}`);
  return res.data;
};

export const globalSearch = async (query: string): Promise<{ success: boolean; results: GlobalSearchResults }> => {
  const res = await api.get(`/api/search/global?q=${encodeURIComponent(query)}`);
  return res.data;
};
