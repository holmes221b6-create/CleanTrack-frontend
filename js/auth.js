
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

  function persistToken(token) {
    authToken = String(token || "");
    try {
      if (authToken) window.sessionStorage.setItem("cleantrack_token", authToken);
      else window.sessionStorage.removeItem("cleantrack_token");
    } catch (error) {
      // Keep the in-memory token for the current page when storage is unavailable.
    }
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
    currentUser = normalizeUser(
      response.user || response.data?.user
    );

    if (!currentUser) {
      throw new Error(
        "The server response did not include a valid user."
      );
    }

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
      emitAuthEvent("cleantrack:logout", null);
    }
  }

  async function restoreSession() {
    // This API uses bearer JWT authentication. Do not send a guaranteed-401
    // session probe on a fresh visit when this tab has no token.
    if (!getAuthToken()) {
      currentUser = null;
      emitAuthEvent("cleantrack:session-restored", null);
      return null;
    }

    try {
      const response = await api.get("auth/me");
      const user = response.user || response.data?.user || null;

      currentUser = normalizeUser(user);

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
    isAuthenticated: isAuthenticated,
    hasRole: hasRole
  });
})();
