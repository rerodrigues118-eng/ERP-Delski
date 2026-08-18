import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 4, cols = 5, className = "" }: TableSkeletonProps) {
  return (
    <div className={`w-full divide-y divide-border ${className}`}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center justify-between gap-4 p-4 animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={`flex items-center gap-2.5 ${
                cIdx === 0 ? "flex-1 min-w-[140px]" : "w-28 flex-shrink-0"
              }`}
            >
              {cIdx === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 bg-muted" />}
              <div className="space-y-1.5 flex-1">
                <Skeleton
                  className={`h-3.5 bg-muted rounded ${
                    cIdx === 0 ? "w-3/4" : cIdx % 2 === 0 ? "w-16" : "w-20"
                  }`}
                />
                {cIdx === 0 && <Skeleton className="h-2.5 w-1/2 bg-muted/60 rounded" />}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
