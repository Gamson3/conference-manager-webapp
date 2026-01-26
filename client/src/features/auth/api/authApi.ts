import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import type { User, UserPreferences } from '@/types/auth';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * ADR-008 Phase 7: Force a token refresh from Cognito.
 * Call after any role upgrade to ensure the next API request
 * has updated cognito:groups claims.
 */
export async function forceTokenRefresh(): Promise<void> {
  await fetchAuthSession({ forceRefresh: true });
}

export const refreshToken = async (refreshToken: string) => {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken });
  return data;
};

export const forgotPassword = async (email: string) => {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  return data;
};

export const resetPassword = async (email: string, code: string, newPassword: string) => {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { email, code, newPassword });
  return data;
};

export const logout = async () => {
  const { data } = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  return data;
};

// TODO: Integrate AWS Cognito for login/register on the client (Amplify)
// Cognito login/register handled via Amplify in lib/auth/cognito.ts

// Profile upsert for post-login sync
export const upsertProfile = async (payload: { cognitoId: string; name?: string; email?: string }) => {
  // Server assigns default role; role changes handled via dedicated endpoints
  const { data } = await apiClient.post(`${API_ENDPOINTS.USERS.BASE}/upsert`, payload);
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>(API_ENDPOINTS.USERS.ME);
  return data;
};

export const upgradeOrganizer = async (): Promise<{ message: string; user: User; requiresTokenRefresh?: boolean }> => {
  const { data } = await apiClient.post<{ message: string; user: User; requiresTokenRefresh?: boolean }>(API_ENDPOINTS.USERS.UPGRADE_ORGANIZER, {});
  return data;
};

export type UpdateAccountProfilePayload = {
  name?: string;
  bio?: string;
  phoneNumber?: string;
  address?: string;
  organization?: string;
  jobTitle?: string;
  socialLinks?: Record<string, string>;
  interests?: string[];
  preferences?: UserPreferences;
};

export const updateAccountProfile = async (payload: UpdateAccountProfilePayload): Promise<User> => {
  const { data } = await apiClient.put<User>(API_ENDPOINTS.ACCOUNT.PROFILE, payload);
  return data;
};
