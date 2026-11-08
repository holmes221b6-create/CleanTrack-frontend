
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

  async function fetchCsrfToken() {
    try {
      const response = await fetch(
        config.apiBaseUrl + normalizePath("auth/csrf"),
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include"
        }
      );
      if (!response.ok) return "";
      const data = await response.json();
      return String(data && (data.csrf_token || data.csrf) || "");
    } catch (_) {
      // Let the protected request return its normal authentication/CSRF error.
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
    const requestPath = String(path || "").split("?")[0].split("/").filter(Boolean).join("/");
    const csrfExemptPaths = new Set(["auth/login", "auth/register"]);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
        !headers.has("X-CSRF-TOKEN") &&
        !csrfExemptPaths.has(requestPath)) {
      // The access/CSRF cookies belong to the API host, not the frontend
      // host, so document.cookie on the frontend cannot always read them.
      const cookieToken = readCsrfCookie();
      const csrfToken = cookieToken || await fetchCsrfToken();
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
        const looksLikeHtml = /<\s*!doctype\s+html|<\s*html[\s>]|<\s*body[\s>]/i.test(responseText || "");
        // Never print a proxy/server HTML error page into the sign-in form.
        // Preserve plain-text API errors, but replace HTML with a concise diagnostic.
        data = responseText
          ? {
              message: looksLikeHtml
                ? "The server returned an HTML page instead of an API response (HTTP " + response.status + "). Check the backend URL and deployment."
                : responseText.slice(0, 500)
            }
          : null;
      }

      if (!response.ok) {
        // Access cookies expire well before the refresh cookie. When a
        // protected request gets a 401, renew the access cookie once and
        // retry the original request. Never recurse on the refresh endpoint.
        const refreshExcluded = new Set([
          "auth/login", "auth/register", "auth/refresh", "auth/csrf", "auth/logout"
        ]);
        if (response.status === 401 && !options._authRetried && !refreshExcluded.has(requestPath)) {
          try {
            const refreshHeaders = new Headers({ Accept: "application/json" });
            const refreshToken = window.CleanTrackAuth?.getRefreshToken?.();
            if (refreshToken) refreshHeaders.set("Authorization", "Bearer " + refreshToken);
            const refreshResponse = await fetch(
              config.apiBaseUrl + normalizePath("auth/refresh"),
              {
                method: "GET",
                headers: refreshHeaders,
                credentials: "include",
                cache: "no-store"
              }
            );
            if (refreshResponse.ok) {
              const refreshed = await refreshResponse.json().catch(() => ({}));
              if (refreshed.token && window.CleanTrackAuth?.setAuthToken) {
                window.CleanTrackAuth.setAuthToken(refreshed.token);
              }
              return await request(path, { ...options, _authRetried: true });
            }
          } catch (_) {
            // Preserve the original protected-request error if renewal fails.
          }
        }

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

  async function download(path, retried = false) {
    const headers = new Headers({ Accept: "*/*" });
    const token = window.CleanTrackAuth && window.CleanTrackAuth.getAuthToken ? window.CleanTrackAuth.getAuthToken() : window.sessionStorage.getItem("cleantrack_token");
    if (token) headers.set("Authorization", "Bearer " + token);
    const response = await fetch(config.apiBaseUrl + normalizePath(path), { method: "GET", headers, credentials: "include", cache: "no-store" });
    if (response.status === 401 && !retried) {
      try {
        const refreshHeaders = new Headers({ Accept: "application/json" });
        const refreshToken = window.CleanTrackAuth?.getRefreshToken?.();
        if (refreshToken) refreshHeaders.set("Authorization", "Bearer " + refreshToken);
        const refreshed = await fetch(config.apiBaseUrl + normalizePath("auth/refresh"), { method: "GET", headers: refreshHeaders, credentials: "include", cache: "no-store" });
        if (refreshed.ok) {
          const data = await refreshed.json().catch(() => ({}));
          if (data.token && window.CleanTrackAuth?.setAuthToken) window.CleanTrackAuth.setAuthToken(data.token);
          return await download(path, true);
        }
      } catch (_) {}
    }
    if (!response.ok) { let message = "The attachment could not be downloaded."; try { const data = await response.json(); message = data.message || data.error || message; } catch (_) {} throw new ApiError(message, response.status, null); }
    return URL.createObjectURL(await response.blob());
  }

  window.CleanTrackApi = Object.freeze({
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    download,
    ApiError
  });
})();