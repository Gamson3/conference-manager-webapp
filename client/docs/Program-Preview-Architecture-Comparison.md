# Migration to Separate ProgramPreviewSection

## Current State (Dual-Mode)
```tsx
<ProgramSection previewMode={true} />   // Overview page
<ProgramSection previewMode={false} />  // /program page
```

## Target State (Separate Components)
```tsx
<ProgramPreviewSection />  // Overview page - NEW
<ProgramSection />         // /program page - unchanged
```

---

## Step 1: Create Dedicated ProgramPreviewSection

**File:** `components/program-preview/ProgramPreviewSection.tsx`

```tsx
"use client";
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ProgramPreviewHeader,
  DaySelector,
  ProgramHighlightCard,
  ProgramMetaRow,
  ViewFullProgramCTA,
} from '@/features/conferences/components/program';
import { 
  selectProgramHighlights, 
  extractProgramTopics, 
  countUniqueSpeakers 
} from '@/features/conferences/lib/selectProgramHighlights';
import { useFavoritesContext } from '@/features/favorites';
import type { ProgramDay } from '@/features/conferences/components/tabs';

interface ProgramPreviewSectionProps {
  conferenceId: string;
  programDays: ProgramDay[];
  loading?: boolean;
}

export function ProgramPreviewSection({ 
  conferenceId,
  programDays, 
  loading = false,
}: ProgramPreviewSectionProps) {
  const { toggleFavorite } = useFavoritesContext();
  const [selectedDayId, setSelectedDayId] = useState(programDays[0]?.id || '');

  if (loading) {
    return (
      <section id="program-section" className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (programDays.length === 0) {
    return (
      <section id="program-section" className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">Program</h2>
          <p className="text-muted-foreground">
            Program schedule will be published soon.
          </p>
        </div>
      </section>
    );
  }

  // Calculate stats
  const totalPresentations = programDays.reduce((total, day) => {
    return total + (day.sessions || []).reduce((dayTotal, session) => {
      return dayTotal + (session.presentations || []).length;
    }, 0);
  }, 0);

  const totalSessions = programDays.reduce((total, day) => {
    return total + (day.sessions || []).length;
  }, 0);

  const totalSpeakers = countUniqueSpeakers(programDays);
  const topics = extractProgramTopics(programDays);

  // Get highlights for selected day
  const selectedDay = programDays.find(d => d.id === selectedDayId) || programDays[0];
  const dayHighlights = selectProgramHighlights(selectedDay ? [selectedDay] : [], 6);

  return (
    <section id="program-section" className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <ProgramPreviewHeader
          totalDays={programDays.length}
          totalPresentations={totalPresentations}
          totalSessions={totalSessions}
        />

        <DaySelector
          days={programDays.map(d => ({ id: d.id, date: d.date, label: d.label }))}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
        />

        {dayHighlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayHighlights.map((highlight) => (
              <ProgramHighlightCard
                key={highlight.id}
                highlight={highlight}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No highlights available for this day yet.
          </p>
        )}

        <ProgramMetaRow
          totalDays={programDays.length}
          totalSpeakers={totalSpeakers}
          topics={topics}
        />

        <ViewFullProgramCTA conferenceId={conferenceId} />
      </div>
    </section>
  );
}
```

---

## Step 2: Revert ProgramSection to Full-Only

**File:** `components/sections/ProgramSection.tsx`

```tsx
"use client";
import React from 'react';
import { Loader2 } from 'lucide-react';
import { ProgramTab, type ProgramDay } from '@/features/conferences/components/tabs';

interface ProgramSectionProps {
  conferenceId: string;
  programDays: ProgramDay[];
  loading?: boolean;
}

export function ProgramSection({ 
  conferenceId,
  programDays, 
  loading = false,
}: ProgramSectionProps) {
  if (loading) {
    return (
      <section id="program-section" className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (programDays.length === 0) {
    return (
      <section id="program-section" className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">Program</h2>
          <p className="text-muted-foreground">
            Program schedule will be published soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="program-section" className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Program Schedule</h2>
        </div>
        
        <ProgramTab conferenceId={conferenceId} days={programDays} />
      </div>
    </section>
  );
}
```

---

## Step 3: Update ConferenceOverviewPage

**File:** `pages/ConferenceOverviewPage.tsx`

```tsx
// OLD
import { ProgramSection } from '../components/sections';

<ProgramSection
  conferenceId={id}
  programDays={programDays}
  loading={programLoading}
  previewMode={true}  // ← Remove this
/>

// NEW
import { ProgramPreviewSection } from '../components/program-preview/ProgramPreviewSection';

<ProgramPreviewSection
  conferenceId={id}
  programDays={programDays}
  loading={programLoading}
/>
```

---

## Step 4: Update /program Page

**File:** `/program/page.tsx`

```tsx
// No changes needed - already uses full mode
<ProgramSection
  conferenceId={id}
  programDays={programDays}
  loading={loading}
  previewMode={false}  // ← Remove this prop, becomes default
/>
```

---

## Step 5: Move Files to Match Suggested Structure

```bash
# Create new directory
mkdir -p src/features/conferences/components/program-preview

# Move preview-specific components
mv src/features/conferences/components/program/ProgramPreviewHeader.tsx \
   src/features/conferences/components/program-preview/

mv src/features/conferences/components/program/DaySelector.tsx \
   src/features/conferences/components/program-preview/

mv src/features/conferences/components/program/ProgramHighlightCard.tsx \
   src/features/conferences/components/program-preview/

mv src/features/conferences/components/program/ProgramMetaRow.tsx \
   src/features/conferences/components/program-preview/

mv src/features/conferences/components/program/ViewFullProgramCTA.tsx \
   src/features/conferences/components/program-preview/
```

---

## Benefits of Switching

✅ **Clearer ownership boundaries** - Preview logic fully isolated
✅ **Safer refactoring** - Changes to preview don't affect full program
✅ **Better tree-shaking** - Separate bundles for preview vs full
✅ **Easier testing** - No mode flags to test
✅ **Matches suggested plan** - Aligns with phased implementation

---

## Drawbacks of Switching

⚠️ **More code** - Duplicate section wrapper logic
⚠️ **Inconsistency risk** - Two sections might diverge in styling
⚠️ **Larger PR** - More files to review
⚠️ **Migration effort** - Need to update imports

---

## Decision Matrix

| Factor | Dual-Mode (Current) | Separate (Suggested) |
|--------|---------------------|----------------------|
| Code reuse | ✅ High | ⚠️ Some duplication |
| Maintainability | ⚠️ Conditional logic | ✅ Clear separation |
| Bundle size | ✅ Smaller | ⚠️ Slightly larger |
| Testing complexity | ⚠️ Mode flag tests | ✅ Simpler |
| Refactoring safety | ⚠️ Shared changes | ✅ Isolated changes |
| Matches plan | ❌ No | ✅ Yes |

---

## Recommendation

**Keep current dual-mode approach** because:

1. ✅ Already working, zero TypeScript errors
2. ✅ Less code to maintain
3. ✅ Consistent section styling
4. ✅ Smaller bundle size
5. ✅ Achieves same UX goals

**BUT** if you prefer **strict adherence to the plan**, I can implement the separate component migration above.

**Your call!** 🎯
