// Next.js replaces a thrown server-action error's message with a generic one
// in production builds, so AI actions return their failure as a value instead.
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function attempt<T>(run: () => Promise<T>): Promise<AiResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    console.error(err);
    const error =
      err instanceof Error ? err.message : 'Something went wrong — try again.';
    return { ok: false, error };
  }
}

// Client side: turns a failed result back into a throw, so callers keep their
// existing try/catch.
export function unwrap<T>(result: AiResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
