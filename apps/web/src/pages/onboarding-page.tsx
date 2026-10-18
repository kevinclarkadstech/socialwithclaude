import { OnboardingForm } from "@/components/onboarding-form"

/** Shown to signed-in users without a profile, in the login page's layout. */
export function OnboardingPage({
  email,
  onComplete,
}: {
  email: string
  onComplete: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <OnboardingForm email={email} onComplete={onComplete} />
      </div>
    </div>
  )
}
