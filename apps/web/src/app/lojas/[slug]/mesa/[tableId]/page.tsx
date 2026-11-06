import { StoreMenu } from "@/components/store-menu";
import { getTableOr404 } from "@/lib/server/table";

export const dynamic = "force-dynamic";

export default async function TableMenuPage({ params }: { params: Promise<{ slug: string; tableId: string }> }) {
  const { slug, tableId } = await params;
  const table = await getTableOr404(slug, tableId);
  return <StoreMenu slug={slug} table={{ id: table.id, label: table.label }} />;
}
