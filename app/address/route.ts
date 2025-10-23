import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  const { q, lim = 10 } = await request.json();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/addresses_search`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q, lim }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
