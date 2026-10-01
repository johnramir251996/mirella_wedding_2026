import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { FieldError } from '../ui/FormField'

interface SearchFormProps {
  onSearch: (name: string) => void
  searching: boolean
  error: string | null
  /** Pre-filled name (e.g. when arriving from the RSVP page). */
  initialName?: string
}

export function SearchForm({ onSearch, searching, error, initialName = '' }: SearchFormProps) {
  const [name, setName] = useState(initialName)
  const [touched, setTouched] = useState(false)
  const empty = !name.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (empty || searching) return
    onSearch(name)
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto w-full max-w-md" aria-describedby="search-help">
      <label htmlFor="guest-name" className="sr-only">
        Enter your full name
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-champagne" strokeWidth={1.5} />
        <input
          id="guest-name"
          name="guest-name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="search"
          placeholder="Enter your full name"
          value={name}
          maxLength={150}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={(touched && empty) || Boolean(error) || undefined}
          aria-describedby="search-error"
          className="input-base min-h-14 pl-12 text-center text-lg sm:text-left"
        />
      </div>
      <p id="search-help" className="mt-3 text-center text-sm text-muted">
        Please type your name as it appears on your invitation.
      </p>
      <FieldError id="search-error">{touched && empty ? 'Please enter your full name.' : error}</FieldError>
      <Button type="submit" size="lg" fullWidth loading={searching} loadingText="Searching…" className="mt-6">
        Search
      </Button>
    </form>
  )
}
