"use client";

import { signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function HeaderNav() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  }

  return (
    <nav className="flex items-center gap-4">
      {mounted && session ? (
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
