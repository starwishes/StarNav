const normalizeUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  let cleanUrl = url.replace(/[\u200b-\u200d\uFEFF\u0000-\u001F\u007F-\u009F]/g, "").trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(cleanUrl)) return "";
    if (cleanUrl.includes("://")) return "";
    cleanUrl = "https://" + cleanUrl;
  }
  try {
    const u = new URL(cleanUrl);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    u.hostname = u.hostname.toLowerCase();
    if (u.hostname.endsWith(".")) u.hostname = u.hostname.slice(0, -1);
    if (u.hostname.includes("..")) return "";
    let pathname = u.pathname;
    while (pathname.includes("//")) pathname = pathname.replace(/\/\//g, "/");
    if (/^[./]+$/.test(pathname)) pathname = "/";
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    u.pathname = pathname;
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "gclsrc",
      "dclid",
      "gra",
      "fbclid",
      "igsh",
      "spm",
      "scm",
      "ali_trackid",
      "spm_id_from",
      "vd_source",
      "share_source",
      "share_medium",
      "share_plat",
      "share_tag",
      "bbid",
      "ts",
      "from",
      "isappinstalled",
      "wechat_redirect",
      "iid",
      "aid",
      "utm_id",
      "context_token",
      "ref",
      "source",
      "feature",
      "trk",
      "si",
      "yclid",
      "_openstat"
    ];
    trackingParams.forEach((param) => u.searchParams.delete(param));
    let finalUrl = u.toString();
    if (finalUrl.endsWith("#")) finalUrl = finalUrl.slice(0, -1);
    if (finalUrl.endsWith("?")) finalUrl = finalUrl.slice(0, -1);
    return finalUrl;
  } catch {
    return "";
  }
};
export {
  normalizeUrl
};
