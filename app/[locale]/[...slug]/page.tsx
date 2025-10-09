export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;

  return (
    <div>
      <h1>Catch All Page</h1>
      <p>Locale: {locale}</p>
      <p>Slug: {slug?.join('/') || 'none'}</p>
    </div>
  );
}
