import { useState, useRef, useEffect } from 'react'
import {
  COUNTRY_PHONE_LIST,
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
  type CountryPhone,
} from '../data/countryCodes'
import { parsePhoneValue } from '../lib/phoneValue'

/** Valeur stockée : E.164 dès qu’il y a des chiffres locaux ; sinon indicatif seul (ex. +229) pour garder le pays choisi. */
function buildPhoneValue(dial: string, localNumber: string): string {
  const digits = (localNumber || '').replace(/\D/g, '').trim()
  return digits ? `${dial}${digits}` : dial
}

function matchCountrySearch(c: CountryPhone, q: string): boolean {
  if (!q.trim()) return true
  const lower = q.toLowerCase().trim()
  const nameMatch = c.name.toLowerCase().includes(lower)
  const dialMatch = c.dial.includes(lower) || c.dial.replace('+', '').includes(lower)
  const codeMatch = c.code.toLowerCase().includes(lower)
  return nameMatch || dialMatch || codeMatch
}

export type PhoneInputProps = {
  value: string
  onChange: (phone: string) => void
  required?: boolean
  maxLength?: number
  placeholder?: string
  className?: string
  id?: string
}

export function PhoneInput({
  value,
  onChange,
  required = false,
  maxLength = 50,
  placeholder = '01 97 33 49 87',
  className = '',
  id,
}: PhoneInputProps) {
  const parsed = parsePhoneValue(value)
  const country = getCountryByCode(parsed.countryCode) ?? getCountryByCode(DEFAULT_COUNTRY_CODE)!
  const dial = country?.dial ?? '+221'

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
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [dropdownOpen])

  const handleSelectCountry = (c: CountryPhone) => {
    const newPhone = buildPhoneValue(c.dial, parsed.localNumber)
    onChange(newPhone)
    setTimeout(() => setDropdownOpen(false), 0)
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const local = e.target.value
    const newPhone = buildPhoneValue(dial, local)
    onChange(newPhone)
  }

  const inputValue = parsed.localNumber

  return (
    <div className={`flex rounded-xl border border-gray-200 bg-white focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/25 ${className}`}>
      <div className="relative shrink-0" ref={containerRef}>
        <button
          type="button"
          onClick={() => {
            setDropdownOpen((o) => !o)
            setSearchQuery('')
          }}
          className="flex w-24 items-center justify-between gap-1 rounded-l-[11px] border-0 border-r border-gray-200 bg-gray-50/80 py-2 pl-3 pr-2 text-left text-gray-700 focus:outline-none focus:ring-0"
          aria-label="Code pays"
          {...(dropdownOpen ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
          aria-haspopup="listbox"
        >
          <span>{dial}</span>
          <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dropdownOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 p-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Rechercher un pays ou un code…"
                title="Rechercher un pays ou un code"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/25"
                aria-label="Rechercher un pays ou un code"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredList.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">Aucun résultat</div>
              ) : (
                filteredList.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectCountry(c)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${c.code === (country?.code ?? DEFAULT_COUNTRY_CODE) ? 'bg-blue-50 text-[#3B82F6]' : 'text-gray-700'}`}
                  >
                    <span className="font-medium">{c.dial}</span>
                    <span className="ml-2">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <input
        type="tel"
        id={id}
        required={required}
        maxLength={maxLength}
        value={inputValue}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-r-[11px] border-0 bg-transparent px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        aria-label="Numéro de téléphone"
      />
    </div>
  )
}
