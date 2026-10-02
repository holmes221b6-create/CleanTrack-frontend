// ============================================================
// CleanTrack Application
// ============================================================

window.CleanTrack = window.CleanTrack || {};

CleanTrack.app = (() => {

    function getUser() {
        return CleanTrack.currentUser || {};
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // --------------------------------------------------------
    // Common application UI
    // --------------------------------------------------------

    function updateUserInterface() {

        const user = getUser();

        const name =
            user.name || "User";

        const role =
            String(user.role || "user").toUpperCase();

        const organization =
            user.organization_name || "Organization";


        const userName =
            document.getElementById("user-name");

        const userRole =
            document.getElementById("user-role");

        const userAvatar =
            document.getElementById("user-avatar");

        const organizationName =
            document.getElementById("organization-name");

        if (userName) {
            userName.textContent = name;
        }

        if (userRole) {
            userRole.textContent = role;
        }

        if (userAvatar) {
            userAvatar.textContent =
                name.charAt(0).toUpperCase();
        }

        if (organizationName) {
            organizationName.textContent =
                organization;
        }
    }


    // --------------------------------------------------------
    // Header
    // --------------------------------------------------------

    function setPageHeader(title, subtitle) {

        const titleElement =
            document.getElementById("topbar-title");

        const subtitleElement =
            document.getElementById("topbar-subtitle");

        if (titleElement) {
            titleElement.textContent = title;
        }

        if (subtitleElement) {
            subtitleElement.textContent = subtitle;
        }
    }


    // --------------------------------------------------------
    // HOME
    // --------------------------------------------------------

    function renderHome() {

        const user = getUser();

        const name =
            user.name || "User";

        const organization =
            user.organization_name ||
            "Organization";

        const role =
            String(user.role || "user").toUpperCase();

        const view =
            document.getElementById("page-view");

        if (!view) {
            console.error(
                "CleanTrack: #page-view not found."
            );
            return;
        }

        setPageHeader(
            "Home",
            "Your CleanTrack workspace"
        );


        view.innerHTML = `
            <section class="home-page">

                <div class="home-hero">

                    <div class="home-hero-content">

                        <div class="home-eyebrow">
                            <span class="home-status-dot"></span>
                            CLEANTRACK WORKSPACE
                        </div>

                        <h1>
                            Welcome, ${escapeHtml(name)}
                        </h1>

                        <p>
                            ${escapeHtml(organization)}
                        </p>

                    </div>

                    <div class="home-role-badge">
                        ${escapeHtml(role)}
                    </div>

                </div>


                <div class="home-grid">

                    <div class="home-card">

                        <div class="home-card-label">
                            ORGANIZATION
                        </div>

                        <div class="home-card-value">
                            ${escapeHtml(organization)}
                        </div>

                        <div class="home-card-sub">
                            Your active CleanTrack workspace
                        </div>

                    </div>


                    <div class="home-card">

                        <div class="home-card-label">
                            ACCOUNT
                        </div>

                        <div class="home-card-value">
                            ${escapeHtml(
                                role.charAt(0) +
                                role.slice(1).toLowerCase()
                            )}
                        </div>

                        <div class="home-card-sub">
                            Active account
                        </div>

                    </div>

                </div>


                <div class="home-section">

                    <div class="home-section-heading">

                        <div class="home-eyebrow">
                            QUICK ACCESS
                        </div>

                        <h2>
                            Your workspace
                        </h2>

                    </div>


                    <div class="home-actions">

                        <button
                            type="button"
                            class="home-action-card"
                            data-home-page="dashboard"
                        >
                            <span class="home-action-icon">
                                ◈
                            </span>

                            <span>
                                <strong>
                                    Dashboard
                                </strong>

                                <small>
                                    View your operational overview
                                </small>
                            </span>
                        </button>


                        <button
                            type="button"
                            class="home-action-card"
                            data-home-page="profile"
                        >
                            <span class="home-action-icon">
                                ◉
                            </span>

                            <span>
                                <strong>
                                    Profile
                                </strong>

                                <small>
                                    View your account information
                                </small>
                            </span>
                        </button>

                    </div>

                </div>

            </section>
        `;


        view
            .querySelectorAll("[data-home-page]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        loadPage(
                            button.dataset.homePage
                        );

                    }
                );

            });
    }


    // --------------------------------------------------------
    // PROFILE
    // --------------------------------------------------------

    function renderProfile() {

        const user = getUser();

        const view =
            document.getElementById("page-view");

        if (!view) {
            return;
        }

        const name =
            user.name || "User";

        const email =
            user.email || "—";

        const organization =
            user.organization_name || "—";

        const role =
            String(user.role || "user").toUpperCase();

        const status =
            user.account_status || "active";


        setPageHeader(
            "Profile",
            "Your account information"
        );


        view.innerHTML = `
            <section class="profile-page">

                <div class="profile-hero">

                    <div class="profile-avatar-large">
                        ${escapeHtml(
                            name.charAt(0).toUpperCase()
                        )}
                    </div>

                    <div>

                        <div class="home-eyebrow">
                            ACCOUNT PROFILE
                        </div>

                        <h1>
                            ${escapeHtml(name)}
                        </h1>

                        <p>
                            ${escapeHtml(role)}
                        </p>

                    </div>

                </div>


                <div class="profile-grid">

                    <div class="profile-card">
                        <span>EMAIL</span>
                        <strong>
                            ${escapeHtml(email)}
                        </strong>
                    </div>

                    <div class="profile-card">
                        <span>ORGANIZATION</span>
                        <strong>
                            ${escapeHtml(organization)}
                        </strong>
                    </div>

                    <div class="profile-card">
                        <span>ROLE</span>
                        <strong>
                            ${escapeHtml(role)}
                        </strong>
                    </div>

                    <div class="profile-card">
                        <span>ACCOUNT STATUS</span>
                        <strong>
                            ${escapeHtml(status)}
                        </strong>
                    </div>

                </div>

            </section>
        `;
    }


    // --------------------------------------------------------
    // Other pages — temporary placeholders
    // --------------------------------------------------------

    function renderPlaceholder(page) {

        const view =
            document.getElementById("page-view");

        if (!view) {
            return;
        }

        const labels = {
            dashboard: "Dashboard",
            tasks: "Tasks",
            staff: "Staff",
            teams: "Teams",
            zones: "Zones",
            locations: "Locations",
            logs: "Cleaning Logs",
            analytics: "Analytics",
            reports: "Reports",
            alerts: "Alerts",
            team: "My Team",
            activity: "My Activity",
            performance: "My Performance"
        };

        const label =
            labels[page] || page;


        setPageHeader(
            label,
            "CleanTrack workspace"
        );


        view.innerHTML = `
            <section class="page-placeholder">

                <div class="page-placeholder-icon">
                    ◫
                </div>

                <h1>
                    ${escapeHtml(label)}
                </h1>

                <p>
                    This section will be built next.
                </p>

            </section>
        `;
    }


    // --------------------------------------------------------
    // Router
    // --------------------------------------------------------

    function loadPage(page) {

        if (CleanTrack.navigation) {
            CleanTrack.navigation.setActive(page);
        }

        if (page === "home") {
            renderHome();
            return;
        }

        if (page === "profile") {
            renderProfile();
            return;
        }

        renderPlaceholder(page);
    }


    // --------------------------------------------------------
    // Application initialization
    // --------------------------------------------------------

    function initializeApplication() {

        console.log(
            "CleanTrack: Initializing application..."
        );

        updateUserInterface();

        if (CleanTrack.navigation) {
            CleanTrack.navigation.render();
        }

        loadPage("home");
    }


    return {
        initializeApplication,
        loadPage,
        renderHome,
        renderProfile
    };

})();


// ============================================================
// Bootstrap
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "CleanTrack starting..."
        );

        try {

            await CleanTrack.auth.initialize();

            console.log(
                "CleanTrack initialized."
            );

        } catch (error) {

            console.error(
                "CleanTrack initialization failed:",
                error
            );

        }

        const logoutButton =
            document.getElementById("logout-button");

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                () => {
                    CleanTrack.auth.logout();
                }
            );
        }

    }
);


// ============================================================
// Authenticated application
// ============================================================

window.addEventListener(
    "cleantrack:authenticated",
    () => {

        if (
            CleanTrack.app &&
            typeof CleanTrack.app.initializeApplication ===
                "function"
        ) {
            CleanTrack.app.initializeApplication();
        }

    }
);