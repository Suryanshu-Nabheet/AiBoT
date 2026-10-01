export interface DiagramGenerationProgressProps {
  isGenerating: boolean;
  label: string;
}

/** Shows state-driven diagram work without inventing a progress percentage. */
export function DiagramGenerationProgress({
  isGenerating,
  label,
}: DiagramGenerationProgressProps) {
  if (!isGenerating) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-48 w-full flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
    >
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="space-y-3" aria-hidden="true">
        <div className="h-2 w-2/3 rounded bg-muted" />
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-2 w-4/5 rounded bg-muted" />
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="diagram-generation-sweep h-full w-1/3 rounded-full bg-primary/70" />
      </div>
    </div>
  );
}

DiagramGenerationProgress.displayName = "DiagramGenerationProgress";

export default DiagramGenerationProgress;
