import { SignInForm } from "@/app/auth/sign-in-form"
import { AuthLayout } from "@/app/auth/auth-layout"

export const metadata = {
  title: "Sign In - TaskHive",
  description: "Sign in to your TaskHive account",
}

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignInForm />
    </AuthLayout>
  )
}
