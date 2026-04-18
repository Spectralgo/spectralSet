import { db } from "@spectralset/db/client";
import { integrationConnections } from "@spectralset/db/schema";
import { and, eq } from "drizzle-orm";

export async function getSlackConnection(organizationId: string) {
	const connection = await db.query.integrationConnections.findFirst({
		where: and(
			eq(integrationConnections.organizationId, organizationId),
			eq(integrationConnections.provider, "slack"),
		),
	});

	return connection ?? null;
}
