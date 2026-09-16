export type School = {
  id: string;
  name: string;
  district?: string;
  city?: string;
  state?: string;
  verified: boolean;
};

type SchoolListResponse = {
  ok: boolean;
  schools?: School[];
  error?: string;
};

function apiBase() {
  const value = process.env.EXPO_PUBLIC_SEND_API_URL?.trim();

  if (!value) {
    throw new Error(
      "EXPO_PUBLIC_SEND_API_URL is not configured."
    );
  }

  return value.replace(/\/+$/, "");
}

export async function fetchSchools(): Promise<School[]> {
  const response = await fetch(`${apiBase()}/api/schools`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = (await response
    .json()
    .catch(() => ({}))) as SchoolListResponse;

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error || "Unable to load verified schools."
    );
  }

  return (data.schools ?? []).filter(
    (school) => school.verified === true
  );
}
