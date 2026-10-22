/** CARX — tiny fetch wrapper with timeout + JSON discipline. */

export class ApiError extends Error {
  constructor(status, body) {
    super(`api_${status}${body?.error ? ":" + body.error : ""}`);
    this.status = status;
    this.body = body;
  }
}

export async function getJSON(url, { timeout = 8000 } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return res.status === 204 ? null : await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function postJSON(url, body, { timeout = 10000, token = null } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, json);
    return json;
  } finally {
    clearTimeout(timer);
  }
}
