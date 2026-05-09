import { useState, useRef, useEffect } from 'react'
import { COUNTRY_PHONE_LIST, type CountryPhone } from '../data/countryCodes'

function matchCountrySearch(c: CountryPhone, q: string): boolean {
  if (!q.trim()) return true
  const lower = q.toLowerCase().trim()
  const nameMatch = c.name.toLowerCase().includes(lower)
  const dialMatch = c.dial.includes(lower) || c.dial.replace('+', '').includes(lower)
  const codeMatch = c.code.toLowerCase().includes(lower)
  return nameMatch || dialMatch || codeMatch
}

export type CountrySelectProps = {
  value: string
  onChange: (countryName: string) => void
  /** Affiche « — Aucun — » pour vider la valeur (désactiver si le pays est obligatoire). Défaut : true. */
  allowClear?: boolean
  placeholder?: string
  className?: string
  id?: string
  /** Libellé accessibilité du bouton (défaut : choix du pays). */
  ariaLabel?: string
}

export function CountrySelect({
  value,
  onChange,
  allowClear = true,
  placeholder = 'Ex. France',
  className = '',
  id,
  ariaLabel = 'Choisir un pays',
}: CountrySelectProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredList = searchQuery.trim()
    ? COUNTRY_PHONE_LIST.filter((c) => matchCountrySearch(c, searchQuery))
    : COUNTRY_PHONE_LIST

  useEffect(() => {
    if (!dropdownOpen) return
    const t = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [dropdownOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [dropdownOpen])

  const handleSelect = (countryName: string) => {
    onChange(countryName)
    // Fermeture en différé : évite le "ghost click" (retargeting vers le bouton X)
    // et assure le même comportement dans tous les navigateurs.
    setTimeout(() => setDropdownOpen(false), 0)
  }

  const displayValue = value.trim() || ''

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={() => {
          setDropdownOpen((o) => !o)
          setSearchQuery('')
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-gray-700 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
      >
        <span className={displayValue ? '' : 'text-gray-400'}>{displayValue || placeholder}</span>
        <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dropdownOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full min-w-[240px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Rechercher un pays…"
              title="Rechercher un pays"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/25"
              aria-label="Rechercher un pays"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {allowClear && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect('') }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!displayValue ? 'bg-blue-50 text-[#3B82F6]' : 'text-gray-500'}`}
              >
                — Aucun —
              </button>
            )}
            {filteredList.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Aucun résultat</div>
            ) : (
              filteredList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(c.name) }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${c.name === displayValue ? 'bg-blue-50 text-[#3B82F6]' : 'text-gray-700'}`}
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
