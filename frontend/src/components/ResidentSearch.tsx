import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Resident } from '../types'

interface ResidentSearchProps {
  residents: Resident[]
  value: string
  onChange: (residentId: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

function formatResidentDisplay(resident: Resident): string {
  const unit = resident.ltcUnit ? ` (${resident.ltcUnit})` : ''
  const idPart = resident.residentId ? ` — ID: ${resident.residentId}` : ''
  const balancePart = typeof resident.trustBalance === 'number' ? ` — $${Number(resident.trustBalance || 0).toFixed(2)}` : ''
  return `${resident.name}${unit}${balancePart}${idPart}`
}

export default function ResidentSearch(props: ResidentSearchProps) {
  const { residents, value, onChange, placeholder = 'Search resident by name, ID or unit...', required, disabled } = props
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedResident = useMemo(() => residents.find(r => r.id === value), [residents, value])

  useEffect(() => {
    if (selectedResident && !isOpen) {
      setQuery(formatResidentDisplay(selectedResident))
    }
    if (!selectedResident && !isOpen) {
      setQuery('')
    }
  }, [selectedResident, isOpen])

  const filteredResidents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return residents.slice(0, 50)
    const matches = residents.filter(r => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.residentId && r.residentId.toLowerCase().includes(q)) ||
        (r.ltcUnit && r.ltcUnit.toLowerCase().includes(q))
      )
    })
    return matches.slice(0, 50)
  }, [residents, query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (selectedResident) {
          setQuery(formatResidentDisplay(selectedResident))
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedResident])

  function handleSelect(resident: Resident) {
    onChange(resident.id)
    setQuery(formatResidentDisplay(resident))
    setIsOpen(false)
    setHighlightIndex(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true)
      return
    }
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filteredResidents.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filteredResidents[highlightIndex]
      if (target) handleSelect(target)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      if (selectedResident) setQuery(formatResidentDisplay(selectedResident))
    }
  }

  function handleClear() {
    setQuery('')
    onChange('')
    setIsOpen(true)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-9"
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
          setHighlightIndex(0)
        }}
        onKeyDown={handleKeyDown}
        required={required && !value}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="resident-search-listbox"
      />
      {query && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Clear"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {isOpen && filteredResidents.length > 0 && (
        <ul
          id="resident-search-listbox"
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filteredResidents.map((r, idx) => (
            <li
              key={r.id}
              role="option"
              aria-selected={idx === highlightIndex}
              className={`px-3 py-2 cursor-pointer ${idx === highlightIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              onMouseEnter={() => setHighlightIndex(idx)}
              onMouseDown={(e) => {
                // prevent input blur before click
                e.preventDefault()
                handleSelect(r)
              }}
            >
              <div className="text-sm text-gray-900">{r.name}{r.ltcUnit ? ` (${r.ltcUnit})` : ''}</div>
              <div className="text-xs text-gray-500">ID: {r.residentId} • ${Number(r.trustBalance || 0).toFixed(2)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

