import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useState } from 'react'
import { getMyUnits } from '../actions/units'

interface UnitChipsProps {
  /** Currently selected unit value */
  selectedUnit: string
  /** Callback when a unit is selected or deselected */
  onSelect: (unit: string) => void
  /** Whether the chips are disabled */
  disabled?: boolean
}

/**
 * Reusable unit suggestion chips component.
 * Fetches the user's custom units from the DB and displays them as selectable chips.
 */
export function UnitChips({
  selectedUnit,
  onSelect,
  disabled = false,
}: UnitChipsProps) {
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([])
  const fetchUnits = useServerFn(getMyUnits)

  const loadUnits = useCallback(async () => {
    try {
      const result = await fetchUnits()
      setUnits(result.map((u) => ({ id: u.id, name: u.name })))
    } catch {
      // ログインしていない場合等は空配列のまま
    }
  }, [fetchUnits])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  if (units.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1 pl-0.5">
      {units.map((unit) => (
        <button
          key={unit.id}
          type="button"
          disabled={disabled}
          className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
            selectedUnit === unit.name
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
          }`}
          onClick={() => {
            // 同じ単位をタップしたらクリア
            onSelect(selectedUnit === unit.name ? '' : unit.name)
          }}
        >
          {unit.name}
        </button>
      ))}
    </div>
  )
}
