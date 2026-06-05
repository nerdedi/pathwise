import { cn } from "@/lib/utils";
import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "sensory-low" | "sensory-medium" | "sensory-high" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-sage-100 text-sage-700": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "bg-sage-100 text-sage-800 border border-sage-300": variant === "sensory-low",
          "bg-warm-100 text-warm-800 border border-warm-300": variant === "sensory-medium",
          "bg-red-100 text-red-800 border border-red-300": variant === "sensory-high",
          "border border-sage-200 text-sage-700 bg-transparent": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
