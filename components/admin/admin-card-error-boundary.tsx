"use client"

import type React from "react"

import { Component, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
  fallbackTitle?: string
  cardName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class AdminCardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[AdminCardErrorBoundary] Component crashed:", error)
      console.error("[AdminCardErrorBoundary] Component stack:", errorInfo.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {this.props.fallbackTitle || "This metric is temporarily unavailable"}
              </span>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <p className="mt-2 text-xs text-amber-600 font-mono">{this.state.error.message}</p>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
