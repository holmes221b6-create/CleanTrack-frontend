// ============================================================
// CleanTrack Authentication
// ============================================================

window.CleanTrack = window.CleanTrack || {};

CleanTrack.auth = (() => {

    let currentUser = null;


    // --------------------------------------------------------
    // Helpers
    // --------------------------------------------------------

    function getAuthContainer() {
        return document.getElementById("auth-container");
    }

    function getApplication() {
        return document.getElementById("application");
    }
function showAuth() {
    const authContainer = getAuthContainer();
    const application = getApplication();

    if (authContainer) {
        authContainer.classList.remove("hidden");
        authContainer.style.display = "block";
    }

    if (application) {
        application.classList.add("hidden");
        application.style.display = "none";
    }
}

function showApplication() {
    const authContainer = getAuthContainer();
    const application = getApplication();

    if (authContainer) {
        authContainer.classList.add("hidden");
        authContainer.style.display = "none";
    }

    if (application) {
        application.classList.remove("hidden");
        application.style.display = "block";
    }
}

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }


    function showError(message) {

        const element = document.getElementById("auth-error");

        if (!element) {
            alert(message);
            return;
        }

        element.textContent = message;
        element.hidden = false;
    }


    function clearError() {

        const element = document.getElementById("auth-error");

        if (element) {
            element.textContent = "";
            element.hidden = true;
        }
    }


    function setLoading(button, loading, normalText) {

        if (!button) return;

        button.disabled = loading;

        if (loading) {
            button.innerHTML =
                '<span class="auth-spinner"></span> Please wait...';
        } else {
            button.textContent = normalText;
        }
    }


    // --------------------------------------------------------
    // Render Authentication
    // --------------------------------------------------------

    function renderLogin() {

        const container = getAuthContainer();

        if (!container) return;

        container.innerHTML = `
            <div class="auth-page">

                <div class="auth-brand">
                    <div class="auth-logo">CT</div>

                    <div>
                        <div class="auth-brand-name">CleanTrack</div>
                        <div class="auth-brand-subtitle">
                            Facility Hygiene Management
                        </div>
                    </div>
                </div>

                <div class="auth-card">

                    <div class="auth-card-header">
                        <h1>Welcome back</h1>
                        <p>Sign in to your CleanTrack account.</p>
                    </div>

                    <div id="auth-error"
                         class="auth-error"
                         hidden>
                    </div>

                    <form id="login-form" class="auth-form">

                        <div class="form-group">
                            <label for="login-email">
                                Email
                            </label>

                            <input
                                id="login-email"
                                type="email"
                                autocomplete="email"
                                placeholder="you@example.com"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="login-password">
                                Password
                            </label>

                            <input
                                id="login-password"
                                type="password"
                                autocomplete="current-password"
                                placeholder="Enter your password"
                                required
                            >
                        </div>

                        <button
                            id="login-button"
                            class="button button-primary auth-submit"
                            type="submit"
                        >
                            Login
                        </button>

                    </form>

                    <div class="auth-switch">
                        <span>Don't have an account?</span>

                        <button
                            id="show-register-button"
                            class="auth-link"
                            type="button"
                        >
                            Create Account
                        </button>
                    </div>

                </div>

            </div>
        `;

        document
            .getElementById("login-form")
            .addEventListener("submit", handleLogin);

        document
            .getElementById("show-register-button")
            .addEventListener("click", renderRegister);
    }


    // --------------------------------------------------------
    // Registration
    // --------------------------------------------------------

    function renderRegister() {

        const container = getAuthContainer();

        if (!container) return;

        container.innerHTML = `
            <div class="auth-page">

                <div class="auth-brand">
                    <div class="auth-logo">CT</div>

                    <div>
                        <div class="auth-brand-name">CleanTrack</div>
                        <div class="auth-brand-subtitle">
                            Facility Hygiene Management
                        </div>
                    </div>
                </div>

                <div class="auth-card auth-card-register">

                    <div class="auth-card-header">
                        <h1>Create Account</h1>
                        <p>
                            Create your CleanTrack account.
                        </p>
                    </div>

                    <div id="auth-error"
                         class="auth-error"
                         hidden>
                    </div>

                    <form id="register-form" class="auth-form">

                        <div class="form-group">
                            <label for="register-name">
                                Full Name
                            </label>

                            <input
                                id="register-name"
                                type="text"
                                placeholder="Your full name"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="register-email">
                                Email
                            </label>

                            <input
                                id="register-email"
                                type="email"
                                placeholder="you@example.com"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="register-password">
                                Password
                            </label>

                            <input
                                id="register-password"
                                type="password"
                                placeholder="Create a password"
                                minlength="6"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="register-role">
                                Account Type
                            </label>

                            <select id="register-role" required>

                                <option value="">
                                    Select account type
                                </option>

                                <option value="admin">
                                    Admin
                                </option>

                                <option value="supervisor">
                                    Supervisor
                                </option>

                                <option value="employee">
                                    Employee
                                </option>

                            </select>
                        </div>

                        <div
                            id="organization-name-group"
                            class="form-group"
                            hidden
                        >
                            <label for="organization-name">
                                Organization Name
                            </label>

                            <input
                                id="organization-name"
                                type="text"
                                placeholder="Your facility or organization"
                            >
                        </div>

                        <div
                            id="organization-code-group"
                            class="form-group"
                            hidden
                        >
                            <label for="organization-code">
                                Organization Code
                            </label>

                            <input
                                id="organization-code"
                                type="text"
                                placeholder="Example: CT-12345678"
                            >
                        </div>

                        <div
                            id="employee-id-group"
                            class="form-group"
                            hidden
                        >
                            <label for="employee-id">
                                Employee ID
                            </label>

                            <input
                                id="employee-id"
                                type="text"
                                placeholder="Optional employee ID"
                            >
                        </div>

                        <button
                            id="register-button"
                            class="button button-primary auth-submit"
                            type="submit"
                        >
                            Create Account
                        </button>

                    </form>

                    <div class="auth-switch">
                        <span>Already have an account?</span>

                        <button
                            id="show-login-button"
                            class="auth-link"
                            type="button"
                        >
                            Login
                        </button>
                    </div>

                </div>

            </div>
        `;

        const roleSelect =
            document.getElementById("register-role");

        roleSelect.addEventListener(
            "change",
            updateRegistrationFields
        );
        updateRegistrationFields();
        

        document
            .getElementById("register-form")
            .addEventListener(
                "submit",
                handleRegister
            );

        document
            .getElementById("show-login-button")
            .addEventListener(
                "click",
                renderLogin
            );
    }
function updateRegistrationFields() {
    const role = document.getElementById("register-role").value;

    const organizationName =
        document.getElementById("organization-name-group");

    const organizationCode =
        document.getElementById("organization-code-group");

    const employeeId =
        document.getElementById("employee-id-group");

    const showOrganizationName = role === "admin";
    const showOrganizationCode =
        role === "supervisor" || role === "employee";
    const showEmployeeId = role === "employee";

    organizationName.hidden = !showOrganizationName;
    organizationCode.hidden = !showOrganizationCode;
    employeeId.hidden = !showEmployeeId;
}

    // --------------------------------------------------------
    // Login
    // --------------------------------------------------------

    async function handleLogin(event) {

        event.preventDefault();

        clearError();

        const email =
            document.getElementById("login-email")
                .value
                .trim();

        const password =
            document.getElementById("login-password")
                .value;

        const button =
            document.getElementById("login-button");

        setLoading(button, true, "Login");

        try {

            const data =
                await CleanTrack.api.request(
                    "/api/auth/login",
                    {
                        method: "POST",

                        body: {
                            email,
                            password
                        }
                    }
                );

            if (!data || !data.token) {
                throw new Error(
                    "Login succeeded but the server did not return a token."
                );
            }

            CleanTrack.api.setToken(data.token);

            await loadCurrentUser();

        } catch (error) {

            console.error(
                "CleanTrack login error:",
                error
            );

            showError(
                error.message ||
                "Unable to log in."
            );

            setLoading(button, false, "Login");
        }
    }


    // --------------------------------------------------------
    // Registration
    // --------------------------------------------------------

    async function handleRegister(event) {

        event.preventDefault();

        clearError();

        const name =
            document.getElementById("register-name")
                .value
                .trim();

        const email =
            document.getElementById("register-email")
                .value
                .trim();

        const password =
            document.getElementById("register-password")
                .value;

        const role =
            document.getElementById("register-role")
                .value;

        const organizationName =
            document.getElementById("organization-name")
                .value
                .trim();

        const organizationCode =
            document.getElementById("organization-code")
                .value
                .trim();

        const employeeId =
            document.getElementById("employee-id")
                .value
                .trim();

        if (!role) {
            showError("Please select an account type.");
            return;
        }

        const body = {
            name,
            email,
            password,
            role
        };

        if (role === "admin") {
            body.organization_name =
                organizationName;
        }

        if (
            role === "supervisor" ||
            role === "employee"
        ) {
            body.organization_code =
                organizationCode;
        }

        if (role === "employee" && employeeId) {
            body.employee_id = employeeId;
        }

        const button =
            document.getElementById("register-button");

        setLoading(
            button,
            true,
            "Create Account"
        );

        try {

            const data =
                await CleanTrack.api.request(
                    "/api/auth/register",
                    {
                        method: "POST",
                        body
                    }
                );

            /*
             * Admin registration normally activates
             * immediately and returns a JWT.
             */

            if (data && data.token) {

                CleanTrack.api.setToken(
                    data.token
                );

                await loadCurrentUser();

                return;
            }


            /*
             * Supervisor / Employee accounts
             * may remain pending until approved.
             */

            renderPendingRegistration(
                data &&
                (
                    data.message ||
                    data.error
                )
            );

        } catch (error) {

            console.error(
                "CleanTrack registration error:",
                error
            );

            showError(
                error.message ||
                "Unable to create the account."
            );

            setLoading(
                button,
                false,
                "Create Account"
            );
        }
    }


    // --------------------------------------------------------
    // Pending Registration
    // --------------------------------------------------------

    function renderPendingRegistration(message) {

        const container =
            getAuthContainer();

        container.innerHTML = `
            <div class="auth-page">

                <div class="auth-brand">
                    <div class="auth-logo">CT</div>

                    <div>
                        <div class="auth-brand-name">
                            CleanTrack
                        </div>

                        <div class="auth-brand-subtitle">
                            Facility Hygiene Management
                        </div>
                    </div>
                </div>

                <div class="auth-card">

                    <div class="auth-status-icon">
                        ✓
                    </div>

                    <div class="auth-card-header">
                        <h1>Account Request Submitted</h1>

                        <p>
                            ${
                                escapeHtml(
                                    message ||
                                    "Your account is waiting for administrator approval."
                                )
                            }
                        </p>
                    </div>

                    <button
                        id="pending-login-button"
                        class="button button-primary auth-submit"
                        type="button"
                    >
                        Return to Login
                    </button>

                </div>

            </div>
        `;

        document
            .getElementById("pending-login-button")
            .addEventListener(
                "click",
                renderLogin
            );
    }


    // --------------------------------------------------------
    // Current User
    // --------------------------------------------------------

    async function loadCurrentUser() {

        try {

            const data =
                await CleanTrack.api.request(
                    "/api/auth/me"
                );

            currentUser =
                data.user || data;

            /*
             * Expose current user for the rest
             * of the frontend.
             */

            CleanTrack.currentUser =
                currentUser;

            showApplication();

            window.dispatchEvent(
                new CustomEvent(
                    "cleantrack:authenticated",
                    {
                        detail: currentUser
                    }
                )
            );

        } catch (error) {

            console.error(
                "Unable to load current user:",
                error
            );

            logout(false);

            renderLogin();
        }
    }


    // --------------------------------------------------------
    // Session Initialization
    // --------------------------------------------------------

    async function initialize() {

        const token =
            CleanTrack.api.getToken();

        if (!token) {

            showAuth();
            renderLogin();

            return false;
        }

        try {

            await loadCurrentUser();

            return true;

        } catch {

            showAuth();
            renderLogin();

            return false;
        }
    }


    // --------------------------------------------------------
    // Logout
    // --------------------------------------------------------

    function logout(render = true) {

        CleanTrack.api.clearToken();

        currentUser = null;
        CleanTrack.currentUser = null;

        showAuth();

        if (render) {
            renderLogin();
        }
    }


    // --------------------------------------------------------
    // Unauthorized Event
    // --------------------------------------------------------

    window.addEventListener(
        "cleantrack:unauthorized",
        () => {
            logout(true);
        }
    );


    // --------------------------------------------------------
    // Public API
    // --------------------------------------------------------

    return {

        initialize,
        login: handleLogin,
        logout,

        getUser() {
            return currentUser;
        },

        isAuthenticated() {
            return !!CleanTrack.api.getToken();
        }

    };

})();
