export const sock = { on: (_e: string, _f: () => void) => undefined };

export async function ping(): Promise<number> {
  const res = await fetch('https://api.example/v1');
  return res.status;
}
