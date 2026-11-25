import api from "./api";
// the API adapter
export interface SharedFileRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number | string;
  senderDeviceId: string;
  receiverDeviceId: string;
  createdAt: string;
  senderDevice?: { deviceName: string };
  receiverDevice?: { deviceName: string };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
// - `getSharedFiles()` fetches history.
// - `uploadSharedFile()` sends a file and reports upload progress.
// - `downloadSharedFile()` retrieves a file as a browser `Blob`.
export const getSharedFiles = async (): Promise<SharedFileRecord[]> => {
  const response = await api.get<ApiResponse<SharedFileRecord[]>>("/api/files");
  return response.data.data;
};

export const uploadSharedFile = async (
  file: File,
  receiverDeviceId: string,
  onProgress: (progress: number) => void
): Promise<SharedFileRecord> => {
    console.log("inside upload shared file : " ,file);
  const formData = new FormData();
  formData.append("file", file);
  console.log("file in uploadeSharedFile: ",file);
  formData.append("receiverDeviceId", receiverDeviceId);

//  Updates its progress as Axios reports bytes sent.
console.log("formdata in frontend : ",formData);
  const response = await api.post<ApiResponse<SharedFileRecord>>(
    "/api/files/upload",
    formData,
    {
      onUploadProgress: (event) => {
        if (event.total) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage); // #byte_sent
        }
      },
    }
  );

  return response.data.data;
};

export const downloadSharedFile = async (
  fileId: string
): Promise<Blob> => {
  const response = await api.get(`/api/files/${fileId}/download`, {
    responseType: "blob",
  });
  return response.data as Blob;
};