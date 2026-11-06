import { StoreMenu } from "@/components/store-menu";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StoreMenu slug={slug} />;
}
