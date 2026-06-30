import api from "./user.api";

export interface UploadResponse {
  success: boolean;
  url: string;
  name: string;
  fileType: string;
}

export const uploadFile = async (
  formData: FormData
): Promise<UploadResponse> => {
  const res = await api.post("/api/upload", formData);
  return res.data;
};
