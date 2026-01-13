// Utility to convert schedule data to program overview format
import type { LegacyScheduleDay as ScheduleDay } from '../components/tabs';
import type {
  LegacyProgramDay as ProgramDay,
  ProgramTimeSlot,
  LegacyProgramSession as ProgramSession,
} from '../components/tabs';

/**
 * Extract general schedule items (breaks, meals, registration) from sessions
 */
function extractGeneralSchedule(day: ScheduleDay) {
  const generalItems: ProgramDay['generalSchedule'] = [];
  
  day.sessions.forEach(session => {
    if (session.type === 'break' || session.type === 'networking') {
      generalItems.push({
        time: `${formatSimpleTime(session.startTime)}–${formatSimpleTime(session.endTime)}`,
        description: session.title,
        location: session.room,
        icon: 'coffee',
      });
    }
  });
  
  // Add registration if it's the first day (you can customize this logic)
  if (generalItems.length === 0) {
    generalItems.push({
      time: 'All Day',
      description: 'Conference sessions',
      icon: 'registration',
    });
  }
  
  return generalItems;
}

/**
 * Extract unique rooms from sessions (only from presentation/session types)
 */
function extractUniqueRooms(sessions: ScheduleDay['sessions']): string[] {
  const rooms = new Set<string>();
  
  sessions.forEach(session => {
    // Include all sessions with rooms, not just presentations
    if (session.room && session.type !== 'break' && session.type !== 'networking') {
      rooms.add(session.room);
    }
  });
  
  return Array.from(rooms).sort();
}

/**
 * Group sessions into time slots (parallel sessions)
 */
function groupIntoTimeSlots(sessions: ScheduleDay['sessions']): ProgramTimeSlot[] {
  const timeSlotMap = new Map<string, ScheduleDay['sessions']>();
  
  // Group by start time
  sessions.forEach(session => {
    const timeKey = session.startTime;
    if (!timeSlotMap.has(timeKey)) {
      timeSlotMap.set(timeKey, []);
    }
    timeSlotMap.get(timeKey)!.push(session);
  });
  
  // Convert to time slots
  const timeSlots: ProgramTimeSlot[] = Array.from(timeSlotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startTime, sessionsAtTime]) => {
      // Get end time from first session
      const endTime = sessionsAtTime[0]?.endTime || startTime;
      
      const programSessions: ProgramSession[] = sessionsAtTime.map(session => {
        // Determine session type - map all types appropriately
        let type: ProgramSession['type'] = 'session';
        
        if (session.type === 'break') {
          type = 'break';
        } else if (session.type === 'keynote') {
          type = 'opening'; // Keynotes shown as opening sessions
        } else if (session.type === 'networking') {
          type = 'social';
        } else if (session.type === 'workshop') {
          type = 'session';
        } else if (session.type === 'panel') {
          type = 'session';
        } else if (session.type === 'presentation') {
          type = 'session';
        }
        
        // Check if session has a description that indicates it's a meal
        const titleLower = session.title.toLowerCase();
        if (titleLower.includes('lunch') || titleLower.includes('dinner') || 
            titleLower.includes('breakfast') || titleLower.includes('meal')) {
          type = 'meal';
        }
        
        // Check if it's registration
        if (titleLower.includes('registration')) {
          type = 'registration';
        }
        
        return {
          id: session.id,
          title: session.title,
          room: session.room,
          type,
          pageNumber: undefined, // You can add this if available
        };
      });
      
      return {
        startTime: formatSimpleTime(startTime),
        endTime: formatSimpleTime(endTime),
        sessions: programSessions,
      };
    });
  
  return timeSlots;
}

/**
 * Format ISO time string to simple HH:MM format
 */
function formatSimpleTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Format date to label like "Day 1, Monday"
 */
function formatDayLabel(dateString: string, index: number): string {
  try {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `Day ${index + 1}, ${weekday}`;
  } catch {
    return `Day ${index + 1}`;
  }
}

/**
 * Main converter function
 */
export function mapToProgramOverview(scheduleDays: ScheduleDay[]): ProgramDay[] {
  return scheduleDays.map((day, index) => ({
    id: day.id,
    date: day.date,
    label: day.label || formatDayLabel(day.date, index),
    generalSchedule: extractGeneralSchedule(day),
    rooms: extractUniqueRooms(day.sessions),
    timeSlots: groupIntoTimeSlots(day.sessions),
  }));
}
