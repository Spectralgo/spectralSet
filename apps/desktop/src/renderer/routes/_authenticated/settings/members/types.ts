import type {
	SelectInvitation,
	SelectMember,
	SelectUser,
} from "@spectralset/db/schema/auth";
import type { OrganizationRole } from "@spectralset/shared/auth";

export type TeamMember = SelectUser &
	SelectMember & {
		memberId: string;
		role: OrganizationRole;
	};

export type InvitationRow = SelectInvitation & {
	inviterName: string;
};
