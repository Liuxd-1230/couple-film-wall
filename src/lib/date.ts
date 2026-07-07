const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const fullDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function formatShortDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function formatFullDate(value: string) {
  return fullDateFormatter.format(new Date(value))
}

export function daysBetween(start: string, end = new Date()) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const diff = endDate.getTime() - startDate.getTime()

  return Math.max(0, Math.floor(diff / 86_400_000) + 1)
}

export function daysUntilAnnualDate(value: string) {
  const now = new Date()
  const source = new Date(`${value}T00:00:00`)
  let next = new Date(now.getFullYear(), source.getMonth(), source.getDate())

  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear() + 1, source.getMonth(), source.getDate())
  }

  return Math.ceil((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
}

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}
