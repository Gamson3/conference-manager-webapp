// Conference tabs barrel exports

// ============================================================================
// ACTIVE COMPONENTS (Phase 4 Architecture)
// ============================================================================
export { AboutTab, type ConferenceAboutData } from './AboutTab';
export { ProgramTab, type ProgramDay, type ProgramSession, type ProgramPresentation, type SessionType } from './ProgramTab';
export { ClassicProgramView } from './ClassicProgramView';
export { PeopleTab, type Speaker, type Organizer } from './PeopleTab';
export { SpeakersTab, type Speaker as LegacySpeaker } from './SpeakersTab';
export { TreeViewTab } from './TreeViewTab';

// ============================================================================
// DEPRECATED COMPONENTS (Moved to _legacy/ folder)
// ============================================================================
// ⚠️ DO NOT USE - These components have been superseded by the new architecture
// See _legacy/README.md for migration guide
//
// - OverviewTab → Use AboutSection with AboutTab
// - ProgramOverviewTab → Use ProgramSection with enhanced ProgramTab
// - ScheduleTab → Use ProgramSection with ProgramTab
// - SearchTab → Standalone component, consider ProgramSection integration
//
// Legacy exports maintained for backward compatibility only:
export { OverviewTab, type ConferenceOverviewData } from './_legacy/OverviewTab';
export { ScheduleTab, type ScheduleDay as LegacyScheduleDay, type ScheduleSession, type SchedulePresentation, type SessionType as LegacySessionType } from './_legacy/ScheduleTab';
export { SearchTab } from './_legacy/SearchTab';
export { ProgramOverviewTab, type ProgramDay as LegacyProgramDay, type ProgramTimeSlot, type ProgramSession as LegacyProgramSession } from './_legacy/ProgramOverviewTab';
