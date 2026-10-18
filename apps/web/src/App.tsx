import { Feed } from "@/components/feed"
import { Button } from "@/components/ui/button"
import { useMe } from "@/hooks/use-me"
import { signOut, useSession } from "@/lib/auth"
import { LoginPage } from "@/pages/login-page"
import { OnboardingPage } from "@/pages/onboarding-page"

export function App() {
  const { data: session, isPending } = useSession()

  // Checking for an existing session; render nothing to avoid a login flash.
  if (isPending) return null

  if (!session) return <LoginPage />

  return <SignedIn userId={session.user.id} email={session.user.email} />
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

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 md:py-8">
        <div className="flex items-center justify-between text-sm">
          <span>
            Signed in as{" "}
            <span className="font-medium">@{me.me.profile.username}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
        <Feed />
      </div>
    </div>
  )
}

export default App
