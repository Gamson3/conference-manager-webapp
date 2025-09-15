"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/state/api";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateNoResults } from "@/components/shared/EmptyStates";
import ConferenceCard from "@/components/ConferenceCard";

export default function PublicDiscoverPage() {
  const router = useRouter();

  // Basic filters (we will enhance later)
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("startDate-asc");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [sortField, sortDirection] = sortOrder.split("-");

  const { data: categoriesData } = api.useConferenceCategoriesQuery();
  const { data: conferencesData, isLoading, refetch } = api.useConferencesQuery({
    search: searchTerm || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    page: currentPage,
    limit: 9,
    sort: sortField,
    order: sortDirection as "asc" | "desc",
  });

  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-[320px] p-4 flex flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  );

  const renderConferenceGrid = () => {
    if (isLoading) return renderSkeletons();
    if (!conferencesData || conferencesData.conferences.length === 0) {
      return <EmptyStateNoResults message="No conferences found" />;
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {conferencesData.conferences.map((conf: any) => (
            <div
              key={conf.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/discover/conferences/${conf.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/discover/conferences/${conf.id}`)}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
              <ConferenceCard
                conference={conf}
                // No actions on public list
                showActions={false}
                variant="list"
              />
            </div>
          ))}
        </div>

        {conferencesData.pagination.totalPages > 1 && (
          <div className="flex justify-center mt-10 gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            {Array.from(
              { length: conferencesData.pagination.totalPages },
              (_, i) => i + 1
            ).map((p) => (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              disabled={currentPage === conferencesData.pagination.totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Discover Conferences
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Explore upcoming conferences. Sign in to register, favorite, or submit a proposal when calls are open.
            </p>
        </header>

        <section className="flex flex-col md:flex-row gap-4 md:items-end">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conferences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex gap-2 w-full md:w-auto">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full md:w-[170px] bg-white/70 backdrop-blur">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startDate-asc">Upcoming First</SelectItem>
                <SelectItem value="startDate-desc">Recent First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[170px] bg-white/70 backdrop-blur">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.map((cat: any) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section aria-label="Conference results">
          {renderConferenceGrid()}
        </section>
      </div>
    </div>
  );
}