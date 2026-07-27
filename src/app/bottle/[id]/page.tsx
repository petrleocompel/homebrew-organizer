import { notFound, permanentRedirect } from "next/navigation";
import { getCanonicalCodeForLegacyLocator } from "@/server/services/bottle-service";

export const dynamic = "force-dynamic";

export default async function LegacyBottlePage(props: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await props.params;
	const code = await getCanonicalCodeForLegacyLocator(id);
	if (!code) notFound();
	permanentRedirect(`/b/${code}`);
}
