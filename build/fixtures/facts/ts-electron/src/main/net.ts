export const sock = { on: (_e: string, _f: () => void) => undefined };

export async function ping(): Promise<number> {
  const res = await fetch('https://api.example/v1');
  return res.status;
}

// The controls for Phase 261 item 6's msw refusal: the SAME receiver in a
// file that does not name msw is a real reach on both branches, the literal
// URL one and the receiver one, and both must keep firing.
export async function pingTwo(endpoint: string): Promise<void> {
  await http.get('https://api.example/v3', () => undefined);
  await http.post(endpoint, () => undefined);
}
