import { Button } from "@/components/ui/button"
import { signOut, useSession } from "@/lib/auth"
import { LoginPage } from "@/pages/login-page"

export function App() {
  const { data: session, isPending } = useSession()

  // Checking for an existing session; render nothing to avoid a login flash.
  if (isPending) return null

  if (!session) return <LoginPage />

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-sm">
      <p>
        Signed in as <span className="font-medium">{session.user.email}</span>
      </p>
      <Button variant="outline" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  )
}

export default App
