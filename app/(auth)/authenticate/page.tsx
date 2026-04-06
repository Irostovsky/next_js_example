import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export default function AuthenticatePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
