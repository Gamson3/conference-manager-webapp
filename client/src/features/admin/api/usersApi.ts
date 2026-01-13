import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import type { User } from '@/types/auth';

export type Role = 'user' | 'organizer' | 'admin';

export const getAllUsers = async (): Promise<User[]> => {
  const { data } = await apiClient.get<User[]>(`${API_ENDPOINTS.USERS.BASE}`);
  return data;
};

export const changeUserRole = async (userId: number, role: Role): Promise<User> => {
  const { data } = await apiClient.post<User>(`${API_ENDPOINTS.USERS.BASE}/role`, { userId, role });
  return data;
};
