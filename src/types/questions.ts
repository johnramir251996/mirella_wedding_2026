export type QuestionType = 'single' | 'multiple' | 'yes_no' | 'short_text' | 'long_text' | 'number'
export type QuestionAudience = 'all' | 'attending' | 'declining'

export interface ShowIf {
  questionId: string
  /** Show when the earlier answer is (or, for multiple choice, includes) any of these. */
  values: string[]
}

export interface RsvpQuestion {
  id: string
  question: string
  helpText: string
  type: QuestionType
  options: string[]
  maxSelections: number | null
  minValue: number | null
  maxValue: number | null
  maxLength: number | null
  required: boolean
  audience: QuestionAudience
  showIf: ShowIf | null
  sortOrder: number
  isActive: boolean
}

export type RsvpQuestionInput = Omit<RsvpQuestion, 'id' | 'sortOrder'>

export type CustomAnswer = string | string[]
export type CustomAnswers = Record<string, CustomAnswer>

export type BuiltinKey = 'transportation' | 'comingFrom' | 'food' | 'dietary' | 'accessibility' | 'message'

export interface BuiltinConfig {
  enabled: boolean
  label?: string
  required?: boolean
}

export interface RsvpConfig {
  builtins: Partial<Record<BuiltinKey, BuiltinConfig>>
}

export const BUILTIN_QUESTIONS: { key: BuiltinKey; defaultLabel: string; description: string; canRequire?: boolean }[] = [
  { key: 'transportation', defaultLabel: 'Do you have your own transportation vehicle?', description: 'Includes the follow-ups: vehicle type, or whether they need a ride.' },
  { key: 'comingFrom', defaultLabel: 'Where will you be coming from?', description: 'Short text, 120 characters.', canRequire: true },
  { key: 'food', defaultLabel: 'Which dishes would you like to see at our wedding? 🍽️', description: 'Up to 4 of: vegetable, pasta, fish, pork, beef, chicken.' },
  { key: 'dietary', defaultLabel: 'Do you have any food allergies or dietary restrictions?', description: 'Yes / No, with details when Yes.' },
  { key: 'accessibility', defaultLabel: 'Do you have any special accessibility or mobility needs we should be aware of?', description: 'Optional, 255 characters.' },
  { key: 'message', defaultLabel: 'Leave a message for the couple 💌', description: 'Optional, 500 characters. Always the last question.' },
]

export const QUESTION_TYPES: { value: QuestionType; label: string; description: string }[] = [
  { value: 'single', label: 'Single choice', description: 'Pick one option' },
  { value: 'multiple', label: 'Multiple choice', description: 'Pick one or more, with an optional limit' },
  { value: 'yes_no', label: 'Yes / No', description: 'Two buttons' },
  { value: 'short_text', label: 'Short answer', description: 'One line of text' },
  { value: 'long_text', label: 'Long answer', description: 'A paragraph' },
  { value: 'number', label: 'Number', description: 'A number, with optional min / max' },
]

export const AUDIENCES: { value: QuestionAudience; label: string }[] = [
  { value: 'attending', label: 'Guests who are attending' },
  { value: 'all', label: 'Everyone' },
  { value: 'declining', label: 'Guests who can’t attend' },
]
