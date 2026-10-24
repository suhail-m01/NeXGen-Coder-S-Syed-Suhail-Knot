const MAX_PUBLIC_RESPONSE_BYTES = 250_000;

export function assertPublicEventUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Enter a valid public HTTP or HTTPS event URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter a valid public HTTP or HTTPS event URL without embedded credentials.');
  const host = url.hostname.toLowerCase();
  const privateIp = /^(127\.|0\.|10\.|169\.254\.|192\.168\.|::1$|localhost$)/.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    || host.endsWith('.local');
  if (privateIp) throw new Error('Local-network and private-host URLs are not accepted by this browser adapter.');
  return url;
}

export function publicHtmlToEvidence(html: string, sourceUrl: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script:not([type="application/ld+json"]), style, noscript, svg, nav, footer').forEach((element) => element.remove());
  const structured: string[] = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent ?? '');
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidates) {
        if (!item || typeof item !== 'object' || !String(item['@type'] ?? '').toLowerCase().includes('event')) continue;
        if (item.name) structured.push(`Title: ${item.name}`);
        if (item.startDate) structured.push(`Start: ${item.startDate}`);
        if (item.endDate) structured.push(`End: ${item.endDate}`);
        if (item.description) structured.push(`Description: ${String(item.description).replace(/<[^>]+>/g, ' ')}`);
        if (item.location?.name) structured.push(`Venue: ${item.location.name}`);
        if (item.url) structured.push(`Event URL: ${item.url}`);
        if (item.offers?.url) structured.push(`Register: ${item.offers.url}`);
        if (item.offers?.price !== undefined) structured.push(`Price evidence: ${item.offers.price} ${item.offers.priceCurrency ?? ''}`);
      }
    } catch { /* Invalid JSON-LD remains unread; visible page text is still available. */ }
  }
  const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const metaDescription = document.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute('content');
  const visibleText = (document.body?.textContent ?? '').replace(/\s+/g, ' ').replace(/ ([.:;!?])/g, '$1').slice(0, 50_000);
  return [`Source URL: ${sourceUrl}`, ...structured, metaTitle ? `Page title: ${metaTitle}` : '', metaDescription ? `Page summary: ${metaDescription}` : '', visibleText].filter(Boolean).join('\n');
}

export async function readPublicEventPage(rawUrl: string, fetchImpl: typeof fetch = fetch) {
  const url = assertPublicEventUrl(rawUrl.trim());
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(url, { credentials: 'omit', redirect: 'follow', signal: controller.signal, headers: { Accept: 'text/html,text/plain;q=0.9' } });
    if (!response.ok) throw new Error(`The public page returned HTTP ${response.status}; no content was imported.`);
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) throw new Error('Only public HTML or plain-text event pages are supported. Use poster OCR for an image.');
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_PUBLIC_RESPONSE_BYTES) throw new Error('The public page is too large for this browser import. Paste the relevant event text instead.');
    let text = '';
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (text.length > MAX_PUBLIC_RESPONSE_BYTES) {
          await reader.cancel();
          throw new Error('The public page exceeded the 250 KB import limit.');
        }
      }
      text += decoder.decode();
    } else text = (await response.text()).slice(0, MAX_PUBLIC_RESPONSE_BYTES + 1);
    if (text.length > MAX_PUBLIC_RESPONSE_BYTES) throw new Error('The public page exceeded the 250 KB import limit.');
    const evidence = contentType.includes('text/html') ? publicHtmlToEvidence(text, url.toString()) : `Source URL: ${url}\n${text}`;
    if (evidence.replace(/\s/g, '').length < 20) throw new Error('No readable event text was found on the public page.');
    return evidence;
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') throw new Error('The public page timed out after 12 seconds. Paste the event text instead.');
    if (reason instanceof TypeError) throw new Error('The site did not permit browser reading (often because of CORS or network policy). Paste its public event text instead; Knot did not bypass the restriction.');
    throw reason;
  } finally { window.clearTimeout(timeout); }
}
