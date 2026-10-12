
/* CleanTrack frontend configuration */
(function () {
  "use strict";

  const DEFAULT_API_URL = "http://127.0.0.1:5000/api";

  const apiBaseUrl = (
    window.CLEANTRACK_API_URL || DEFAULT_API_URL
  ).replace(/\/+$/, "");

  window.CleanTrackConfig = Object.freeze({
    appName: "CleanTrack",
    appVersion: "1.0.0",
    apiBaseUrl: apiBaseUrl,
    requestTimeoutMs: 20000,
    defaultLanguage: "en",
    supportedLanguages: ["en", "es", "ar", "hi", "ur", "zh"],
    roles: {
      ADMIN: "admin",
      SUPERVISOR: "supervisor",
      EMPLOYEE: "employee"
    },
    operationStatuses: [
      "Created",
      "Assigned",
      "Pending",
      "In Progress",
      "Submitted",
      "Approved",
      "Rejected",
      "Cancelled",
      "Overdue"
    ],
    isProduction: window.location.protocol === "https:"
  });
})();