import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Preview = {
  url: string;
  title: string;
  image: string | null;
  domain: string;
  price: string | null;
};

function pick(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decode(m[1].trim());
  }
  return null;
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function meta(prop: string): RegExp[] {
  return [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
  ];
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a link" }, { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol)) {
    return NextResponse.json({ error: "Only http(s) links" }, { status: 400 });
  }

  const domain = target.hostname.replace(/^www\./, "");
  const fallback: Preview = {
    url: target.toString(),
    title: domain,
    image: null,
    domain,
    price: null,
  };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(target, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; WifeWantsBot/0.1; +https://wife-wants.app) link-preview",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("html")) return NextResponse.json(fallback);

    const html = (await res.text()).slice(0, 300_000);
    const title =
      pick(html, meta("og:title")) ??
      pick(html, meta("twitter:title")) ??
      pick(html, [/<title[^>]*>([^<]+)<\/title>/i]) ??
      domain;
    let image = pick(html, meta("og:image")) ?? pick(html, meta("twitter:image"));
    if (image && image.startsWith("/")) image = new URL(image, target).toString();
    const price =
      pick(html, meta("product:price:amount")) ??
      pick(html, meta("og:price:amount")) ??
      null;

    return NextResponse.json({ ...fallback, title, image, price } satisfies Preview);
  } catch {
    return NextResponse.json(fallback);
  }
}
