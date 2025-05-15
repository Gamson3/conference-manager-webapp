import axios from "axios";
import { Conference } from "@/types/prismaTypes";
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

async function getIdToken() {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString();
}

export async function createEvent(eventData: Partial<Conference> & { createdById: number }) {
  try {
    const token = await getIdToken();
    const response = await axios.post(`${API_BASE}/events`, eventData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error.message || "Unknown error",
    };
  }
}

export async function updateEvent(eventId: number, eventData: Partial<Conference>) {
  try {
    const token = await getIdToken();
    const response = await axios.put(`${API_BASE}/events/${eventId}`, eventData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error.message || "Unknown error",
    };
  }
}

export async function deleteEvent(eventId: number) {
  try {
    const token = await getIdToken();
    await axios.delete(`${API_BASE}/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error.message || "Unknown error",
    };
  }
}