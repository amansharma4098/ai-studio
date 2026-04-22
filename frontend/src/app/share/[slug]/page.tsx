import SharedAgentPage from './client'

export function generateStaticParams() {
  return [{ slug: '_fallback' }]
}

export default function Page() {
  return <SharedAgentPage />
}
