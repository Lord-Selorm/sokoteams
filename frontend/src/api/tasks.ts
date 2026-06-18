import axiosInstance from './axiosInstance';
import type { Task } from '@/types';

const URL = '/tasks';

export const getTasks = async (archived = false): Promise<Task[]> => {
  const response = await axiosInstance.get<Task[]>(URL, { params: archived ? { archived: '1' } : {} });
  return response.data;
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  const now = new Date().toISOString();
  const payload = { ...task, createdAt: now, updatedAt: now };
  const response = await axiosInstance.post<Task>(URL, payload);
  return response.data;
};

export const updateTask = async (id: string, task: Partial<Task>): Promise<Task> => {
  const payload = { ...task, updatedAt: new Date().toISOString() };
  const response = await axiosInstance.patch<Task>(`${URL}/${id}`, payload);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await axiosInstance.delete(`${URL}/${id}`);
};

export const archiveTask = async (id: string): Promise<Task> => {
  const response = await axiosInstance.patch<Task>(`${URL}/${id}/archive`);
  return response.data;
};
