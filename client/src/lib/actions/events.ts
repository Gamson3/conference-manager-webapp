import axios from "axios";
import { Conference } from "@/types/prismaTypes";
import { fetchAuthSession } from "aws-amplify/auth";
import { createAuthenticatedApi } from "../utils";

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

export async function deleteEvent(id: number) {
  try {
    const api = await createAuthenticatedApi();
    await api.delete(`/events/${id}`);
    return { success: true };

  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error.message || "failed to delete event",
    };
  }
}

// Add or update this function
export const saveEventDraft = async (eventData: any) => {
  try {
    const api = await createAuthenticatedApi();
    
    // Format dates if needed
    const formattedData = {
      ...eventData,
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: new Date(eventData.endDate).toISOString(),
      status: 'draft',
      // Make sure topics is an array
      topics: Array.isArray(eventData.topics) ? eventData.topics : 
        (typeof eventData.topics === 'string' ? 
          eventData.topics.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
    };
    
    const response = await api.post('/events/drafts', formattedData);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Save draft error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to save draft'
    };
  }
};