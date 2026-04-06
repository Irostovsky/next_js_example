"use client";

import { signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function HeaderNav() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  }

  if (isPending) {
    return <nav className="flex gap-4" />;
  }

  return (
    <nav className="flex items-center gap-4">
      {session ? (
        <>
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="hover:underline"
          >
            Logout
          </button>
        </>
      ) : (
        <Link href="/authenticate" className="hover:underline">
          Login
        </Link>
      )}
    </nav>
  );
}
