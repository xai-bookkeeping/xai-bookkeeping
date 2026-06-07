import { useMemo, useState } from "react";
import { useOrganizationList } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";

type CompanySwitcherProps = {
  activeCompanyId: null | string;
  activeCompanyName: string;
  activeCompanySubtitle: string;
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  onSwitchingChange?: (isSwitching: boolean) => void;
};

type OrganizationOption = {
  businessActivity: string;
  id: string;
  name: string;
};

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CompanySwitcher({
  activeCompanyId,
  activeCompanyName,
  activeCompanySubtitle,
  isOpen,
  onOpenChange,
  onSwitchingChange,
}: CompanySwitcherProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoaded, setActive, userMemberships } = useOrganizationList();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [switchingCompanyId, setSwitchingCompanyId] = useState<string | null>(null);

  const companies = useMemo<OrganizationOption[]>(() => {
    const memberships = userMemberships?.data ?? [];

    return memberships
      .map((membership) => {
        const organization = membership.organization;
        if (!organization?.id || !organization.name) {
          return null;
        }

        const publicMetadata = organization.publicMetadata as { businessActivity?: unknown } | undefined;

        return {
          businessActivity:
            typeof publicMetadata?.businessActivity === "string"
              ? publicMetadata.businessActivity
              : "UAE company workspace",
          id: organization.id,
          name: organization.name,
        };
      })
      .filter((company): company is OrganizationOption => company !== null);
  }, [userMemberships]);

  const activeCompany =
    companies.find((company) => company.id === activeCompanyId) ??
    (activeCompanyId
      ? {
          businessActivity: activeCompanySubtitle,
          id: activeCompanyId,
          name: activeCompanyName,
        }
      : null);

  async function handleCompanySwitch(company: OrganizationOption) {
    if (!isLoaded || !setActive || company.id === activeCompanyId) {
      onOpenChange(false);
      return;
    }

    setFeedback("Switching company...");
    setSwitchingCompanyId(company.id);
    onSwitchingChange?.(true);

    try {
      await setActive({ organization: company.id });
      queryClient.clear();
      setFeedback(`Company switched. Showing records for ${company.name}.`);
      onOpenChange(false);
    } catch {
      setFeedback("Could not switch company. Try again or contact an admin.");
    } finally {
      setSwitchingCompanyId(null);
      onSwitchingChange?.(false);
    }
  }

  function handleAddCompany() {
    onOpenChange(false);
    navigate("/create-company");
  }

  return (
    <div className="relative min-w-[240px]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={activeCompanyName}
        disabled={!isLoaded || switchingCompanyId !== null}
        onClick={() => onOpenChange(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 rounded-[0.75rem] border border-[color:var(--xb-border)] bg-[color:var(--xb-panel)] px-3 py-2.5 text-left shadow-sm transition-colors",
          "hover:border-[color:var(--xb-ink)]/20 hover:bg-white",
          switchingCompanyId !== null && "cursor-wait opacity-80",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--xb-accent)] text-xs font-semibold text-white">
          {getInitials(activeCompanyName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--xb-ink)]">{activeCompanyName}</div>
          <div className="truncate text-xs text-[var(--xb-muted)]">
            {switchingCompanyId !== null ? "Switching company..." : activeCompanySubtitle}
          </div>
        </div>

        <span aria-hidden="true" className="text-sm text-[var(--xb-muted)]">
          ▾
        </span>
      </button>

      {feedback ? (
        <p className="mt-2 text-xs text-[var(--xb-muted)]">{feedback}</p>
      ) : null}

      {isOpen ? (
        <div
          role="menu"
          aria-label="Switch company"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[320px] rounded-[1rem] border border-[color:var(--xb-border)] bg-white p-2 shadow-[var(--xb-shadow)]"
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--xb-muted)]">
            Switch company
          </div>

          <div className="space-y-1">
            {companies.map((company) => {
              const isActive = company.id === activeCompany?.id;
              const isSwitching = company.id === switchingCompanyId;

              return (
                <button
                  key={company.id}
                  type="button"
                  role="menuitem"
                  disabled={switchingCompanyId !== null}
                  onClick={() => handleCompanySwitch(company)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[0.75rem] px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-[var(--xb-accent-soft)]" : "hover:bg-slate-50",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-[var(--xb-ink)]">
                    {getInitials(company.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--xb-ink)]">{company.name}</div>
                    <div className="truncate text-xs text-[var(--xb-muted)]">
                      {isSwitching ? "Switching company..." : company.businessActivity}
                    </div>
                  </div>

                  {isActive ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--xb-accent)] text-xs font-bold text-white">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="my-2 h-px bg-[color:var(--xb-border)]" />

          <button
            type="button"
            role="menuitem"
            onClick={handleAddCompany}
            className="flex w-full items-center gap-3 rounded-[0.75rem] px-3 py-2.5 text-left text-sm font-medium text-[var(--xb-ink)] transition-colors hover:bg-slate-50"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-dashed border-[color:var(--xb-border)] text-base">
              +
            </span>
            <span>Add a company</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
