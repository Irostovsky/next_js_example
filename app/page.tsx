"use client";

import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Counter: {count}</h1>
      <button
        onClick={() => setCount(count + 1)}
        className="rounded-lg bg-blue-600 px-6 py-3 text-lg text-white hover:bg-blue-700"
      >
        Increment
      </button>
    </div>
  );
}
