"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"

export function TagEditor({
  tags,
  onAdd,
  onRemove,
  placeholder,
  variant = "secondary",
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder: string
  variant?: "secondary" | "default" | "destructive"
}) {
  const [newTag, setNewTag] = useState("")

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tags.map((tag) => (
          <Badge key={tag} variant={variant} className="gap-1 text-xs">
            {tag}
            <button onClick={() => onRemove(tag)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground italic">None added yet</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTag.trim()) {
              onAdd(newTag.trim())
              setNewTag("")
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 bg-transparent"
          onClick={() => {
            if (newTag.trim()) {
              onAdd(newTag.trim())
              setNewTag("")
            }
          }}
          disabled={!newTag.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
