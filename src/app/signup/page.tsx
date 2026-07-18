import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </Suspense>
  );
}
