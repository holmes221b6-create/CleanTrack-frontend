
/* =========================================
   CleanTrack - Authentication Client
   File: js/auth.js
   ========================================= */

(function () {
  "use strict";

  const api = window.CleanTrackApi;

  if (!api) {
    throw new Error(
      "CleanTrackApi is missing. Load js/api.js before js/auth.js."
    );
  }

  let currentUser = null;
  let authToken = "";
  let refreshToken = "";

  function persistToken(token) {
    authToken = String(token || "");
    try {
      if (authToken) window.sessionStorage.setItem("cleantrack_token", authToken);
      else window.sessionStorage.removeItem("cleantrack_token");
    } catch (error) {
      // Keep the in-memory token for the current page when storage is unavailable.
    }
  }

  function persistRefreshToken(token) {
    refreshToken = String(token || "");
    try {
      if (refreshToken) window.sessionStorage.setItem("cleantrack_refresh_token", refreshToken);
      else window.sessionStorage.removeItem("cleantrack_refresh_token");
    } catch (error) {
      // Keep the in-memory refresh token for the current page if storage is unavailable.
    }
  }

  function getRefreshToken() {
    if (refreshToken) return refreshToken;
    try {
      refreshToken = window.sessionStorage.getItem("cleantrack_refresh_token") || "";
    } catch (error) {
      refreshToken = "";
    }
    return refreshToken;
  }

  function setAuthToken(token) {
    persistToken(token);
  }

  function getAuthToken() {
    if (authToken) return authToken;
    try {
      authToken = window.sessionStorage.getItem("cleantrack_token") || "";
    } catch (error) {
      authToken = "";
    }
    return authToken;
  }

function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const organization =
    user.organization ??
    user.organization_name ??
    user.organizationName ??
    user.data?.organization ??
    null;

  const organizationName =
    user.organization_name ||
    user.organizationName ||
    (typeof organization === "object"
      ? organization?.name
      : organization) ||
    "";

  return {
    id: user.id ?? null,
    name: user.name || user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    preferences: user.preferences && typeof user.preferences === "object" ? user.preferences : {},
    account_status: user.account_status || "",
    created_at: user.created_at || null,
    email_verified: Boolean(user.email_verified ?? user.emailVerified),
    role: String(user.role || "").toLowerCase(),

    organizationId:
      user.organization_id ??
      user.organizationId ??
      (typeof organization === "object"
        ? organization?.id
        : null) ??
      null,

    organization_name: String(organizationName).trim(),
    organizationName: String(organizationName).trim(),
    organization:
      typeof organization === "object"
        ? organization
        : organizationName || null,

    teamId: user.team_id ?? user.teamId ?? null,
    avatarUrl: user.avatar_url || user.avatarUrl || null,
    emailVerified: Boolean(
      user.email_verified ?? user.emailVerified
    )
  };
}

  async function login(credentials) {
    validateCredentials(credentials);

    const response = await api.post("auth/login", {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password
    });

    persistToken(response.token || response.data?.token || "");
    persistRefreshToken(response.refresh_token || response.data?.refresh_token || "");
    currentUser = normalizeUser(
      response.user || response.data?.user
    );

    if (!currentUser) {
      throw new Error(
        "The server response did not include a valid user."
      );
    }

    // Load this user's saved theme and locale as soon as authentication succeeds.
    if (typeof window.CleanTrackPreferences?.setUser === "function") { window.CleanTrackPreferences.setUser(currentUser.id); }
    emitAuthEvent("cleantrack:login", currentUser);
    return currentUser;
  }

  async function register(details) {
    if (!details || typeof details !== "object") {
      throw new Error("Registration details are required.");
    }

    const name = String(
  details.name || details.full_name || details.fullName || ""
).trim();
    const email = String(details.email || "").trim().toLowerCase();
    const password = String(details.password || "");
    const role = String(details.role || "").toLowerCase();

    if (!name) {
      throw new Error("Please enter your full name.");
    }

    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }

    if (password.length < 8) {
      throw new Error(
        "Your password must contain at least 8 characters."
      );
    }

    if (!["admin", "supervisor", "employee"].includes(role)) {
      throw new Error("Please select a valid registration role.");
    }
    
    const payload = {
  full_name: name,
  email: email,
  password: password,
  role: role,
  accept_terms: details.accept_terms === true
};
 

    if (details.phone) {
      payload.phone = String(details.phone).trim();
    }

    if (details.invitation_token) {
      payload.invitation_token = String(details.invitation_token).trim();
    }

    if (details.membership_message) {
      payload.message = String(details.membership_message).trim();
    }

    if (details.organization_name) {
      payload.organization_name =
        String(details.organization_name).trim();
    }

    if (details.organization_code) {
      payload.organization_code =
        String(details.organization_code).trim();
    }

    const response = await api.post("auth/register", payload);
    const user = response.user || response.data?.user || null;
    const token = response.token || response.data?.token || "";

    if (token) {
      persistToken(token);
      currentUser = normalizeUser(user);
      emitAuthEvent("cleantrack:register", currentUser);
    } else {
      // Supervisors and employees stay signed out until their membership is approved.
      currentUser = null;
      persistToken("");
    }

    return {
      user: currentUser,
      pendingUser: token ? null : user,
      membershipStatus: response.membership_status || user?.membership_status || (token ? "approved" : "pending"),
      organization: response.organization || null,
      message: response.message || "Registration request received."
    };
  }

  async function logout() {
    try {
      await api.post("auth/logout", {});
    } finally {
      currentUser = null;
      persistToken("");
      persistRefreshToken("");
      emitAuthEvent("cleantrack:logout", null);
    }
  }

  async function restoreSession() {
    try {
      const response = await api.get("auth/me");
      const user = response.user || response.data?.user || null;

      currentUser = normalizeUser(user);

      // Apply the signed-in user's saved preferences on every restored session.
      if (currentUser) if (typeof window.CleanTrackPreferences?.setUser === "function") { window.CleanTrackPreferences.setUser(currentUser.id); }
      emitAuthEvent("cleantrack:session-restored", currentUser);
      return currentUser;
    } catch (error) {
      currentUser = null;
      if (error.status === 401 || error.status === 403) persistToken("");

      if (error.status !== 401 && error.status !== 403) {
        console.warn(
          "CleanTrack session could not be checked:",
          error.message
        );
      }

      return null;
    }
  }

  function getCurrentUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function hasRole(...roles) {
    if (!currentUser) {
      return false;
    }

    return roles
      .map(function (role) {
        return String(role).toLowerCase();
      })
      .includes(currentUser.role);
  }

  function validateCredentials(credentials) {
    if (!credentials || typeof credentials !== "object") {
      throw new Error("Please enter your login details.");
    }

    if (!isValidEmail(String(credentials.email || "").trim())) {
      throw new Error("Please enter a valid email address.");
    }

    if (!credentials.password) {
      throw new Error("Please enter your password.");
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function emitAuthEvent(name, user) {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail: { user: user }
      })
    );
  }

  window.CleanTrackAuth = Object.freeze({
    login: login,
    register: register,
    logout: logout,
    restoreSession: restoreSession,
    getCurrentUser: getCurrentUser,
    getAuthToken: getAuthToken,
    getRefreshToken: getRefreshToken,
    setAuthToken: setAuthToken,
    isAuthenticated: isAuthenticated,
    hasRole: hasRole
  });
})();
