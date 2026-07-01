import { Platform } from "react-native";

type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
  file?: File;
  fieldName?: string;
};

export async function createUploadFormData(file: UploadFileInput): Promise<FormData> {
  const formData = new FormData();
  const fieldName = file.fieldName || "file";

  if (Platform.OS === "web") {
    if (file.file) {
      formData.append(fieldName, file.file, file.name);
      return formData;
    }

    const response = await fetch(file.uri);
    const blob = await response.blob();
    const webFile =
      typeof File !== "undefined"
        ? new File([blob], file.name, { type: file.type || blob.type || "application/octet-stream" })
        : blob;
    formData.append(fieldName, webFile, file.name);
    return formData;
  }

  formData.append(fieldName, {
    uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
    name: file.name,
    type: file.type,
  } as any);

  return formData;
}
