import { Platform } from "react-native";

type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export async function createUploadFormData(file: UploadFileInput): Promise<FormData> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const webFile =
      typeof File !== "undefined"
        ? new File([blob], file.name, { type: file.type || blob.type || "application/octet-stream" })
        : blob;
    formData.append("file", webFile, file.name);
    return formData;
  }

  formData.append("file", {
    uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
    name: file.name,
    type: file.type,
  } as any);

  return formData;
}
