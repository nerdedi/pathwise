import type { Itinerary, SharedCollaborator } from "@/types/itinerary";

export const normalizeCollaborators = (
  itinerary: Pick<Itinerary, "sharedWith" | "sharedWithEmails"> | null | undefined
): SharedCollaborator[] => {
  const fromStructured = (itinerary?.sharedWith ?? [])
    .map((item): SharedCollaborator | null => {
      if (!item?.email || typeof item.email !== "string") return null;
      const email = item.email.trim().toLowerCase();
      if (!email) return null;

      return {
        email,
        role: item.role === "viewer" ? "viewer" : "editor",
      };
    })
    .filter(Boolean) as SharedCollaborator[];

  if (fromStructured.length > 0) return fromStructured;

  return (itinerary?.sharedWithEmails ?? [])
    .filter((email): email is string => typeof email === "string")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({ email, role: "editor" as const }));
};

export const getCollaboratorRole = (
  itinerary: Pick<Itinerary, "sharedWith" | "sharedWithEmails"> | null | undefined,
  email: string
) => {
  const target = email.trim().toLowerCase();
  if (!target) return undefined;

  return normalizeCollaborators(itinerary).find((item) => item.email === target)?.role;
};

export const normalizeLockedSectionIds = (lockedSectionIds: unknown): string[] => {
  if (!Array.isArray(lockedSectionIds)) return [];

  return lockedSectionIds
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
};

export const mergeSectionsRespectingLocks = (
  existing: Itinerary,
  next: Itinerary
): Itinerary["sections"] => {
  const locked = new Set(normalizeLockedSectionIds(existing.lockedSectionIds));

  return existing.sections.map((existingSection) => {
    if (locked.has(existingSection.id)) return existingSection;

    const replacement = next.sections.find((section) => section.id === existingSection.id);
    return replacement ?? existingSection;
  });
};

export const sanitizeItineraryForAccess = (itinerary: Itinerary, isOwner: boolean) => {
  const normalizedCollaborators = normalizeCollaborators(itinerary);
  const base: Itinerary = {
    ...itinerary,
    sharedWith: normalizedCollaborators,
    sharedWithEmails: normalizedCollaborators.map((item) => item.email),
    lockedSectionIds: normalizeLockedSectionIds(itinerary.lockedSectionIds),
  };

  if (isOwner) return base;

  const { privateNotes: _privateNotes, ...withoutPrivateNotes } = base;
  return withoutPrivateNotes;
};
