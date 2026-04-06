import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold">NextNotes</h1>
      <p className="mt-4 text-lg text-gray-600">
        Create, edit, and share rich-text notes.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/authenticate"
          className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign in
        </Link>
        <Link
          href="/authenticate?mode=signup"
          className="rounded border border-gray-300 px-6 py-2 text-sm font-medium hover:border-gray-400"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
