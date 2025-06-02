import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { List, Grid, Filter } from 'lucide-react';

interface ScheduleControlsProps {
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  filterBy: string;
  setFilterBy: (filter: string) => void;
  groupBy: string;
  setGroupBy: (group: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export default function ScheduleControls({
  viewMode,
  setViewMode,
  filterBy,
  setFilterBy,
  groupBy,
  setGroupBy,
  sortBy,
  setSortBy
}: ScheduleControlsProps) {
  return (
    <div className="flex gap-2">
      {/* View Mode Toggle */}
      <div className="flex border rounded-lg">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setFilterBy('all')}>
            All Presentations
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilterBy('favorites')}>
            My Favorites
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setFilterBy('keynote')}>
            Keynotes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilterBy('presentation')}>
            Presentations
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilterBy('workshop')}>
            Workshops
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilterBy('panel')}>
            Panels
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group By Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Group by {groupBy}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setGroupBy('day')}>
            Group by Day
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGroupBy('section')}>
            Group by Section
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGroupBy('type')}>
            Group by Type
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGroupBy('none')}>
            No Grouping
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Sort by {sortBy}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSortBy('time')}>
            Sort by Time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortBy('title')}>
            Sort by Title
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortBy('popularity')}>
            Sort by Popularity
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}