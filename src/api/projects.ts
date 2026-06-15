import axiosInstance from './axiosInstance';
import type { Project } from '@/types';

const URL = '/projects';

export const getProjects = async (archived = false): Promise<Project[]> => {
  const response = await axiosInstance.get<Project[]>(URL, { params: archived ? { archived: '1' } : {} });
  return response.data;
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
  const now = new Date().toISOString();
  const payload = { ...project, createdAt: now, updatedAt: now };
  const response = await axiosInstance.post<Project>(URL, payload);
  return response.data;
};

export const updateProject = async (id: string, project: Partial<Project>): Promise<Project> => {
  const payload = { ...project, updatedAt: new Date().toISOString() };
  const response = await axiosInstance.patch<Project>(`${URL}/${id}`, payload);
  return response.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await axiosInstance.delete(`${URL}/${id}`);
};

export const archiveProject = async (id: string): Promise<Project> => {
  const response = await axiosInstance.patch<Project>(`${URL}/${id}/archive`);
  return response.data;
};
