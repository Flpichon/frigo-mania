import { apiFetch } from "@/lib/api";
import type { HouseholdMember } from "@/types";

export async function fetchMembers(
  householdId: string,
  token: string,
): Promise<HouseholdMember[]> {
  return apiFetch<HouseholdMember[]>(
    `/households/${householdId}/members`,
    { token },
  );
}

export async function renameHousehold(
  householdId: string,
  name: string,
  token: string,
): Promise<void> {
  await apiFetch(`/households/${householdId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ name }),
  });
}

export async function generateInviteToken(
  householdId: string,
  token: string,
): Promise<string> {
  const res = await apiFetch<{ token: string }>(
    `/households/${householdId}/invite`,
    { method: "POST", token },
  );
  return res.token;
}

export async function removeMember(
  householdId: string,
  memberId: string,
  token: string,
): Promise<void> {
  await apiFetch(`/households/${householdId}/members/${memberId}`, {
    method: "DELETE",
    token,
  });
}

export async function leaveHousehold(
  householdId: string,
  userId: string,
  token: string,
): Promise<void> {
  await apiFetch(`/households/${householdId}/members/${userId}`, {
    method: "DELETE",
    token,
  });
}

export async function deleteHousehold(
  householdId: string,
  token: string,
): Promise<void> {
  await apiFetch(`/households/${householdId}`, {
    method: "DELETE",
    token,
  });
}

export async function createHousehold(
  name: string,
  token: string,
): Promise<void> {
  await apiFetch("/households", {
    method: "POST",
    token,
    body: JSON.stringify({ name }),
  });
}

export async function joinHousehold(
  inviteToken: string,
  authToken: string,
): Promise<void> {
  await apiFetch("/households/join", {
    method: "POST",
    token: authToken,
    body: JSON.stringify({ token: inviteToken }),
  });
}
