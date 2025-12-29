
const faviconCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const toolController = {
    getFavicon: async (req, res) => {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).json({ error: '缺少 URL' });
        try {
            const hostname = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
            const cached = faviconCache.get(hostname);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                res.set('Content-Type', cached.contentType);
                return res.send(cached.data);
            }
            const services = [`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`, `https://icons.duckduckgo.com/ip3/${hostname}.ico`];
            const result = await Promise.any(services.map(async (url) => {
                const resp = await fetch(url, { signal: AbortSignal.timeout(2000) });
                if (resp.ok) {
                    const buffer = Buffer.from(await resp.arrayBuffer());
                    if (buffer.length > 100) return { data: buffer, type: resp.headers.get('content-type') };
                }
                throw new Error('Failed');
            }));
            faviconCache.set(hostname, { data: result.data, contentType: result.type, timestamp: Date.now() });
            res.set('Content-Type', result.type);
            res.send(result.data);
        } catch (err) { res.status(404).json({ error: 'Not found' }); }
    },

    checkLinks: async (req, res) => {
        const { urls } = req.body;
        if (!Array.isArray(urls)) return res.status(400).json({ error: 'Invalid URLs' });
        const results = await Promise.all(urls.map(async (url) => {
            try {
                const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
                return { url, status: resp.ok ? 'ok' : 'error' };
            } catch (e) { return { url, status: 'error' }; }
        }));
        res.json({ results });
    },

    getSuggestions: async (req, res) => {
        const { keyword, type = 'baidu' } = req.query;
        if (!keyword) return res.json([]);
        try {
            const url = type === 'baidu' ? `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword)}&cb=` : `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}`;
            const resp = await fetch(url);
            if (type === 'baidu') {
                const text = await resp.text();
                const match = text.match(/s:\[(.*)\]/);
                return res.json(match ? JSON.parse(`[${match[1]}]`) : []);
            }
            const data = await resp.json();
            res.json(data[1] || []);
        } catch (e) { res.json([]); }
    }
};
