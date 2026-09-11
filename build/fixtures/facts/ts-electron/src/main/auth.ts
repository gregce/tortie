export function authenticate(req: { token: string }): boolean {
  return req.token.length > 0;
}

export function guard(req: { token: string }): void {
  authenticate(req);
}
