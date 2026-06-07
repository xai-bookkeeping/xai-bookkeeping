from dataclasses import dataclass
from functools import lru_cache

from clerk_backend_api import Clerk
from fastapi import Depends

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class ClerkInvitationRecord:
    created_at: object | None
    email_address: str
    id: str
    role: str
    status: str


class ClerkOrganizationClient:
    def __init__(self, client: Clerk) -> None:
        self._client = client

    def list_pending_invitations(self, company_id: str) -> list[ClerkInvitationRecord]:
        response = self._client.organization_invitations.list_pending(organization_id=company_id)
        return [
            ClerkInvitationRecord(
                created_at=invitation.created_at,
                email_address=invitation.email_address,
                id=invitation.id,
                role=invitation.role,
                status=invitation.status,
            )
            for invitation in response.data
        ]

    def invite_member(
        self,
        *,
        company_id: str,
        email_address: str,
        inviter_user_id: str | None,
        message: str | None,
        role: str,
    ) -> ClerkInvitationRecord:
        private_metadata = {"xai_role": role}
        if message:
            private_metadata["message"] = message

        invitation = self._client.organization_invitations.create(
            organization_id=company_id,
            email_address=email_address,
            inviter_user_id=inviter_user_id,
            notify=True,
            private_metadata=private_metadata,
            role=role,
        )
        return ClerkInvitationRecord(
            created_at=invitation.created_at,
            email_address=invitation.email_address,
            id=invitation.id,
            role=invitation.role,
            status=invitation.status,
        )

    def revoke_invitation(
        self,
        *,
        company_id: str,
        invitation_id: str,
        requesting_user_id: str | None,
    ) -> ClerkInvitationRecord:
        invitation = self._client.organization_invitations.revoke(
            invitation_id=invitation_id,
            organization_id=company_id,
            requesting_user_id=requesting_user_id,
        )
        return ClerkInvitationRecord(
            created_at=invitation.created_at,
            email_address=invitation.email_address,
            id=invitation.id,
            role=invitation.role,
            status=invitation.status,
        )

    def update_member_role(self, *, company_id: str, clerk_user_id: str, role: str) -> None:
        self._client.organization_memberships.update(
            organization_id=company_id,
            role=role,
            user_id=clerk_user_id,
        )

    def remove_member(self, *, company_id: str, clerk_user_id: str) -> None:
        self._client.organization_memberships.delete(
            organization_id=company_id,
            user_id=clerk_user_id,
        )


@lru_cache(maxsize=1)
def get_clerk_organization_sdk(secret_key: str) -> Clerk:
    return Clerk(bearer_auth=secret_key)


def get_clerk_organization_client(
    settings: Settings = Depends(get_settings),
) -> ClerkOrganizationClient:
    if not settings.clerk_secret_key:
        raise RuntimeError("CLERK_SECRET_KEY is required for Clerk organization operations")

    return ClerkOrganizationClient(get_clerk_organization_sdk(settings.clerk_secret_key))
