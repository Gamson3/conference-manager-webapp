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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface Impact {
  label: string;
  description: string;
}

interface WarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  onConfirm: () => void;
  impacts?: Impact[];
  requireCheckbox?: boolean;
  checkboxLabel?: string;
  loading?: boolean;
}

export function WarningDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  onConfirm,
  impacts = [],
  requireCheckbox = false,
  checkboxLabel = "I understand the consequences",
  loading = false,
}: WarningDialogProps) {
  const [checked, setChecked] = useState(false);

  const isConfirmEnabled = requireCheckbox ? checked : true;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setChecked(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setChecked(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border-yellow-200 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {impacts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 space-y-3">
            <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Impact of this action:
            </h4>
            <ul className="space-y-2">
              {impacts.map((impact, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-yellow-700 mt-1">•</span>
                  <div>
                    <span className="font-medium text-yellow-900">
                      {impact.label}
                    </span>
                    <p className="text-sm text-yellow-700 mt-1">
                      {impact.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {requireCheckbox && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm-checkbox"
              checked={checked}
              onCheckedChange={(checked) => setChecked(checked === true)}
            />
            <Label
              htmlFor="confirm-checkbox"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {checkboxLabel}
            </Label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || loading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {loading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
