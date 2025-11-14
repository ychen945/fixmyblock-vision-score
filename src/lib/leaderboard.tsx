import { AlertTriangle, Shield } from "lucide-react";
import type { ReactNode } from "react";

export type NeedLevel = {
  label: string;
  badge: "default" | "secondary" | "destructive";
  tone: string;
  icon: ReactNode;
};

export const getNeedLevel = (score: number): NeedLevel => {
  if (score >= 70) {
    return {
      label: "Critical attention needed",
      badge: "destructive",
      tone: "border-red-200 bg-red-50",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    };
  }

  if (score >= 40) {
    return {
      label: "Rising concern",
      badge: "default",
      tone: "border-yellow-200 bg-yellow-50",
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    };
  }

  return {
    label: "Healthy momentum",
    badge: "secondary",
    tone: "border-green-200 bg-green-50",
    icon: <Shield className="h-5 w-5 text-green-500" />,
  };
};
