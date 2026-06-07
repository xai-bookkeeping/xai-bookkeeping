import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import {
  getTeamDirectoryApiV1CompaniesCompanyIdTeamGet,
  inviteTeamMemberApiV1CompaniesCompanyIdTeamInvitationsPost,
  removeMemberApiV1CompaniesCompanyIdTeamMembersClerkUserIdDelete,
  revokeInvitationApiV1CompaniesCompanyIdTeamInvitationsInvitationIdDelete,
  updateMemberRoleApiV1CompaniesCompanyIdTeamMembersClerkUserIdPatch,
  type TeamDirectoryResponse,
  type TeamInviteRequest,
  type TeamMemberResponse,
} from "@/api";
import { RoleBadge } from "@/components/atoms/role-badge";
import { InviteMemberDialog } from "@/components/organisms/invite-member-dialog";
import { PermissionDeniedState } from "@/components/organisms/permission-denied-state";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { apiClient } from "@/lib/api-runtime";
import type { RootRouteContext } from "@/routes/root";

const teamQueryKey = (companyId: string) => ["company-team", companyId] as const;

function formatRelativeActivity(value: string | null): string {
  if (!value) {
    return "No recent activity";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeErrorMessage(error: unknown, companyName: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }

  return `You do not have permission to do that in ${companyName}.`;
}

export function TeamRolesRoute() {
  const { activeCompany, companyShellState, openCompanySwitcher } = useOutletContext<RootRouteContext>();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const teamQuery = useQuery({
    enabled: companyShellState === "ready" && Boolean(activeCompany),
    queryKey: activeCompany ? teamQueryKey(activeCompany.id) : ["company-team", "missing-company"],
    queryFn: async () => {
      const response = await getTeamDirectoryApiV1CompaniesCompanyIdTeamGet({
        client: apiClient,
        path: {
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        if (response.response?.status === 403) {
          throw new Error(response.error.detail ?? response.error.message ?? "Forbidden");
        }

        throw response.error;
      }

      return response.data as TeamDirectoryResponse;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (body: TeamInviteRequest) => {
      const response = await inviteTeamMemberApiV1CompaniesCompanyIdTeamInvitationsPost({
        body,
        client: apiClient,
        path: {
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return response.data;
    },
    onSuccess: async (invite) => {
      setFlashMessage(`Invitation sent to ${invite?.email_address}.`);
      setInviteDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: teamQueryKey(activeCompany?.id ?? ""),
      });
    },
    onError: (error) => {
      setFlashMessage(normalizeErrorMessage(error, activeCompany?.name ?? "this company"));
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ clerkUserId, role }: { clerkUserId: string; role: TeamMemberResponse["role"] }) => {
      const response = await updateMemberRoleApiV1CompaniesCompanyIdTeamMembersClerkUserIdPatch({
        body: { role },
        client: apiClient,
        path: {
          clerk_user_id: clerkUserId,
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return { clerkUserId, role };
    },
    onSuccess: async ({ clerkUserId, role }) => {
      await queryClient.invalidateQueries({
        queryKey: teamQueryKey(activeCompany?.id ?? ""),
      });

      const updatedMember = teamQuery.data?.members.find((member) => member.clerk_user_id === clerkUserId);
      setFlashMessage(`Role updated for ${updatedMember?.name ?? role}.`);
    },
    onError: (error) => {
      setFlashMessage(normalizeErrorMessage(error, activeCompany?.name ?? "this company"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (clerkUserId: string) => {
      const response = await removeMemberApiV1CompaniesCompanyIdTeamMembersClerkUserIdDelete({
        client: apiClient,
        path: {
          clerk_user_id: clerkUserId,
          company_id: activeCompany?.id ?? "",
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return clerkUserId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: teamQueryKey(activeCompany?.id ?? ""),
      });
    },
    onError: (error) => {
      setFlashMessage(normalizeErrorMessage(error, activeCompany?.name ?? "this company"));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await revokeInvitationApiV1CompaniesCompanyIdTeamInvitationsInvitationIdDelete({
        client: apiClient,
        path: {
          company_id: activeCompany?.id ?? "",
          invitation_id: invitationId,
        },
        responseStyle: "fields",
      });

      if ("error" in response && response.error) {
        throw response.error;
      }

      return invitationId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: teamQueryKey(activeCompany?.id ?? ""),
      });
    },
    onError: (error) => {
      setFlashMessage(normalizeErrorMessage(error, activeCompany?.name ?? "this company"));
    },
  });

  if (companyShellState === "forbidden") {
    return <PermissionDeniedState onSwitchCompany={openCompanySwitcher} />;
  }

  if (companyShellState === "loading" || !activeCompany || teamQuery.isLoading) {
    return (
      <Card className="border-dashed bg-[rgba(238,243,247,0.45)]">
        <CardContent className="space-y-3 p-6">
          <Badge tone="accent" className="w-fit">
            Loading team access...
          </Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Loading team context</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              We are loading company members, pending invites, and your current access rules.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teamQuery.isError) {
    return <PermissionDeniedState onSwitchCompany={openCompanySwitcher} />;
  }

  const team = teamQuery.data;
  const canManageRoles = team.permissions.can_change_roles;
  const canInviteMembers = team.permissions.can_invite_members;
  const canRemoveMembers = team.permissions.can_remove_members;
  const showDeniedActionState = !canManageRoles || !canInviteMembers || !canRemoveMembers;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--xb-muted)]">
            Company privacy
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Team & roles</h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--xb-muted)]">
              Invite people, assign access, and keep this company private.
            </p>
          </div>
        </div>

        <Button
          disabled={!canInviteMembers}
          onClick={() => setInviteDialogOpen(true)}
        >
          Invite member
        </Button>
      </div>

      {flashMessage ? (
        <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-white px-4 py-3 text-sm text-[var(--xb-ink)]">
          {flashMessage}
        </div>
      ) : null}

      {showDeniedActionState ? (
        <div className="rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] px-4 py-3 text-sm text-[var(--xb-ink)]">
          You do not have permission to do that in {activeCompany.name}.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <Badge tone="accent" className="w-fit">
            Active members
          </Badge>
          <CardTitle>Company access</CardTitle>
          <CardDescription>
            Fixed roles keep company data private while still giving each teammate clear access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {team.members.map((member) => (
            <div
              key={member.clerk_membership_id}
              className="grid gap-4 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-4 lg:grid-cols-[minmax(0,1.4fr)_220px_180px]"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--xb-ink)]">{member.name}</p>
                  <RoleBadge label={member.role_label} role={member.role} />
                  {member.is_current_user ? <Badge tone="default">You</Badge> : null}
                </div>
                <p className="text-sm text-[var(--xb-muted)]">{member.email_address}</p>
                <p className="text-sm leading-6 text-[var(--xb-muted)]">{member.role_description}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--xb-ink)]" htmlFor={`role-${member.clerk_user_id}`}>
                  Role
                </label>
                <select
                  aria-label={`Role for ${member.name}`}
                  className="flex h-11 w-full rounded-2xl border border-[color:var(--xb-border)] bg-white px-4 text-sm text-[var(--xb-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xb-accent)]"
                  disabled={!canManageRoles || member.is_current_user || roleMutation.isPending}
                  id={`role-${member.clerk_user_id}`}
                  onChange={(event) => {
                    roleMutation.mutate({
                      clerkUserId: member.clerk_user_id,
                      role: event.target.value as TeamMemberResponse["role"],
                    });
                  }}
                  value={member.role}
                >
                  <option value="viewer">Viewer</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <p className="text-sm text-[var(--xb-muted)]">{member.status === "active" ? "Active" : member.status}</p>
              </div>

              <div className="flex flex-col items-start justify-between gap-3">
                <div className="text-sm text-[var(--xb-muted)]">
                  Last active: {formatRelativeActivity(member.last_active_at)}
                </div>
                <Button
                  disabled={!canRemoveMembers || member.is_current_user || removeMutation.isPending}
                  onClick={() => removeMutation.mutate(member.clerk_user_id)}
                  variant="outline"
                >
                  {`Remove ${member.name}`}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge tone="warning" className="w-fit">
            Pending invites
          </Badge>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Pending invites stay visible until they are accepted or revoked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {team.pending_invites.length ? (
            team.pending_invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border border-[color:var(--xb-border)] bg-white p-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--xb-ink)]">{invite.email_address}</p>
                    <RoleBadge label={invite.role_label} role={invite.role} />
                    <Badge tone="warning">Invite pending</Badge>
                  </div>
                  <p className="text-sm leading-6 text-[var(--xb-muted)]">{invite.role_description}</p>
                </div>

                <Button
                  disabled={!canInviteMembers || revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(invite.id)}
                  variant="outline"
                >
                  {`Revoke ${invite.email_address}`}
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] p-5">
              <p className="text-sm font-semibold text-[var(--xb-ink)]">No pending invites</p>
              <p className="mt-2 text-sm leading-6 text-[var(--xb-muted)]">
                New invitations will appear here until the recipient joins the company.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog
        disabled={!canInviteMembers}
        isOpen={inviteDialogOpen}
        isSubmitting={inviteMutation.isPending}
        onOpenChange={setInviteDialogOpen}
        onSubmit={async (payload) => {
          await inviteMutation.mutateAsync(payload);
        }}
      />
    </section>
  );
}
