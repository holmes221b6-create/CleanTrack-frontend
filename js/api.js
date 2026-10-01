// ============================================================
// CleanTrack API Client
// ============================================================

window.CleanTrack = window.CleanTrack || {};

CleanTrack.api = (() => {

    // --------------------------------------------------------
    // Configuration
    // --------------------------------------------------------

    const API_BASE = "https://cleantrack-1tv6.onrender.com";

    const TOKEN_KEY = "cleantrack_token";


    // --------------------------------------------------------
    // Token Management
    // --------------------------------------------------------

    function getAuthToken() {
        return localStorage.getItem(TOKEN_KEY);
    }


    function setAuthToken(token) {
        if (!token) {
            console.warn("CleanTrack: Attempted to store empty token.");
            return;
        }

        localStorage.setItem(TOKEN_KEY, token);
    }


    function clearAuthToken() {
        localStorage.removeItem(TOKEN_KEY);
    }


    // --------------------------------------------------------
    // Build Request URL
    // --------------------------------------------------------

    function buildUrl(endpoint) {

        if (!endpoint) {
            throw new Error("API endpoint is required.");
        }

        // Allow full URLs if ever needed.
        if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
            return endpoint;
        }

        // Make sure endpoint begins with /
        if (!endpoint.startsWith("/")) {
            endpoint = "/" + endpoint;
        }

        return API_BASE + endpoint;
    }


    // --------------------------------------------------------
    // Main API Request
    // --------------------------------------------------------

    async function request(endpoint, options = {}) {

        const url = buildUrl(endpoint);

        const token = getAuthToken();

        const method = (options.method || "GET").toUpperCase();

        const headers = {
            ...(options.headers || {})
        };


        // ----------------------------------------------------
        // Authentication
        // ----------------------------------------------------

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }


        // ----------------------------------------------------
        // JSON Content Type
        // ----------------------------------------------------

        const hasBody = options.body !== undefined && options.body !== null;

        if (
            hasBody &&
            !(options.body instanceof FormData) &&
            !(options.body instanceof Blob)
        ) {
            headers["Content-Type"] = "application/json";
        }


        // ----------------------------------------------------
        // Prepare Request
        // ----------------------------------------------------

        const requestOptions = {
            ...options,
            method,
            headers
        };


        // Automatically convert normal JavaScript objects
        // into JSON.

        if (
            hasBody &&
            typeof options.body === "object" &&
            !(options.body instanceof FormData) &&
            !(options.body instanceof Blob) &&
            !(options.body instanceof ArrayBuffer)
        ) {
            requestOptions.body = JSON.stringify(options.body);
        }


        // ----------------------------------------------------
        // Send Request
        // ----------------------------------------------------

        let response;

        try {

            response = await fetch(url, requestOptions);

        } catch (error) {

            console.error("CleanTrack API network error:", error);

            throw new Error(
                "Unable to connect to the CleanTrack server. " +
                "Check your internet connection or try again."
            );
        }


        // ----------------------------------------------------
        // Handle Unauthorized
        // ----------------------------------------------------

        if (response.status === 401) {

            clearAuthToken();

            window.dispatchEvent(
                new CustomEvent("cleantrack:unauthorized")
            );

            throw new Error(
                "Your session has expired. Please log in again."
            );
        }


        // ----------------------------------------------------
        // Read Response
        // ----------------------------------------------------

        const contentType =
            response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {

            try {
                data = await response.json();
            } catch {
                data = null;
            }

        } else {

            try {
                data = await response.text();
            } catch {
                data = null;
            }
        }


        // ----------------------------------------------------
        // Handle HTTP Errors
        // ----------------------------------------------------

        if (!response.ok) {

            let message = "An unexpected server error occurred.";

            if (data) {

                if (typeof data === "object") {

                    message =
                        data.error ||
                        data.message ||
                        data.detail ||
                        message;

                } else if (typeof data === "string" && data.trim()) {

                    message = data;
                }
            }

            const error = new Error(message);

            error.status = response.status;
            error.data = data;

            throw error;
        }


        // ----------------------------------------------------
        // Return Successful Response
        // ----------------------------------------------------

        return data;
    }


    // --------------------------------------------------------
    // Blob / File Request
    // --------------------------------------------------------

    async function requestBlob(endpoint, options = {}) {

        const url = buildUrl(endpoint);

        const token = getAuthToken();

        const headers = {
            ...(options.headers || {})
        };


        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }


        let response;

        try {

            response = await fetch(url, {
                ...options,
                headers
            });

        } catch (error) {

            console.error(
                "CleanTrack API file request error:",
                error
            );

            throw new Error(
                "Unable to connect to the CleanTrack server."
            );
        }


        if (response.status === 401) {

            clearAuthToken();

            window.dispatchEvent(
                new CustomEvent("cleantrack:unauthorized")
            );

            throw new Error(
                "Your session has expired. Please log in again."
            );
        }


        if (!response.ok) {

            let message = "Unable to download the requested file.";

            try {

                const contentType =
                    response.headers.get("content-type") || "";

                if (contentType.includes("application/json")) {

                    const data = await response.json();

                    message =
                        data.error ||
                        data.message ||
                        message;
                }

            } catch {
                // Keep default error message.
            }

            const error = new Error(message);

            error.status = response.status;

            throw error;
        }


        return await response.blob();
    }


    // --------------------------------------------------------
    // Public API
    // --------------------------------------------------------

    return {

        baseUrl: API_BASE,

        getToken: getAuthToken,
        setToken: setAuthToken,
        clearToken: clearAuthToken,

        request,
        requestBlob
    };

})();
