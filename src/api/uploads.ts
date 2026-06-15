import axiosInstance from './axiosInstance';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export const uploadFiles = async (files: FileList): Promise<UploadedFile[]> => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));
  const response = await axiosInstance.post<UploadedFile[]>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
