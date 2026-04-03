export default async function PublicNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Public Note</h1>
      <p className="mt-4 text-lg text-gray-600">Viewing public note: {slug}</p>
    </div>
  );
}
