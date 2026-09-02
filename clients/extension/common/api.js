class ApiError extends Error {
  status;
  payload;
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.payload = options.payload;
  }
}
function unwrapApiPayload(payload) {
  if (payload && typeof payload === "object") {
    const record = payload;
    if (record.data !== void 0) {
      return record.data;
    }
  }
  return payload;
}
function mergeApiPayload(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  const unwrapped = unwrapApiPayload(payload);
  if (unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
    return {
      ...base,
      ...unwrapped
    };
  }
  return base;
}
function getApiField(payload, field, fallback) {
  if (payload && typeof payload === "object" && field in payload) {
    return payload[field];
  }
  const unwrapped = unwrapApiPayload(payload);
  if (unwrapped && typeof unwrapped === "object" && field in unwrapped) {
    return unwrapped[field];
  }
  return fallback;
}
function extractApiErrorMessage(payload, status) {
  if (payload && typeof payload === "object") {
    if (typeof payload.error === "string" && payload.error) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message) {
      return payload.message;
    }
  }
  return typeof status === "number" ? `HTTP Error ${status}` : "Request failed";
}
async function readJsonBody(response, fallback = {}) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}
export {
  ApiError,
  extractApiErrorMessage,
  getApiField,
  mergeApiPayload,
  readJsonBody,
  unwrapApiPayload
};
