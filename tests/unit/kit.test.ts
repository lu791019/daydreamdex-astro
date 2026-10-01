import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSubscriberCount } from '../../src/utils/kit';

const jsonResponse = (body: unknown, init: ResponseInit = { status: 200 }) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });

describe('getSubscriberCount', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('KIT_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });

  it('成功時回傳 pagination.total_count', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ subscribers: [], pagination: { total_count: 1234 } }));
    await expect(getSubscriberCount()).resolves.toBe(1234);
  });

  it('打 Kit V4 active subscribers 端點並帶 X-Kit-Api-Key header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ pagination: { total_count: 1 } }));
    await getSubscriberCount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.kit.com/v4/subscribers?status=active&per_page=1&include_total_count=true',
    );
    expect(init).toEqual({ headers: { 'X-Kit-Api-Key': 'test-key' } });
  });

  it('total_count 為 0 時回 0（不是 null）', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ pagination: { total_count: 0 } }));
    await expect(getSubscriberCount()).resolves.toBe(0);
  });

  it('缺 KIT_API_KEY：不打 API、回 null 並警告', async () => {
    vi.stubEnv('KIT_API_KEY', '');
    await expect(getSubscriberCount()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('KIT_API_KEY not set'));
  });

  it('import.meta.env 沒有 key 時退回讀 process.env（Cloudflare 建置環境）', async () => {
    vi.stubEnv('KIT_API_KEY', undefined);
    process.env.KIT_API_KEY = 'from-process-env';
    try {
      fetchMock.mockResolvedValue(jsonResponse({ pagination: { total_count: 7 } }));
      await expect(getSubscriberCount()).resolves.toBe(7);
      expect(fetchMock.mock.calls[0][1]).toEqual({
        headers: { 'X-Kit-Api-Key': 'from-process-env' },
      });
    } finally {
      delete process.env.KIT_API_KEY;
    }
  });

  it.each([401, 429, 500])('API 回 %i：回 null 並警告狀態碼', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ errors: ['x'] }, { status }));
    await expect(getSubscriberCount()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(`[kit] API returned ${status}`);
  });

  it('網路錯誤（fetch reject）：回 null 不拋例外', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'));
    await expect(getSubscriberCount()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[kit] fetch failed:', expect.any(TypeError));
  });

  it('回應不是合法 JSON：回 null 不拋例外', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }));
    await expect(getSubscriberCount()).resolves.toBeNull();
  });

  it.each([
    ['沒有 pagination', {}],
    ['沒有 total_count', { pagination: {} }],
    ['total_count 是字串', { pagination: { total_count: '99' } }],
    ['total_count 是 null', { pagination: { total_count: null } }],
  ])('回應格式不符（%s）：回 null', async (_label, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    await expect(getSubscriberCount()).resolves.toBeNull();
  });
});
