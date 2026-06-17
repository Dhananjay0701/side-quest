import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/40 p-6 shadow-xl">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-muted">Start saving and sharing your travel collections.</p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
