import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, type LucideIcon } from "lucide-react";

export interface AdminAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface AdminActionSection {
  label?: string;
  actions: AdminAction[];
}

interface AdminActionMenuProps {
  sections: AdminActionSection[];
}

export function AdminActionMenu({ sections }: AdminActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.label && (
              <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
            )}
            {section.actions.map((action, actionIdx) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={actionIdx}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={
                    action.variant === "danger"
                      ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                      : ""
                  }
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
            {sectionIdx < sections.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
