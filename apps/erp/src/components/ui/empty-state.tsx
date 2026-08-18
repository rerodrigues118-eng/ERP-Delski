import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
    variant?: "default" | "outline" | "secondary" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-muted/15 my-2 transition-colors",
        className
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground mb-4 shadow-subtle">
          <Icon className="h-6 w-6" />
        </div>
      )}

      <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>

      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {primaryAction &&
            (primaryAction.to ? (
              <Button asChild size="sm" variant={primaryAction.variant || "default"} className="gap-1.5 text-xs font-semibold cursor-pointer">
                <Link to={primaryAction.to}>
                  {primaryAction.icon && <primaryAction.icon className="h-3.5 w-3.5" />}
                  {primaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant={primaryAction.variant || "default"}
                onClick={primaryAction.onClick}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {primaryAction.icon && <primaryAction.icon className="h-3.5 w-3.5" />}
                {primaryAction.label}
              </Button>
            ))}

          {secondaryAction &&
            (secondaryAction.to ? (
              <Button asChild size="sm" variant="outline" className="text-xs cursor-pointer border-border">
                <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={secondaryAction.onClick}
                className="text-xs cursor-pointer border-border"
              >
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
