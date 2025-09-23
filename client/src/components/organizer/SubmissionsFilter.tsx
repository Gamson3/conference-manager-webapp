import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon, SlidersHorizontal, X } from "lucide-react";

interface SubmissionsFilterProps {
  activeTab: string;
  searchTerm: string;
  sortBy: string;
  setActiveTab: (tab: string) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: string) => void;
  clearFilters: () => void;
}

export function SubmissionsFilter({
  activeTab,
  searchTerm,
  sortBy,
  setActiveTab,
  setSearchTerm,
  setSortBy,
  clearFilters,
}: SubmissionsFilterProps) {
  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-3 md:grid-cols-5 gap-2 bg-muted rounded text-foreground">
              <TabsTrigger value="ALL" className="text-xs md:text-sm">
                All
              </TabsTrigger>
              <TabsTrigger
                value="PENDING"
                className={`text-xs md:text-sm ${activeTab !== "PENDING" ? "bg-primary-200" : ""}`}
              >
                Pending
              </TabsTrigger>
              <TabsTrigger value="APPROVED" className="text-xs md:text-sm">
                Approved
              </TabsTrigger>
              <TabsTrigger value="REJECTED" className="text-xs md:text-sm">
                Rejected
              </TabsTrigger>
              <TabsTrigger value="REVISION_REQUESTED" className="text-xs md:text-sm">
                Revision
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, abstract, or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-foreground border border-border bg-background"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="title_asc">Title (A-Z)</SelectItem>
            <SelectItem value="title_desc">Title (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={clearFilters}
          className="flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <X className="h-4 w-4" /> Clear Filters
        </Button>
      </div>
    </div>
  );
}