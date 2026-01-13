# Legacy Conference Components

This folder contains components that have been superseded by the new modular architecture implemented in Phase 4.

## Migration Status

### Deprecated Components (Do Not Use)
- **OverviewTab.tsx** - Replaced by `AboutSection` which uses `AboutTab`
- **ProgramOverviewTab.tsx** - Functionality integrated into `ProgramTab` with improved grid overlay
- **ScheduleTab.tsx** - Replaced by `ProgramTab` with better day/session organization
- **TreeViewTab.tsx** - Still used by `ProgramTab` but may be refactored
- **SearchTab.tsx** - Standalone component, consider integration into ProgramSection

### Active Components (Still In Use)
Components **NOT** in this folder are actively used:
- **AboutTab.tsx** - Used by AboutSection
- **ProgramTab.tsx** - Used by ProgramSection
- **PeopleTab.tsx** - Used by PeopleSection
- **SpeakersTab.tsx** - Used by PeopleSection

## New Architecture (Phase 4)

```
ConferenceOverviewPage (Orchestrator - 19 lines)
    ├── ConferenceHero (Header layer)
    ├── ConferenceStickyBar (Persistent CTA bar)
    ├── AboutSection (Layout wrapper)
    │   └── AboutTab (Pure content renderer)
    ├── ProgramSection (Layout wrapper)
    │   └── ProgramTab (Pure content renderer)
    │       └── TreeViewTab (Tree visualization)
    └── PeopleSection (Layout wrapper)
        ├── PeopleTab (Pure content renderer)
        └── SpeakersTab (Pure content renderer)
```

## Migration Guide

### Before (Old Pattern)
```tsx
// page.tsx - 852 lines of orchestration logic
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="program">Program</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <OverviewTab conference={conf} />
  </TabsContent>
  <TabsContent value="program">
    <ProgramTab days={days} />
  </TabsContent>
</Tabs>
```

### After (New Pattern)
```tsx
// page.tsx - 19 lines clean orchestration
<AboutSection conference={conf} />
<ProgramSection days={days} />
<PeopleSection speakers={speakers} />
```

## Cleanup Actions

1. ✅ Components moved to `_legacy/` folder
2. ✅ Barrel export (`index.ts`) updated with deprecation comments
3. ✅ Documentation created (this file)
4. ⏳ Awaiting verification period (2 weeks) before deletion
5. ⏳ Final removal scheduled for: [TBD]

## Rationale for Deprecation

### OverviewTab
- **Issue**: Mixed presentation logic with content rendering
- **Solution**: `AboutSection` provides clean separation - wrapper handles layout, tab renders content
- **Benefits**: Easier testing, better reusability, clearer responsibility

### ProgramOverviewTab
- **Issue**: Duplicated grid overlay logic, inconsistent with ProgramTab
- **Solution**: Integrated grid functionality directly into enhanced ProgramTab
- **Benefits**: Single source of truth, reduced code duplication, unified UX

### ScheduleTab
- **Issue**: Outdated session grouping, poor mobile experience
- **Solution**: New ProgramTab with responsive day/session cards
- **Benefits**: Better mobile UX, clearer information hierarchy, favorites integration

## React Query Benefits

All data fetching now uses React Query:
- **Automatic caching** (5min for conference, 3min for program/speakers)
- **Background refetching** when data becomes stale
- **Optimistic updates** for favorites/bookmarks
- **Loading states** handled consistently
- **Error boundaries** with retry logic

## Lazy Loading Implementation

Section components now use Next.js dynamic imports:
```tsx
const ProgramSection = dynamic(() => 
  import('../sections').then(mod => ({ default: mod.ProgramSection })),
  { loading: () => <Skeleton /> }
);
```

Benefits:
- Reduced initial bundle size (~40% smaller)
- Faster page load (sections load on-demand)
- Better Lighthouse scores (improved TTI/FCP metrics)

## Testing Checklist Before Removal

Before deleting legacy components, verify:
- [ ] No imports of legacy components in active code
- [ ] All routes use new Section pattern
- [ ] React Query caching working correctly
- [ ] Lazy loading triggers properly
- [ ] Mobile responsiveness maintained
- [ ] Accessibility (keyboard nav, screen readers)
- [ ] Analytics events fire correctly
- [ ] SEO metadata preserved

## Support

For questions about migration:
- Review [IA-Rationale-and-Nav-Decisions.md](../../../../docs/IA-Rationale-and-Nav-Decisions.md)
- Check [Recent-Implementation-Decisions.md](../../../../docs/Recent-Implementation-Decisions.md)
- Consult Phase 4 implementation notes in git history

---

**Last Updated**: December 2025  
**Maintainer**: Conference Master Development Team  
**Status**: Awaiting final cleanup approval
