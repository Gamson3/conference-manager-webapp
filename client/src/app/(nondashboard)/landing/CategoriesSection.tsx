"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/state/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryCard from "@/components/CategoryCard";
import {
  Beaker,
  Cpu,
  GraduationCap,
  Globe,
  Users,
  BarChart3,
  Sparkles,
  Folder,
  type LucideIcon,
} from "lucide-react";

type Category = {
  id: number;
  name: string;
  description?: string | null;
  // Any of these might be present depending on your API shape
  eventsCount?: number | null;
  conferenceCount?: number | null;
  _count?: { conferences?: number };
};

const iconMap: Record<string, LucideIcon> = {
  Science: Beaker,
  Technology: Cpu,
  Education: GraduationCap,
  Global: Globe,
  Community: Users,
  Business: BarChart3,
  Innovation: Sparkles,
};

function pickIcon(name: string): LucideIcon {
  // Try exact match first, then by keywords
  const exact = iconMap[name];
  if (exact) return exact;

  const lower = name.toLowerCase();
  if (lower.includes("sci")) return Beaker;
  if (lower.includes("tech") || lower.includes("eng") || lower.includes("dev")) return Cpu;
  if (lower.includes("edu")) return GraduationCap;
  if (lower.includes("global") || lower.includes("world") || lower.includes("intl")) return Globe;
  if (lower.includes("commu") || lower.includes("social")) return Users;
  if (lower.includes("biz") || lower.includes("market") || lower.includes("finance")) return BarChart3;
  if (lower.includes("innov") || lower.includes("future")) return Sparkles;
  return Folder;
}

function getCount(cat: Category): number | undefined {
  return (
    cat.eventsCount ??
    cat.conferenceCount ??
    cat._count?.conferences ??
    undefined
  );
}

export default function CategoriesSection() {
  const router = useRouter();
  const { data, isLoading } = api.useConferenceCategoriesQuery();

  const [expanded, setExpanded] = useState(false);

  const categories: Category[] = useMemo(() => data ?? [], [data]);
  const visible = expanded ? categories : categories.slice(0, 6);

  const onCategoryClick = (name: string) => {
    router.push(`/discover?category=${encodeURIComponent(name)}`);
  };

  return (
    <section className="bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Browse By Category</h2>
          <p className="text-muted-foreground mt-2">
            Explore conferences organized by category.
          </p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 rounded-xl border">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-2/3 mt-4" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {visible.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  icon={pickIcon(cat.name)}
                  name={cat.name}
                  count={getCount(cat)}
                  onClick={() => onCategoryClick(cat.name)}
                />
              ))}

              {/* View All card */}
              {categories.length > 6 && !expanded && (
                <CategoryCard
                  icon={Sparkles}
                  name="View all"
                  count={categories.length}
                  onClick={() => setExpanded(true)}
                  asButton
                  className="border-dashed"
                />
              )}
            </div>

            {/* When expanded, show the rest inline on the same component */}
            {expanded && categories.length > 6 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {categories.slice(6).map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    icon={pickIcon(cat.name)}
                    name={cat.name}
                    count={getCount(cat)}
                    onClick={() => onCategoryClick(cat.name)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}