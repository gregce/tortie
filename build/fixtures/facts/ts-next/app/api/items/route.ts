export async function GET(req: Request): Promise<Response> {
  return new Response('items');
}

export async function POST(req: Request): Promise<Response> {
  return new Response('created');
}
