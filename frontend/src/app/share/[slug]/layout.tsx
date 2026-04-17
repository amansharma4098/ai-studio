export const metadata = {
  title: 'AI Agent Chat',
  description: 'Chat with an AI agent powered by AI Studio',
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  // No sidebar, no auth — standalone public page
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
