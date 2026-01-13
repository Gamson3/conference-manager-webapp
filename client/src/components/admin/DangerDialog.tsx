import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface Consequence {
  label: string;
  count: number;
  description?: string;
}

interface DangerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  onConfirm: () => void;
  consequences?: Consequence[];
  requireTyping?: string; // The exact text user must type to confirm
  loading?: boolean;
}

export function DangerDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Delete",
  onConfirm,
  consequences = [],
  requireTyping,
  loading = false,
}: DangerDialogProps) {
  const [typedValue, setTypedValue] = useState("");

  const isConfirmEnabled = requireTyping
    ? typedValue === requireTyping
    : true;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setTypedValue("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTypedValue("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border-red-200 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {consequences.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-3">
            <h4 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This action will also delete:
            </h4>
            <ul className="space-y-2">
              {consequences.map((consequence, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-semibold text-red-700 min-w-[40px]">
                    {consequence.count}
                  </span>
                  <div>
                    <span className="text-red-900">{consequence.label}</span>
                    {consequence.description && (
                      <p className="text-sm text-red-700 mt-1">
                        {consequence.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {requireTyping && (
          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              Type <span className="font-mono font-bold">{requireTyping}</span>{" "}
              to confirm:
            </Label>
            <Input
              id="confirm-input"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={requireTyping}
              className="font-mono"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
