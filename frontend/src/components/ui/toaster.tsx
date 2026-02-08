import { useToast } from "./use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
      <div className="pointer-events-auto flex flex-col gap-3 w-full max-w-[420px]">
        {toasts.map((toast) => {
          const variantClasses = {
            default: "bg-white dark:bg-[hsl(var(--card))] border-[hsl(var(--border))]",
            success: "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]",
            error: "bg-[hsl(var(--error))]/10 border-[hsl(var(--error))]",
            warning: "bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]",
          }

          const textClasses = {
            default: "text-[hsl(var(--foreground))]",
            success: "text-[hsl(var(--success))]",
            error: "text-[hsl(var(--error))]",
            warning: "text-[hsl(var(--warning))]",
          }

          return (
            <div
              key={toast.id}
              className={`relative flex w-full items-start gap-3 overflow-hidden rounded-md border-2 p-4 pr-8 shadow-lg transition-all animate-in slide-in-from-top-full ${
                variantClasses[toast.variant || "default"]
              }`}
            >
              <div className="flex-1 space-y-1">
                {toast.title && (
                  <div className={`text-sm font-semibold ${textClasses[toast.variant || "default"]}`}>
                    {toast.title}
                  </div>
                )}
                {toast.description && (
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="absolute right-2 top-2 rounded-md p-1 hover:bg-black/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
