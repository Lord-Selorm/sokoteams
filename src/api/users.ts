import axiosInstance from './axiosInstance';
import type { User } from '@/types';

const URL = '/users';

export const getUsers = async (): Promise<User[]> => {
  const response = await axiosInstance.get<User[]>(URL);
  return response.data;
};
