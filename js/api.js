
/* CleanTrack - API Client */
(function () {
  "use strict";

  const config = window.CleanTrackConfig;

  if (!config) {
    throw new Error(
      "CleanTrackConfig is missing. Load js/config.js before js/api.js."
    );
  }

  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }

  function readCsrfCookie() {
    try {
      const entry = document.cookie.split(";").map(part => part.trim())
        .find(part => part.startsWith("csrf_access_token="));
      return entry ? decodeURIComponent(entry.slice("csrf_access_token=".length)) : "";
    } catch (error) {
      return "";
    }
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || config.requestTimeoutMs;

    const timeoutId = window.setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    // The active backend stores JWTs in HttpOnly cookies and protects mutating
    // requests with Flask-JWT-Extended's readable CSRF cookie.
    const method = String(options.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !headers.has("X-CSRF-TOKEN")) {
      const csrfToken = readCsrfCookie();
      if (csrfToken) headers.set("X-CSRF-TOKEN", csrfToken);
    }

    // The Flask API uses Bearer JWTs; keep the token in this browser tab's session.
    try {
      const token = window.CleanTrackAuth && window.CleanTrackAuth.getAuthToken
        ? window.CleanTrackAuth.getAuthToken()
        : window.sessionStorage.getItem("cleantrack_token");
      if (token) headers.set("Authorization", "Bearer " + token);
    } catch (error) {
      // Storage can be unavailable in privacy-restricted browsing modes.
    }

    let body = options.body;

    if (
      body !== undefined &&
      body !== null &&
      !(body instanceof FormData) &&
      typeof body !== "string"
    ) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }

    try {
      const response = await fetch(
        config.apiBaseUrl + normalizePath(path),
        {
          method: options.method || "GET",
          headers,
          body,
          credentials: "include",
          signal: controller.signal
        }
      );

      const contentType = response.headers.get("content-type") || "";
      let data = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const responseText = await response.text();
        data = responseText ? { message: responseText } : null;
      }

      if (!response.ok) {
        const message =
          data && (data.message || data.error)
            ? (data.message || data.error)
            : "The request failed. Please try again.";

        throw new ApiError(message, response.status, data);
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ApiError(
          "The request timed out. Check your connection and try again.",
          0,
          null
        );
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        "Unable to reach CleanTrack. Check your connection and backend status.",
        0,
        null
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function normalizePath(path) {
    return "/" + String(path || "").replace(/^\/+/, "");
  }

  function get(path, options = {}) {
    return request(path, { ...options, method: "GET" });
  }

  function post(path, body, options = {}) {
    return request(path, { ...options, method: "POST", body });
  }

  function put(path, body, options = {}) {
    return request(path, { ...options, method: "PUT", body });
  }

  function patch(path, body, options = {}) {
    return request(path, { ...options, method: "PATCH", body });
  }

  function del(path, options = {}) {
    return request(path, { ...options, method: "DELETE" });
  }

  window.CleanTrackApi = Object.freeze({
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    ApiError
  });
})();