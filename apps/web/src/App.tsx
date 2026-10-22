import { Button } from "@/components/ui/button"
import { useSession } from "@/hooks/use-auth"
import { useMe } from "@/hooks/use-me"
import { HomePage } from "@/pages/home-page"
import { LoginPage } from "@/pages/login-page"
import { OnboardingPage } from "@/pages/onboarding-page"

export function App() {
  const { pending, user } = useSession()

  // Checking for an existing session; render nothing to avoid a login flash.
  if (pending) return null

  if (!user) return <LoginPage />

  return <SignedIn userId={user.id} email={user.email} />
}

/** Signed in: onboarding until the user has a profile, then the app. */
function SignedIn({ userId, email }: { userId: string; email: string }) {
  const me = useMe(userId)

  if (me.status === "loading") return null

  if (me.status === "error") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-sm">
        <p>Couldn&apos;t load your account.</p>
        <Button variant="outline" onClick={me.reload}>
          Try again
        </Button>
      </div>
    )
  }

  if (!me.me?.profile) {
    return <OnboardingPage email={email} onComplete={me.reload} />
  }

  const { username, firstName, lastName, avatarUrl } = me.me.profile
  return <HomePage me={{ userId, username, firstName, lastName, avatarUrl }} />
}

export default App
