import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/utils/tailwind'

interface DragInputProps {
  value: number
  onChange: (value: number) => void
  step?: number
  precision?: number
  min?: number
  max?: number
  className?: string
  label?: string
  suffix?: string
  disabled?: boolean
}

export function DragInput({
  value,
  onChange,
  step = 0.01,
  precision = 1,
  min,
  max,
  className,
  label,
  suffix,
  disabled = false
}: DragInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value.toFixed(precision))
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartValue, setDragStartValue] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Don't update input value while actively dragging
    // This prevents external value changes from breaking the drag state
    if (!isEditing && !isDragging) {
      setInputValue(value.toFixed(precision))
    }
  }, [value, precision, isEditing, isDragging])

  // Handle cursor style and iframe blocking
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'ew-resize'
      // Disable pointer events on all iframes during drag
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        iframe.style.pointerEvents = 'none'
      })
      
      return () => {
        document.body.style.cursor = 'default'
        // Re-enable pointer events on iframes
        iframes.forEach(iframe => {
          iframe.style.pointerEvents = 'auto'
        })
      }
    }
  }, [isDragging])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing || disabled) return
    
    setIsDragging(true)
    setHasDragged(false)
    setDragStartX(e.clientX)
    setDragStartValue(value)
    
    e.preventDefault()
  }, [isEditing, disabled, value])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStartX
    
    // Mark that we've actually dragged if moved more than 2 pixels
    if (Math.abs(deltaX) > 2) {
      setHasDragged(true)
    }
    
    const deltaValue = deltaX * step
    let newValue = dragStartValue + deltaValue

    if (min !== undefined) newValue = Math.max(min, newValue)
    if (max !== undefined) newValue = Math.min(max, newValue)

    onChange(newValue)
  }, [isDragging, step, min, max, onChange, dragStartX, dragStartValue])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    // Reset accumulated delta after a short delay to allow click detection
    setTimeout(() => {
      setHasDragged(false)
    }, 0)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleClick = () => {
    // Only allow editing if we didn't actually drag
    if (!hasDragged && !disabled) {
      setIsEditing(true)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue)) {
      let finalValue = numValue
      if (min !== undefined) finalValue = Math.max(min, finalValue)
      if (max !== undefined) finalValue = Math.min(max, finalValue)
      onChange(finalValue)
    }
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setInputValue(value.toFixed(precision))
      setIsEditing(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {label && (
        <span className="text-xs text-zinc-400 w-3 flex-shrink-0">{label}</span>
      )}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          className={`flex-1 h-6 px-2 text-xs border rounded focus:outline-none min-w-0 ${
            disabled 
              ? 'bg-zinc-800/50 border-zinc-700/30 text-zinc-500 cursor-not-allowed'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 focus:border-emerald-500'
          }`}
        />
      ) : (
        <div
          className={cn(
            "flex-1 h-6 px-2 text-xs border rounded flex items-center justify-between transition-colors select-none min-w-0",
            disabled 
              ? "bg-zinc-800/50 border-zinc-700/30 text-zinc-500 cursor-not-allowed"
              : "bg-black/20 border-zinc-700/50 text-zinc-300 cursor-ew-resize hover:border-emerald-500/30",
            isDragging && !disabled && "bg-emerald-500/10 border-emerald-500/30"
          )}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        >
          <span className="truncate">{value.toFixed(precision)}</span>
          {suffix && <span className="text-zinc-500 flex-shrink-0 ml-1">{suffix}</span>}
        </div>
      )}
    </div>
  )
} 