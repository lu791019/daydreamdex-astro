// Kit (formerly ConvertKit) V4 API helpers — server-side / build-time only.
// Key is read from KIT_API_KEY env (.env locally, Cloudflare Pages env var in prod).

interface KitSubscribersResponse {
  pagination?: {
    total_count?: number;
  };
}

const KIT_API = 'https://api.kit.com/v4';

export async function getSubscriberCount(): Promise<number | null> {
  const key = import.meta.env.KIT_API_KEY ?? process.env.KIT_API_KEY;
  if (!key) {
    console.warn('[kit] KIT_API_KEY not set — skipping subscriber count fetch.');
    return null;
  }
  try {
    const res = await fetch(
      `${KIT_API}/subscribers?status=active&per_page=1&include_total_count=true`,
      { headers: { 'X-Kit-Api-Key': key } }
    );
    if (!res.ok) {
      console.warn(`[kit] API returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as KitSubscribersResponse;
    const count = data.pagination?.total_count;
    return typeof count === 'number' ? count : null;
  } catch (e) {
    console.warn('[kit] fetch failed:', e);
    return null;
  }
}
