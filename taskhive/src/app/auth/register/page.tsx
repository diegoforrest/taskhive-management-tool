import { RegisterForm } from "@/app/auth/register-form"
import { AuthLayout } from "@/app/auth/auth-layout"

export const metadata = {
  title: "Create Account - TaskHive",
  description: "Create your TaskHive account",
}

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
