import {
  COUNTRY_PHONE_LIST,
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
} from '../data/countryCodes'

/** Parse a phone value to extract country code and local digits when possible. */
export function parsePhoneValue(value: string): {
  countryCode: string
  localNumber: string
} {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: '' }
  }
  if (!trimmed.startsWith('+')) {
    return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: trimmed.replace(/\D/g, '') }
  }
  const digitsOnly = trimmed.replace(/\D/g, '')
  for (let len = 4; len >= 1; len--) {
    const prefix = digitsOnly.slice(0, len)
    const dial = '+' + prefix
    const country = COUNTRY_PHONE_LIST.find((c) => c.dial === dial || c.dial.replace('+', '') === prefix)
    if (country) {
      const local = digitsOnly.slice(prefix.length).trim()
      return { countryCode: country.code, localNumber: local }
    }
  }
  return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: digitsOnly }
}

/** For API: return `null` if there is no local number (avoid storing bare country dial). */
export function telephoneForApi(value: string): string | null {
  const parsed = parsePhoneValue(value)
  const localDigits = parsed.localNumber.replace(/\D/g, '')
  if (!localDigits) {
    return null
  }
  const country =
    getCountryByCode(parsed.countryCode) ??
    getCountryByCode(DEFAULT_COUNTRY_CODE)!
  return `${country.dial}${localDigits}`
}
