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
        
        const topbarAvatar =
    document.getElementById("topbar-avatar");

const topbarUserName =
    document.getElementById("topbar-user-name");

const globalProfileName =
    document.getElementById("global-profile-name");

const globalProfileRole =
    document.getElementById("global-profile-role");

if (topbarAvatar) {
    topbarAvatar.textContent =
        name.charAt(0).toUpperCase();
}

if (topbarUserName) {
    topbarUserName.textContent =
        name;
}

if (globalProfileName) {
    globalProfileName.textContent =
        name;
}

if (globalProfileRole) {
    globalProfileRole.textContent =
        role;
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


function renderHome() {

    const pageView = document.getElementById("page-view");

    if (!pageView) {
        return;
    }

    const user = CleanTrack.currentUser || {};

    const name = user.name || "User";

    const initials =
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("") || "U";


    pageView.innerHTML = `

        <section class="cleantrack-home">

           


            <div class="home-content">

                <div class="home-welcome">

                    <div class="home-label">
                        HOME
                    </div>

                    <h1>
                        Welcome, ${escapeHtml(name)}
                    </h1>

                    <p id="home-welcome-subtitle">
                        Loading organization...
                    </p>

                </div>


                <section class="home-section">

                    <div class="home-section-title">
                        ORGANIZATION DETAILS
                    </div>


                    <div class="home-organization">

                        <div class="home-organization-main">

                            <div class="home-organization-symbol">
                                ORG
                            </div>

                            <div>

                                <h2 id="home-organization-name">
                                    —
                                </h2>

                                <p>
                                    Your active CleanTrack organization
                                </p>

                            </div>

                        </div>


                        <div class="home-active-status">
                            <span></span>
                            Active
                        </div>

                    </div>


                    <div class="home-detail-grid">

                        <button
                            type="button"
                            class="home-detail-card"
                            data-home-page="staff"
                        >

                            <span>
                                ACTIVE STAFF
                            </span>

                            <strong id="home-staff-count">
                                —
                            </strong>

                            <small>
                                Staff members
                            </small>

                        </button>


                        <button
                            type="button"
                            class="home-detail-card"
                            data-home-page="teams"
                        >

                            <span>
                                TEAMS
                            </span>

                            <strong id="home-team-count">
                                —
                            </strong>

                            <small>
                                Organization teams
                            </small>

                        </button>


                        <button
                            type="button"
                            class="home-detail-card"
                            data-home-page="locations"
                        >

                            <span>
                                LOCATIONS
                            </span>

                            <strong id="home-location-count">
                                —
                            </strong>

                            <small>
                                Managed locations
                            </small>

                        </button>


                        <button
                            type="button"
                            class="home-detail-card"
                            data-home-page="zones"
                        >

                            <span>
                                ZONES
                            </span>

                            <strong id="home-zone-count">
                                —
                            </strong>

                            <small>
                                Operational zones
                            </small>

                        </button>

                    </div>

                </section>


                <section class="home-section">

                    <div class="home-section-title">
                        ORGANIZATION SETTINGS
                    </div>


                    <div class="home-settings-grid">

                        <button
                            type="button"
                            class="home-settings-card"
                            data-home-page="profile"
                        >

                            <div class="home-card-icon">
                                ORG
                            </div>

                            <div>

                                <strong>
                                    Organization profile
                                </strong>

                                <span>
                                    Manage organization information
                                </span>

                            </div>

                            <em>
                                →
                            </em>

                        </button>


                        <button
                            type="button"
                            class="home-settings-card"
                            data-home-page="teams"
                        >

                            <div class="home-card-icon">
                                TM
                            </div>

                            <div>

                                <strong>
                                    Teams & roles
                                </strong>

                                <span>
                                    Manage organizational structure
                                </span>

                            </div>

                            <em>
                                →
                            </em>

                        </button>


                        <button
                            type="button"
                            class="home-settings-card"
                            data-home-page="settings"
                        >

                            <div class="home-card-icon">
                                ST
                            </div>

                            <div>

                                <strong>
                                    Access & permissions
                                </strong>

                                <span>
                                    Manage access and account controls
                                </span>

                            </div>

                            <em>
                                →
                            </em>

                        </button>

                    </div>

                </section>


                <section class="home-section">

                    <div class="home-section-title">
                        OVERVIEW
                    </div>


                    <div class="home-overview-grid">

                        <button
                            type="button"
                            class="home-overview-card"
                            data-home-page="staff"
                        >

                            <div class="home-overview-icon">
                                ST
                            </div>

                            <div>
                                <strong>
                                    Staff
                                </strong>

                                <span>
                                    Manage employees and supervisors
                                </span>
                            </div>

                            <em>
                                →
                            </em>

                        </button>


                        <button
                            type="button"
                            class="home-overview-card"
                            data-home-page="locations"
                        >

                            <div class="home-overview-icon">
                                LO
                            </div>

                            <div>
                                <strong>
                                    Locations
                                </strong>

                                <span>
                                    Manage facilities and zones
                                </span>
                            </div>

                            <em>
                                →
                            </em>

                        </button>


                        <button
                            type="button"
                            class="home-overview-card"
                            data-home-page="dashboard"
                        >

                            <div class="home-overview-icon">
                                OP
                            </div>

                            <div>
                                <strong>
                                    Operations
                                </strong>

                                <span>
                                    Open your operational Dashboard
                                </span>
                            </div>

                            <em>
                                →
                            </em>

                        </button>

                    </div>

                </section>


                <section class="home-section">

                    <div class="home-section-title">
                        ORGANIZATION CODE
                    </div>


                    <div class="home-code">

                        <div>

                            <strong id="home-organization-code">
                                —
                            </strong>

                            <span>
                                Share this code with people joining
                                your organization.
                            </span>

                        </div>


                        <button
                            type="button"
                            id="home-copy-code"
                        >
                            Copy
                        </button>

                    </div>

                </section>


                <section class="home-help">

                    <div class="home-help-main">

                        <div class="home-help-icon">
                            ?
                        </div>

                        <div>

                            <strong>
                                Need help?
                            </strong>

                            <p>
                                Find answers, learn CleanTrack,
                                or contact support.
                            </p>

                        </div>

                    </div>


                    <div class="home-help-actions">

                        <button
                            type="button"
                            id="home-help-center"
                        >
                            Help Center
                        </button>

                        <button
                            type="button"
                            id="home-admin-guide"
                        >
                            Admin Guide
                        </button>

                        <button
                            type="button"
                            id="home-support"
                        >
                            Contact Support
                        </button>

                    </div>

                </section>

            </div>


            <div
                id="home-ai-panel"
                class="home-ai-panel"
                hidden
            >

                <div class="home-ai-panel-header">

                    <div>
                        <span>✦ CleanTrack AI</span>
                        <strong>AI Help</strong>
                    </div>

                    <button
                        type="button"
                        id="home-ai-close"
                    >
                        ×
                    </button>

                </div>


                <p>
                    Ask CleanTrack for guidance about
                    your workspace, features, or setup.
                </p>


                <input
                    type="text"
                    id="home-ai-input"
                    placeholder="Ask CleanTrack AI..."
                    autocomplete="off"
                />

            </div>

        </section>
    `;


    loadHomeData();


    /* =====================================================
       INTERNAL HOME NAVIGATION
       ===================================================== */

    pageView
        .querySelectorAll("[data-home-page]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.homePage;

                    loadPage(page);

                }
            );

        });


    /* =====================================================
       ORGANIZATION CODE
       ===================================================== */

    document
        .getElementById(
            "home-copy-code"
        )
        .addEventListener(
            "click",
            async () => {

                const code =
                    document
                        .getElementById(
                            "home-organization-code"
                        )
                        .textContent
                        .trim();


                if (!code || code === "—") {
                    return;
                }


                try {

                    await navigator.clipboard.writeText(
                        code
                    );


                    const button =
                        document.getElementById(
                            "home-copy-code"
                        );

                    button.textContent =
                        "Copied";


                    setTimeout(
                        () => {
                            button.textContent =
                                "Copy";
                        },
                        1500
                    );

                } catch (error) {

                    console.error(
                        "Copy failed:",
                        error
                    );

                }

            }
        );


    /* =====================================================
       HELP
       ===================================================== */

    document
        .getElementById(
            "home-help-center"
        )
        .addEventListener(
            "click",
            () => {

                const ai =
                    document.getElementById(
                        "home-ai-panel"
                    );

                ai.hidden = false;

                document
                    .getElementById(
                        "home-ai-input"
                    )
                    .focus();

            }
        );


    document
        .getElementById(
            "home-admin-guide"
        )
        .addEventListener(
            "click",
            () => {
                loadPage("settings");
            }
        );


    document
        .getElementById(
            "home-support"
        )
        .addEventListener(
            "click",
            () => {

                window.location.href =
                    "mailto:support@cleantrack.app";

            }
        );

}


async function loadHomeData() {

    try {

        const data =
            await CleanTrack.api.request(
                "/api/home/admin"
            );


        const organization =
            data.organization || {};

        const counts =
            data.counts || {};


        document.getElementById(
            "home-organization-name"
        ).textContent =
            organization.name || "—";


        document.getElementById(
            "home-welcome-subtitle"
        ).textContent =
            organization.name
                ? `${organization.name} · Administrator`
                : "Administrator";


        document.getElementById(
            "home-organization-code"
        ).textContent =
            organization.organization_code || "—";


        document.getElementById(
            "home-staff-count"
        ).textContent =
            counts.staff ?? 0;


        document.getElementById(
            "home-team-count"
        ).textContent =
            counts.teams ?? 0;


        document.getElementById(
            "home-location-count"
        ).textContent =
            counts.locations ?? 0;


        document.getElementById(
            "home-zone-count"
        ).textContent =
            counts.zones ?? 0;


    } catch (error) {

        console.error(
            "Home data loading error:",
            error
        );

    }

}
    
    function renderDashboard() {
    const pageView = document.getElementById("page-view");

    if (!pageView) {
        return;
    }

    pageView.innerHTML = `
        <section class="dashboard-page">

            <div class="dashboard-header">
                <div>
                    <div class="dashboard-eyebrow">
                        CLEANTRACK DASHBOARD
                    </div>

                    <h1 id="dashboard-greeting">
                        Welcome back
                    </h1>

                    <p id="dashboard-organization">
                        Your facility overview
                    </p>
                </div>

                <div class="dashboard-date" id="dashboard-date">
                    Loading...
                </div>
            </div>


            <div class="dashboard-kpi-grid">

                <article class="dashboard-kpi">
                    <span>ACTIVE ZONES</span>
                    <strong id="kpi-total-zones">—</strong>
                    <small>Total zones in your scope</small>
                </article>

                <article class="dashboard-kpi">
                    <span>CLEANED ZONES</span>
                    <strong id="kpi-cleaned-zones">—</strong>
                    <small>Currently marked cleaned</small>
                </article>

                <article class="dashboard-kpi">
                    <span>OVERDUE ZONES</span>
                    <strong id="kpi-overdue-zones">—</strong>
                    <small>Require attention</small>
                </article>

                <article class="dashboard-kpi">
                    <span>TASKS TODAY</span>
                    <strong id="kpi-tasks-today">—</strong>
                    <small>Total scheduled today</small>
                </article>

                <article class="dashboard-kpi">
                    <span>TASK COMPLETION</span>
                    <strong id="kpi-compliance">—</strong>
                    <small id="kpi-compliance-detail">
                        Completed today
                    </small>
                </article>

                <article class="dashboard-kpi">
                    <span>AVG CLEAN TIME</span>
                    <strong id="kpi-clean-time">—</strong>
                    <small>Completed tasks</small>
                </article>

            </div>


            <div class="dashboard-main-grid">

                <section class="dashboard-panel dashboard-task-panel">

                    <div class="dashboard-panel-header">
                        <div>
                            <span class="dashboard-panel-label">
                                TODAY
                            </span>

                            <h2>
                                Task overview
                            </h2>
                        </div>
                    </div>

                    <div class="task-overview">

                        <div class="task-progress-ring">
                            <div class="task-progress-inner">
                                <strong id="task-progress-value">
                                    —
                                </strong>
                                <span>
                                    completed
                                </span>
                            </div>
                        </div>

                        <div class="task-breakdown">

                            <div class="task-stat">
                                <span class="task-stat-dot completed"></span>
                                <div>
                                    <strong id="task-completed">—</strong>
                                    <span>Completed</span>
                                </div>
                            </div>

                            <div class="task-stat">
                                <span class="task-stat-dot pending"></span>
                                <div>
                                    <strong id="task-pending">—</strong>
                                    <span>Pending</span>
                                </div>
                            </div>

                            <div class="task-stat">
                                <span class="task-stat-dot missed"></span>
                                <div>
                                    <strong id="task-missed">—</strong>
                                    <span>Missed</span>
                                </div>
                            </div>

                        </div>

                    </div>

                </section>


                <section class="dashboard-panel">

                    <div class="dashboard-panel-header">
                        <div>
                            <span class="dashboard-panel-label">
                                ZONE STATUS
                            </span>

                            <h2>
                                Facility overview
                            </h2>
                        </div>
                    </div>

                    <div class="zone-status-list">

                        <div class="zone-status-row">
                            <span>
                                Cleaned
                            </span>
                            <strong id="zone-cleaned">—</strong>
                        </div>

                        <div class="zone-status-row">
                            <span>
                                In progress
                            </span>
                            <strong id="zone-progress">—</strong>
                        </div>

                        <div class="zone-status-row">
                            <span>
                                Pending
                            </span>
                            <strong id="zone-pending">—</strong>
                        </div>

                        <div class="zone-status-row">
                            <span>
                                Overdue
                            </span>
                            <strong id="zone-overdue">—</strong>
                        </div>

                    </div>

                </section>

            </div>


            <section class="dashboard-panel dashboard-alert-panel">

                <div class="dashboard-panel-header">

                    <div>
                        <span class="dashboard-panel-label">
                            ATTENTION
                        </span>

                        <h2>
                            Recent alerts
                        </h2>
                    </div>

                    <button
                        type="button"
                        class="dashboard-text-button"
                        id="dashboard-alerts-button"
                    >
                        View all
                    </button>

                </div>

                <div id="dashboard-alert-list">
                    <div class="dashboard-empty">
                        Loading alerts...
                    </div>
                </div>

            </section>


            <section class="dashboard-quick-actions">

                <button
                    type="button"
                    class="dashboard-action primary"
                    data-dashboard-action="tasks"
                >
                    Create Task
                </button>

                <button
                    type="button"
                    class="dashboard-action"
                    data-dashboard-action="staff"
                >
                    Manage Staff
                </button>

                <button
                    type="button"
                    class="dashboard-action"
                    data-dashboard-action="locations"
                >
                    Manage Locations
                </button>

                <button
                    type="button"
                    class="dashboard-action"
                    data-dashboard-action="reports"
                >
                    Export Report
                </button>

            </section>

        </section>
    `;


    const user = CleanTrack.currentUser || {};

    const name = user.name || "User";
    const organization =
        user.organization_name ||
        "CleanTrack workspace";

    document.getElementById(
        "dashboard-greeting"
    ).textContent = `Welcome back, ${name}`;

    document.getElementById(
        "dashboard-organization"
    ).textContent = organization;

    document.getElementById(
        "dashboard-date"
    ).textContent =
        new Date().toLocaleDateString(
            undefined,
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );


    loadDashboardData();
}

async function loadDashboardData() {

    try {

        const data =
            await CleanTrack.api.request(
                "/api/analytics/dashboard"
            );


        const zones = data.zones || {};
        const today = data.today || {};


        document.getElementById(
            "kpi-total-zones"
        ).textContent =
            zones.total ?? 0;


        document.getElementById(
            "kpi-cleaned-zones"
        ).textContent =
            zones.cleaned ?? 0;


        document.getElementById(
            "kpi-overdue-zones"
        ).textContent =
            zones.overdue ?? 0;


        document.getElementById(
            "kpi-tasks-today"
        ).textContent =
            today.total ?? 0;


        const compliance =
            today.compliance_pct ?? 0;

        document.getElementById(
            "kpi-compliance"
        ).textContent =
            `${compliance}%`;


        document.getElementById(
            "kpi-compliance-detail"
        ).textContent =
            `${today.completed ?? 0} of ${today.total ?? 0} completed`;


        document.getElementById(
            "kpi-clean-time"
        ).textContent =
            data.avg_cleaning_duration != null
                ? `${data.avg_cleaning_duration} min`
                : "—";


        document.getElementById(
            "task-progress-value"
        ).textContent =
            `${compliance}%`;


        document.getElementById(
            "task-completed"
        ).textContent =
            today.completed ?? 0;


        document.getElementById(
            "task-pending"
        ).textContent =
            today.pending ?? 0;


        document.getElementById(
            "task-missed"
        ).textContent =
            today.missed ?? 0;


        document.getElementById(
            "zone-cleaned"
        ).textContent =
            zones.cleaned ?? 0;


        document.getElementById(
            "zone-progress"
        ).textContent =
            zones.in_progress ?? 0;


        document.getElementById(
            "zone-pending"
        ).textContent =
            zones.pending ?? 0;


        document.getElementById(
            "zone-overdue"
        ).textContent =
            zones.overdue ?? 0;


        renderDashboardAlerts(
            data.recent_alerts || []
        );


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        const alertList =
            document.getElementById(
                "dashboard-alert-list"
            );

        if (alertList) {
            alertList.innerHTML = `
                <div class="dashboard-empty">
                    Unable to load dashboard data.
                </div>
            `;
        }
    }
}

function renderDashboardAlerts(alerts) {

    const container =
        document.getElementById(
            "dashboard-alert-list"
        );

    if (!container) {
        return;
    }


    if (!alerts.length) {

        container.innerHTML = `
            <div class="dashboard-empty">
                No unresolved alerts.
            </div>
        `;

        return;
    }


    container.innerHTML =
        alerts
            .slice(0, 5)
            .map(alert => {

                const title =
                    alert.title ||
                    alert.message ||
                    "CleanTrack alert";

                const zone =
                    alert.zone_name ||
                    "General";

                const type =
                    alert.type ||
                    "attention";

                return `
                    <div class="dashboard-alert">

                        <div class="dashboard-alert-indicator ${type}">
                        </div>

                        <div class="dashboard-alert-content">

                            <strong>
                                ${escapeHtml(title)}
                            </strong>

                            <span>
                                ${escapeHtml(zone)}
                            </span>

                        </div>

                    </div>
                `;

            })
            .join("");
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
    
    function setupGlobalHeader() {

    const searchInput =
        document.getElementById("global-search-input");

    const notificationButton =
        document.getElementById("notification-button");

    const aiButton =
        document.getElementById("ai-help-button");

    const profileButton =
        document.getElementById("profile-button");

    const profileMenu =
        document.getElementById("global-profile-menu");


    /* ==============================================
       Search
       ============================================== */

    if (searchInput) {

        searchInput.addEventListener(
            "keydown",
            event => {

                if (event.key !== "Enter") {
                    return;
                }

                const query =
                    searchInput.value
                        .trim()
                        .toLowerCase();

                const routes = {

                    home: "home",
                    dashboard: "dashboard",

                    task: "tasks",
                    tasks: "tasks",

                    staff: "staff",

                    team: "teams",
                    teams: "teams",

                    zone: "zones",
                    zones: "zones",

                    location: "locations",
                    locations: "locations",

                    "cleaning log": "cleaning-logs",
                    "cleaning logs": "cleaning-logs",

                    analytics: "analytics",
                    reports: "reports",
                    alerts: "alerts",
                    profile: "profile",
                    settings: "settings"

                };

                const page =
                    routes[query];

                if (page) {

                    searchInput.value = "";

                    loadPage(page);

                    return;
                }

                searchInput.value = "";

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "/" &&
                    document.activeElement !== searchInput
                ) {

                    event.preventDefault();

                    searchInput.focus();

                }

            }
        );

    }


    /* ==============================================
       Notifications
       ============================================== */

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {
                loadPage("alerts");
            }
        );

    }


    /* ==============================================
       AI Help
       ============================================== */

    if (aiButton) {

        aiButton.addEventListener(
            "click",
            () => {

                let panel =
                    document.getElementById(
                        "global-ai-panel"
                    );


                if (!panel) {

                    panel =
                        document.createElement("aside");

                    panel.id =
                        "global-ai-panel";

                    panel.className =
                        "global-ai-panel";


                    panel.innerHTML = `
                        <div class="global-ai-header">

                            <div>
                                <span>✦ CleanTrack AI</span>
                                <strong>AI Help</strong>
                            </div>

                            <button
                                type="button"
                                id="global-ai-close"
                            >
                                ×
                            </button>

                        </div>

                        <p>
                            Ask CleanTrack about your workspace,
                            features, setup, or navigation.
                        </p>

                        <input
                            type="text"
                            id="global-ai-input"
                            placeholder="Ask CleanTrack AI..."
                            autocomplete="off"
                        />
                    `;

                    document.body.appendChild(panel);


                    document
                        .getElementById(
                            "global-ai-close"
                        )
                        .addEventListener(
                            "click",
                            () => {
                                panel.remove();
                            }
                        );

                } else {

                    panel.remove();

                }

            }
        );

    }


    /* ==============================================
       Profile menu
       ============================================== */

    if (
        profileButton &&
        profileMenu
    ) {

        profileButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                const open =
                    !profileMenu.classList.contains("hidden");

                profileMenu.classList.toggle(
                    "hidden",
                    open
                );

                profileButton.setAttribute(
                    "aria-expanded",
                    String(!open)
                );

            }
        );


        profileMenu
            .querySelectorAll(
                "[data-global-profile]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const action =
                            button.dataset.globalProfile;


                        profileMenu.classList.add(
                            "hidden"
                        );


                        profileButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );


                        if (action === "profile") {
                            loadPage("profile");
                        }


                        if (action === "settings") {
                            loadPage("settings");
                        }


                        if (
                            action === "logout" &&
                            CleanTrack.auth &&
                            typeof CleanTrack.auth.logout ===
                                "function"
                        ) {
                            CleanTrack.auth.logout();
                        }

                    }
                );

            });


        document.addEventListener(
            "click",
            event => {

                if (
                    !profileMenu.contains(event.target) &&
                    !profileButton.contains(event.target)
                ) {

                    profileMenu.classList.add(
                        "hidden"
                    );

                    profileButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

    }

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

    const pageHeaders = {
        home: {
            title: "Home",
            subtitle: "CleanTrack"
        },

        dashboard: {
            title: "Dashboard",
            subtitle: "Operations"
        },

        profile: {
            title: "My Profile",
            subtitle: "Account"
        },

        settings: {
            title: "Settings",
            subtitle: "CleanTrack"
        },

        tasks: {
            title: "Tasks",
            subtitle: "Work management"
        },

        staff: {
            title: "Staff",
            subtitle: "People management"
        },

        teams: {
            title: "Teams",
            subtitle: "Organization"
        },

        zones: {
            title: "Zones",
            subtitle: "Operations"
        },

        locations: {
            title: "Locations",
            subtitle: "Facilities"
        },

        "cleaning-logs": {
            title: "Cleaning Logs",
            subtitle: "History"
        },

        analytics: {
            title: "Analytics",
            subtitle: "Performance"
        },

        reports: {
            title: "Reports",
            subtitle: "Reporting"
        },

        alerts: {
            title: "Alerts",
            subtitle: "Notifications"
        }
    };

    const header =
        pageHeaders[page] || {
            title: "CleanTrack",
            subtitle: "Workspace"
        };

    setPageHeader(
        header.title,
        header.subtitle
    );


    if (page === "home") {
        renderHome();
        return;
    }

    if (page === "dashboard") {
        renderDashboard();
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

    setupGlobalHeader();

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