interface ErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
  variant?: "error" | "success" | "warning" | "info";
}

export function ErrorBanner({
  error,
  onDismiss,
  variant = "error",
}: ErrorBannerProps) {
  if (!error) return null;

  const variantStyles = {
    error: "bg-destructive/10 border-destructive/20 text-destructive",
    success:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
    warning:
      "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <div className={`rounded-md border px-4 py-3 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium">{error}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
