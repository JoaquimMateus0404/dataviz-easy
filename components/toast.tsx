import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, AlertCircle, CheckCircle, Info } from "lucide-react"

interface ToastProps {
  message: string
  type?: "error" | "success" | "info"
  onClose: () => void
  action?: {
    label: string
    onClick: () => void
  }
  autoClose?: boolean
  duration?: number
}

export function Toast({ 
  message, 
  type = "info", 
  onClose, 
  action,
  autoClose = true,
  duration = 5000 
}: ToastProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-4 h-4" />
      case "success":
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getVariant = () => {
    switch (type) {
      case "error":
        return "destructive" as const
      default:
        return "default" as const
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant={getVariant()} className="shadow-lg">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <AlertDescription className="text-sm">
              {message}
            </AlertDescription>
            {action && (
              <Button
                variant="link"
                size="sm"
                onClick={action.onClick}
                className="h-auto p-0 mt-2 text-xs"
              >
                {action.label}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-auto p-1"
            aria-label="Fechar notificação"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </Alert>
    </div>
  )
}
