"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Check, X } from "lucide-react"

export function InlineField({
  label,
  value,
  icon: Icon,
  onChange,
  type = "text",
  verified = false,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  onChange: (val: string) => void
  type?: string
  verified?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  if (editing) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="flex-1 h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(localValue)
              setEditing(false)
            }
            if (e.key === "Escape") {
              setLocalValue(value)
              setEditing(false)
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600"
          onClick={() => {
            onChange(localValue)
            setEditing(false)
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setLocalValue(value)
            setEditing(false)
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 group">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      </div>
      {verified && (
        <Badge variant="outline" className="text-[10px] h-5 border-green-300 text-green-700 bg-green-50">
          VERIFIED
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
