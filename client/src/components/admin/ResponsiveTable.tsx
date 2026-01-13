import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface ResponsiveTableProps<T> {
  data: T[];
  renderTableRow: (item: T) => ReactNode;
  renderCard: (item: T) => ReactNode;
  viewMode: "table" | "card";
  onViewModeChange: (mode: "table" | "card") => void;
  tableHeaders: ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function ResponsiveTable<T>({
  data,
  renderTableRow,
  renderCard,
  viewMode,
  onViewModeChange,
  tableHeaders,
  emptyMessage = "No data found",
  loading = false,
}: ResponsiveTableProps<T>) {
  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("table")}
            className="h-8"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("card")}
            className="h-8"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              {tableHeaders}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={100} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={100} className="text-center py-8">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map(renderTableRow)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">Loading...</div>
          ) : data.length === 0 ? (
            <div className="col-span-full text-center py-8">{emptyMessage}</div>
          ) : (
            data.map(renderCard)
          )}
        </div>
      )}
    </div>
  );
}
