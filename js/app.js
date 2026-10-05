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


async function renderHome() {

    const pageView = document.getElementById("page-view");

    if (!pageView) {
        return;
    }
    
    let homeData = {};

try {
    homeData = await CleanTrack.api.request(
        "/api/home/admin"
    );
} catch (error) {
    console.error("Home data loading error:", error);
}

const organization =
    homeData.organization || {};

const counts =
    homeData.counts || {};

const organizationName =
    organization.name || "Organization";

const organizationCode =
    organization.organization_code || "—";

const staffCount =
    counts.staff ?? 0;

const teamCount =
    counts.teams ?? 0;

const locationCount =
    counts.locations ?? 0;

const zoneCount =
    counts.zones ?? 0;

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
    ${escapeHtml(organizationName)} · Administrator
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
    ${escapeHtml(organizationName)}
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
    ${staffCount}
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
    ${teamCount}
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
    ${locationCount}
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
    ${zoneCount}
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
    ${escapeHtml(organizationCode)}
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

function renderAdminDashboard() {

    const pageView =
        document.getElementById("page-view");

    if (!pageView) {
        return;
    }


    const user =
        CleanTrack.currentUser || {};

    const name =
        user.name || "User";

    const organization =
        user.organization_name ||
        "CleanTrack";


    if (!CleanTrack.adminDashboardPeriod) {

        const today =
            new Date();

        const from =
            new Date(today);

        from.setDate(
            from.getDate() - 6
        );

        CleanTrack.adminDashboardPeriod = {
            key: "7d",
            from: formatDashboardDate(from),
            to: formatDashboardDate(today),
            label: "Last 7 days"
        };

    }


    const period =
        CleanTrack.adminDashboardPeriod;


    pageView.innerHTML = `

        <section class="admin-dashboard">

            <header class="admin-dashboard-header">

                <div>

                    <div class="admin-dashboard-eyebrow">
                        CLEANTRACK DASHBOARD
                    </div>

                    <h1>
                        Welcome back, ${escapeHtml(name)}
                    </h1>

                    <p>
                        ${escapeHtml(organization)}
                    </p>

                </div>

                <div class="admin-dashboard-period-label">
                    ${escapeHtml(period.label)}
                </div>

            </header>


            <!-- =================================================
                 SUMMARY
                 ================================================= -->

            <section class="admin-dashboard-summary">

                <article class="admin-summary-card">

                    <span>
                        CLEANED
                    </span>

                    <strong id="admin-kpi-completed">
                        —
                    </strong>

                    <small id="admin-kpi-completed-detail">
                        Selected period
                    </small>

                </article>


                <article class="admin-summary-card">

                    <span>
                        COMPLIANCE
                    </span>

                    <strong id="admin-kpi-compliance">
                        —
                    </strong>

                    <small>
                        Completion rate
                    </small>

                </article>


                <article class="admin-summary-card admin-summary-warning">

                    <span>
                        OVERDUE ZONES
                    </span>

                    <strong id="admin-kpi-overdue">
                        —
                    </strong>

                    <small>
                        Current status
                    </small>

                </article>


                <article class="admin-summary-card">

                    <span>
                        AVG CLEAN TIME
                    </span>

                    <strong id="admin-kpi-duration">
                        —
                    </strong>

                    <small>
                        Completed tasks
                    </small>

                </article>

            </section>


            <!-- =================================================
                 MAIN ANALYTICS
                 ================================================= -->

            <section class="admin-dashboard-grid">

                <!-- Trend -->

                <article class="admin-dashboard-panel admin-trend-panel">

                    <div class="admin-panel-header">

                        <div>

                            <span>
                                PERFORMANCE TREND
                            </span>

                            <h2>
                                Cleaning compliance
                            </h2>

                        </div>


                        <div class="admin-range-controls">

                            <button
                                type="button"
                                data-admin-range="7d"
                            >
                                7D
                            </button>

                            <button
                                type="button"
                                data-admin-range="14d"
                            >
                                14D
                            </button>

                            <button
                                type="button"
                                data-admin-range="30d"
                            >
                                30D
                            </button>

                            <button
                                type="button"
                                data-admin-range="3m"
                            >
                                3M
                            </button>

                            <button
                                type="button"
                                data-admin-range="6m"
                            >
                                6M
                            </button>

                            <button
                                type="button"
                                data-admin-range="1y"
                            >
                                1Y
                            </button>

                            <button
                                type="button"
                                data-admin-range="custom"
                            >
                                Custom
                            </button>

                        </div>

                    </div>


                    <div
                        class="admin-custom-range"
                        id="admin-custom-range"
                        hidden
                    >

                        <label>
                            From

                            <input
                                type="date"
                                id="admin-from-date"
                                value="${period.from}"
                            />

                        </label>


                        <label>
                            To

                            <input
                                type="date"
                                id="admin-to-date"
                                value="${period.to}"
                            />

                        </label>


                        <button
                            type="button"
                            id="admin-apply-range"
                        >
                            Apply
                        </button>

                    </div>


                    <div
                        id="admin-trend-chart"
                        class="admin-trend-chart"
                    >

                        <div class="admin-dashboard-loading">
                            Loading trend...
                        </div>

                    </div>

                </article>


                <!-- Donut -->

                <article class="admin-dashboard-panel admin-zone-panel">

                    <div class="admin-panel-header">

                        <div>

                            <span>
                                ZONE STATUS
                            </span>

                            <h2>
                                Current distribution
                            </h2>

                        </div>

                    </div>


                    <div class="admin-donut-layout">

                        <div
                            id="admin-zone-donut"
                            class="admin-zone-donut"
                        >

                            <div>
                                <strong id="admin-zone-total">
                                    0
                                </strong>

                                <span>
                                    zones
                                </span>
                            </div>

                        </div>


                        <div
                            id="admin-zone-legend"
                            class="admin-zone-legend"
                        ></div>

                    </div>

                </article>


                <!-- Needs attention -->

                <article class="admin-dashboard-panel">

                    <div class="admin-panel-header">

                        <div>

                            <span>
                                NEEDS ATTENTION
                            </span>

                            <h2>
                                What needs action
                            </h2>

                        </div>

                    </div>


                    <div
                        id="admin-attention-list"
                        class="admin-attention-list"
                    >
                        <div class="admin-dashboard-loading">
                            Loading...
                        </div>
                    </div>

                </article>


                <!-- Location pulse -->

                <article class="admin-dashboard-panel">

                    <div class="admin-panel-header">

                        <div>

                            <span>
                                LOCATION PULSE
                            </span>

                            <h2>
                                Location performance
                            </h2>

                        </div>

                    </div>


                    <div
                        id="admin-location-list"
                        class="admin-location-list"
                    >
                        <div class="admin-dashboard-loading">
                            Loading...
                        </div>
                    </div>

                </article>


                <!-- Staff -->

                <article class="admin-dashboard-panel">

                    <div class="admin-panel-header">

                        <div>

                            <span>
                                STAFF OVERVIEW
                            </span>

                            <h2>
                                Organization staffing
                            </h2>

                        </div>

                    </div>


                    <div class="admin-staff-grid">

                        <div>
                            <strong id="admin-staff-supervisors">
                                0
                            </strong>

                            <span>
                                Supervisors
                            </span>
                        </div>


                        <div>
                            <strong id="admin-staff-employees">
                                0
                            </strong>

                            <span>
                                Employees
                            </span>
                        </div>


                        <div>
                            <strong id="admin-staff-total">
                                0
                            </strong>

                            <span>
                                Total staff
                            </span>
                        </div>

                    </div>

                </article>


                <!-- Activity -->

                <article class="admin-dashboard-panel">

                    <div class="admin-panel-header">

                        <div>

                            <span>
                                RECENT ACTIVITY
                            </span>

                            <h2>
                                Latest organization events
                            </h2>

                        </div>

                    </div>


                    <div
                        id="admin-activity-list"
                        class="admin-activity-list"
                    >
                        <div class="admin-dashboard-loading">
                            Loading...
                        </div>
                    </div>

                </article>

            </section>


            <!-- =================================================
                 QUICK ACTIONS
                 ================================================= -->

            <section class="admin-dashboard-actions">

                <button
                    type="button"
                    data-admin-action="tasks"
                >
                    + Create Task
                </button>

                <button
                    type="button"
                    data-admin-action="staff"
                >
                    Manage Staff
                </button>

                <button
                    type="button"
                    data-admin-action="locations"
                >
                    Manage Locations
                </button>

                <button
                    type="button"
                    data-admin-action="reports"
                    class="primary"
                >
                    Export Report
                </button>

            </section>

        </section>
    `;


    setupAdminDashboardEvents();

    loadAdminDashboardData();

}

function formatDashboardDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getAdminDashboardRange(key) {

    const today =
        new Date();

    const from =
        new Date(today);


    const ranges = {
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365
    };


    const days =
        ranges[key] || 7;


    from.setDate(
        from.getDate() - days + 1
    );


    const labels = {
        "7d": "Last 7 days",
        "14d": "Last 14 days",
        "30d": "Last 30 days",
        "3m": "Last 3 months",
        "6m": "Last 6 months",
        "1y": "Last year"
    };


    return {
        key,
        from: formatDashboardDate(from),
        to: formatDashboardDate(today),
        label: labels[key]
    };

}


function setupAdminDashboardEvents() {

    document
        .querySelectorAll("[data-admin-range]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const key =
                        button.dataset.adminRange;


                    if (key === "custom") {

                        const custom =
                            document.getElementById(
                                "admin-custom-range"
                            );

                        custom.hidden =
                            !custom.hidden;

                        return;
                    }


                    CleanTrack.adminDashboardPeriod =
                        getAdminDashboardRange(key);


                    renderAdminDashboard();

                }
            );

        });


    const applyButton =
        document.getElementById(
            "admin-apply-range"
        );


    if (applyButton) {

        applyButton.addEventListener(
            "click",
            () => {

                const from =
                    document.getElementById(
                        "admin-from-date"
                    ).value;

                const to =
                    document.getElementById(
                        "admin-to-date"
                    ).value;


                if (!from || !to || from > to) {
                    return;
                }


                CleanTrack.adminDashboardPeriod = {
                    key: "custom",
                    from,
                    to,
                    label:
                        `${from} → ${to}`
                };


                renderAdminDashboard();

            }
        );

    }


    document
        .querySelectorAll("[data-admin-action]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.adminAction;


                    CleanTrack.dashboardPeriod =
                        CleanTrack.adminDashboardPeriod;


                    if (action === "reports") {
                        loadPage("reports");
                        return;
                    }


                    loadPage(action);

                }
            );

        });

}


async function loadAdminDashboardData() {

    const period =
        CleanTrack.adminDashboardPeriod;


    if (!period) {
        return;
    }


    try {

        const query =
            new URLSearchParams({
                from: period.from,
                to: period.to
            });


        const data =
            await CleanTrack.api.request(
                `/api/admin/dashboard?${query.toString()}`
            );


        if (
            !document.querySelector(
                ".admin-dashboard"
            )
        ) {
            return;
        }


        renderAdminDashboardData(data);


    } catch (error) {

        console.error(
            "Admin Dashboard loading error:",
            error
        );


        const attention =
            document.getElementById(
                "admin-attention-list"
            );

        if (attention) {

            attention.innerHTML = `
                <div class="admin-dashboard-empty">
                    Unable to load dashboard data.
                </div>
            `;

        }

    }

}


function renderAdminDashboardData(data) {

    const summary =
        data.summary || {};

    const staff =
        data.staff || {};

    const zones =
        data.zone_status || {};


    setAdminText(
        "admin-kpi-completed",
        summary.completed_tasks ?? 0
    );


    setAdminText(
        "admin-kpi-completed-detail",
        `${summary.total_tasks ?? 0} scheduled in selected period`
    );


    setAdminText(
        "admin-kpi-compliance",
        `${summary.compliance_pct ?? 0}%`
    );


    setAdminText(
        "admin-kpi-overdue",
        zones.overdue ?? 0
    );


    setAdminText(
        "admin-kpi-duration",
        summary.avg_clean_time != null
            ? `${summary.avg_clean_time} min`
            : "—"
    );


    renderAdminTrendChart(
        data.trend || []
    );


    renderAdminZoneDonut(
        zones
    );


    renderAdminAttention(
        data.needs_attention || []
    );


    renderAdminLocations(
        data.locations || []
    );


    setAdminText(
        "admin-staff-supervisors",
        staff.supervisors ?? 0
    );

    setAdminText(
        "admin-staff-employees",
        staff.employees ?? 0
    );

    setAdminText(
        "admin-staff-total",
        staff.total ?? 0
    );


    renderAdminActivity(
        data.recent_activity || []
    );

}


function setAdminText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


function renderAdminTrendChart(rows) {

    const container =
        document.getElementById(
            "admin-trend-chart"
        );


    if (!container) {
        return;
    }


    if (!rows.length) {

        container.innerHTML = `
            <div class="admin-chart-empty">
                <strong>No trend data yet</strong>
                <span>
                    Completed tasks will appear here once
                    your organization has operational data.
                </span>
            </div>
        `;

        return;
    }


    const width = 760;
    const height = 270;

    const left = 46;
    const right = 20;
    const top = 20;
    const bottom = 38;


    const plotWidth =
        width - left - right;

    const plotHeight =
        height - top - bottom;


    const points =
        rows.map((row, index) => {

            const x =
                left +
                (
                    rows.length === 1
                        ? plotWidth / 2
                        : index *
                          (
                            plotWidth /
                            (rows.length - 1)
                          )
                );


            const value =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            row.compliance_pct
                        ) || 0
                    )
                );


            const y =
                top +
                plotHeight -
                (
                    value / 100 *
                    plotHeight
                );


            return {
                x,
                y,
                value,
                label: row.label
            };

        });


    const line =
        points
            .map(
                (point, index) =>
                    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
            )
            .join(" ");


    const area =
        `${line} L ${points[points.length - 1].x} ${top + plotHeight} L ${points[0].x} ${top + plotHeight} Z`;


    const labels =
        points
            .map((point, index) => {

                const show =
                    points.length <= 8 ||
                    index === 0 ||
                    index === points.length - 1 ||
                    index % Math.ceil(
                        points.length / 6
                    ) === 0;


                if (!show) {
                    return "";
                }


                return `
                    <text
                        x="${point.x}"
                        y="${height - 11}"
                        text-anchor="middle"
                        class="admin-chart-label"
                    >
                        ${escapeHtml(point.label)}
                    </text>
                `;

            })
            .join("");


    container.innerHTML = `

        <svg
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="none"
            class="admin-trend-svg"
        >

            <defs>

                <linearGradient
                    id="adminTrendFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                >

                    <stop
                        offset="0%"
                        stop-color="rgba(79,142,247,0.20)"
                    />

                    <stop
                        offset="100%"
                        stop-color="rgba(79,142,247,0)"
                    />

                </linearGradient>

            </defs>


            <line
                x1="${left}"
                x2="${width - right}"
                y1="${top + plotHeight * 0.1}"
                y2="${top + plotHeight * 0.1}"
                class="admin-chart-gridline"
            />

            <line
                x1="${left}"
                x2="${width - right}"
                y1="${top + plotHeight * 0.5}"
                y2="${top + plotHeight * 0.5}"
                class="admin-chart-gridline"
            />

            <line
                x1="${left}"
                x2="${width - right}"
                y1="${top + plotHeight * 0.9}"
                y2="${top + plotHeight * 0.9}"
                class="admin-chart-gridline"
            />


            <line
                x1="${left}"
                x2="${width - right}"
                y1="${top + plotHeight * 0.1}"
                y2="${top + plotHeight * 0.1}"
                class="admin-chart-target"
            />


            <path
                d="${area}"
                class="admin-chart-area"
            />

            <path
                d="${line}"
                class="admin-chart-line"
            />


            ${points
                .map(point => `
                    <circle
                        cx="${point.x}"
                        cy="${point.y}"
                        r="3.5"
                        class="admin-chart-point"
                    >
                        <title>
                            ${escapeHtml(point.label)}
                            · ${point.value}%
                        </title>
                    </circle>
                `)
                .join("")}


            ${labels}

        </svg>

        <div class="admin-chart-target-label">
            Target 90%
        </div>
    `;

}


function renderAdminZoneDonut(zones) {

    const donut =
        document.getElementById(
            "admin-zone-donut"
        );

    const legend =
        document.getElementById(
            "admin-zone-legend"
        );


    if (!donut || !legend) {
        return;
    }


    const values = [

        ["Cleaned", zones.cleaned || 0, "cleaned"],
        ["In Progress", zones.in_progress || 0, "progress"],
        ["Pending", zones.pending || 0, "pending"],
        ["Overdue", zones.overdue || 0, "overdue"]

    ];


    const total =
        values.reduce(
            (sum, item) =>
                sum + item[1],
            0
        );


    setAdminText(
        "admin-zone-total",
        total
    );


    if (!total) {

        donut.style.background =
            "conic-gradient(#252c38 0deg 360deg)";

    } else {

        let start = 0;


        const segments =
            values.map(item => {

                const degrees =
                    item[1] /
                    total *
                    360;


                const end =
                    start + degrees;


                const colorMap = {
                    cleaned: "#4f8ef7",
                    progress: "#8b7cf6",
                    pending: "#f1b24a",
                    overdue: "#ed6670"
                };


                const segment =
                    `${colorMap[item[2]]} ${start}deg ${end}deg`;


                start = end;

                return segment;

            });


        donut.style.background =
            `conic-gradient(${segments.join(",")})`;

    }


    legend.innerHTML =
        values
            .map(item => `

                <div class="admin-zone-legend-row">

                    <span
                        class="admin-zone-dot ${item[2]}"
                    ></span>

                    <span>
                        ${item[0]}
                    </span>

                    <strong>
                        ${item[1]}
                    </strong>

                </div>

            `)
            .join("");

}


function renderAdminAttention(items) {

    const container =
        document.getElementById(
            "admin-attention-list"
        );


    if (!container) {
        return;
    }


    if (!items.length) {

        container.innerHTML = `
            <div class="admin-dashboard-empty positive">
                <strong>
                    Everything looks healthy
                </strong>
                <span>
                    No current attention items were detected.
                </span>
            </div>
        `;

        return;
    }


    container.innerHTML =
        items
            .map(item => `

                <button
                    type="button"
                    class="admin-attention-item ${escapeHtml(item.severity || "medium")}"
                >

                    <span
                        class="admin-attention-indicator"
                    ></span>

                    <span>

                        <strong>
                            ${escapeHtml(item.title)}
                        </strong>

                        <small>
                            ${escapeHtml(item.detail)}
                        </small>

                    </span>

                    <em>
                        →
                    </em>

                </button>

            `)
            .join("");

}


function renderAdminLocations(rows) {

    const container =
        document.getElementById(
            "admin-location-list"
        );


    if (!container) {
        return;
    }


    if (!rows.length) {

        container.innerHTML = `
            <div class="admin-dashboard-empty">
                No locations have been added yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        rows
            .map(row => {

                const score =
                    row.compliance_pct;


                const displayScore =
                    score == null
                        ? "—"
                        : `${score}%`;


                return `

                    <div class="admin-location-row">

                        <div>

                            <strong>
                                ${escapeHtml(row.name)}
                            </strong>

                            <span>
                                ${row.zone_count || 0}
                                zones
                            </span>

                        </div>


                        <div class="admin-location-score">

                            <div class="admin-location-track">

                                <span
                                    style="width:${Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            Number(score) || 0
                                        )
                                    )}%"
                                ></span>

                            </div>


                            <strong>
                                ${displayScore}
                            </strong>

                        </div>

                    </div>

                `;

            })
            .join("");

}


function renderAdminActivity(rows) {

    const container =
        document.getElementById(
            "admin-activity-list"
        );


    if (!container) {
        return;
    }


    if (!rows.length) {

        container.innerHTML = `
            <div class="admin-dashboard-empty">
                No recent activity yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        rows
            .map(row => `

                <div class="admin-activity-row">

                    <span class="admin-activity-dot">
                    </span>

                    <div>

                        <strong>
                            ${escapeHtml(row.title || "Activity")}
                        </strong>

                        <span>
                            ${escapeHtml(row.detail || "")}
                        </span>

                    </div>

                    <time>
                        ${formatAdminActivityTime(
                            row.activity_time
                        )}
                    </time>

                </div>

            `)
            .join("");

}


function formatAdminActivityTime(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(
            String(value).replace(" ", "T")
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    const seconds =
        Math.floor(
            (Date.now() - date.getTime()) /
            1000
        );


    if (seconds < 60) {
        return "Just now";
    }


    if (seconds < 3600) {

        return (
            `${Math.floor(seconds / 60)} min ago`
        );

    }


    if (seconds < 86400) {

        return (
            `${Math.floor(seconds / 3600)} hr ago`
        );

    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short"
        }
    );

}

    
    function renderDashboard() {
    
        const role =
        String(
            getUser().role || ""
        ).toLowerCase();

    if (role === "admin") {
        renderAdminDashboard();
        return;
    }
    
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


        const dashboardRoot =
            document.querySelector(".dashboard-page");

        if (!dashboardRoot) {
            return;
        }


        const zones =
            data.zones || {};

        const today =
            data.today || {};


        function setText(id, value) {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent =
                    value;
            }

        }


        setText(
            "kpi-total-zones",
            zones.total ?? 0
        );

        setText(
            "kpi-cleaned-zones",
            zones.cleaned ?? 0
        );

        setText(
            "kpi-overdue-zones",
            zones.overdue ?? 0
        );

        setText(
            "kpi-tasks-today",
            today.total ?? 0
        );


        const compliance =
            today.compliance_pct ?? 0;


        setText(
            "kpi-compliance",
            `${compliance}%`
        );


        setText(
            "kpi-compliance-detail",
            `${today.completed ?? 0} of ${today.total ?? 0} completed`
        );


        setText(
            "kpi-clean-time",
            data.avg_cleaning_duration != null
                ? `${data.avg_cleaning_duration} min`
                : "—"
        );


        setText(
            "task-progress-value",
            `${compliance}%`
        );

        setText(
            "task-completed",
            today.completed ?? 0
        );

        setText(
            "task-pending",
            today.pending ?? 0
        );

        setText(
            "task-missed",
            today.missed ?? 0
        );


        setText(
            "zone-cleaned",
            zones.cleaned ?? 0
        );

        setText(
            "zone-progress",
            zones.in_progress ?? 0
        );

        setText(
            "zone-pending",
            zones.pending ?? 0
        );

        setText(
            "zone-overdue",
            zones.overdue ?? 0
        );


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

    const notificationButton =
        document.getElementById("notification-button");

    const aiButton =
        document.getElementById("ai-help-button");

    const profileButton =
        document.getElementById("profile-button");

    const profileMenu =
        document.getElementById("global-profile-menu");


    /* ==============================================
   Global Search
   ============================================== */

const searchInput =
    document.getElementById(
        "global-search-input"
    );


const searchContainer =
    document.querySelector(
        ".global-search"
    );


let searchResults =
    document.getElementById(
        "global-search-results"
    );


if (
    searchInput &&
    searchContainer
) {

    /*
     * Create the results panel once.
     * It stays hidden until the user types.
     */

    if (!searchResults) {

        searchResults =
            document.createElement("div");

        searchResults.id =
            "global-search-results";

        searchResults.className =
            "global-search-results";

        searchResults.hidden = true;

        searchContainer.appendChild(
            searchResults
        );

    }


    /*
     * Build the search index from the
     * navigation currently available
     * to this logged-in user.
     *
     * This is important because Admin,
     * Supervisor and Employee have
     * different navigation.
     */

  function getSearchItems() {

    const elements =
        document.querySelectorAll(
            "nav button[data-page], " +
            "nav a[data-page], " +
            "aside button[data-page], " +
            "aside a[data-page]"
        );


    const pageLabels = {

        home: "Home",
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
        profile: "Profile"

    };


    const items = [];


    elements.forEach(element => {

        const page =
            element.dataset.page;


        if (!page) {
            return;
        }


        const label =
            pageLabels[page] ||
            page;


        const exists =
            items.some(
                item =>
                    item.page === page
            );


        if (exists) {
            return;
        }


        items.push({
            label,
            page,
            element
        });

    });


    /*
     * Global account destinations.
     */

    const accountItems = [

        {
            label: "My Profile",
            page: "profile",
            action: () => loadPage("profile")
        },

        {
            label: "Settings",
            page: "settings",
            action: () => loadPage("settings")
        }

    ];


    accountItems.forEach(item => {

        const exists =
            items.some(
                existing =>
                    existing.page === item.page
            );


        if (!exists) {
            items.push(item);
        }

    });


    return items;

}


    function renderSearchResults(query) {

        const search =
            query.trim().toLowerCase();


        if (!search) {

            searchResults.hidden = true;
            searchResults.innerHTML = "";

            return;

        }


        const items =
            getSearchItems();


        const matches =
            items.filter(item =>
                item.label
                    .toLowerCase()
                    .includes(search)
            );


        searchResults.innerHTML = `

            <div class="global-search-result-count">

                <span>
                    ${matches.length}
                    ${matches.length === 1
                        ? "result"
                        : "results"}
                </span>

            </div>


            ${
                matches.length
                    ? matches
                        .map(
                            (item, index) => `
                                <button
                                    type="button"
                                    class="global-search-result"
                                    data-search-index="${index}"
                                >

                                    <span
                                        class="global-search-result-icon"
                                    >
                                        ${getSearchIcon(
                                            item.label
                                        )}
                                    </span>

                                    <span
                                        class="global-search-result-label"
                                    >
                                        ${escapeHtml(
                                            item.label
                                        )}
                                    </span>

                                    <span
                                        class="global-search-result-arrow"
                                    >
                                        →
                                    </span>

                                </button>
                            `
                        )
                        .join("")
                    :
                        `
                            <div
                                class="global-search-no-results"
                            >
                                No matches found
                            </div>
                        `
            }

        `;


        searchResults.hidden = false;


        if (!matches.length) {
            return;
        }


        searchResults
            .querySelectorAll(
                ".global-search-result"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset
                                    .searchIndex
                            );

                        const item =
                            matches[index];


                        searchInput.value = "";

                        searchResults.hidden =
                            true;


                        /*
                         * Use the real navigation
                         * element when available.
                         *
                         * That guarantees the search
                         * follows the same route and
                         * permissions as the sidebar.
                         */

                        if (
                            item.element &&
                            typeof item.element.click ===
                                "function"
                        ) {

                            item.element.click();

                        }

                        else if (
                            item.action
                        ) {

                            item.action();

                        }

                    }
                );

            });

    }


    function getSearchIcon(label) {

        const value =
            label.toLowerCase();


        if (value.includes("task")) {
            return "✓";
        }

        if (value.includes("team")) {
            return "T";
        }

        if (
            value.includes("location") ||
            value.includes("zone")
        ) {
            return "⌖";
        }

        if (value.includes("report")) {
            return "▤";
        }

        if (value.includes("analytic")) {
            return "◫";
        }

        if (
            value.includes("alert") ||
            value.includes("notification")
        ) {
            return "!";
        }

        if (value.includes("profile")) {
            return "●";
        }

        if (value.includes("setting")) {
            return "⚙";
        }

        return "•";

    }


    /*
     * Live search.
     */

    searchInput.addEventListener(
        "input",
        () => {

            renderSearchResults(
                searchInput.value
            );

        }
    );


    /*
     * Enter opens the first matching result.
     */

    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }


            const search =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!search) {
                return;
            }


            const items =
                getSearchItems();


            const matches =
                items.filter(item =>
                    item.label
                        .toLowerCase()
                        .includes(search)
                );


            if (!matches.length) {
                return;
            }


            searchInput.value = "";

            searchResults.hidden =
                true;


            const first =
                matches[0];


            if (
                first.element &&
                typeof first.element.click ===
                    "function"
            ) {

                first.element.click();

            }

            else if (first.action) {

                first.action();

            }

        }
    );


    /*
     * "/" focuses the global search.
     */

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


    /*
     * Escape closes results.
     */

    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                searchResults.hidden =
                    true;

                searchInput.blur();

            }

        }
    );


    /*
     * Close when clicking outside search.
     */

    document.addEventListener(
        "click",
        event => {

            if (
                !searchContainer.contains(
                    event.target
                )
            ) {

                searchResults.hidden =
                    true;

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

async function renderAdminStaff() {

    const view =
        document.getElementById("page-view");

    if (!view) {
        return;
    }

    view.innerHTML = `
        <section class="admin-staff-page">

            <header class="staff-page-header">

                <div>
                    <div class="staff-page-eyebrow">
                        PEOPLE MANAGEMENT
                    </div>

                    <h1>
                        Staff
                    </h1>

                    <p>
                        Manage supervisors and organization staff
                    </p>
                </div>

                <div class="staff-page-actions">

                    <button
                        type="button"
                        data-staff-action="export"
                    >
                        Export
                    </button>

                    <button
                        type="button"
                        class="primary"
                        data-staff-action="invite"
                    >
                        + Invite Staff
                    </button>

                </div>

            </header>


            <section class="staff-health-summary">

                <div>
                    <span>TOTAL STAFF</span>
                    <strong id="staff-summary-total">0</strong>
                </div>

                <div>
                    <span>SUPERVISORS</span>
                    <strong id="staff-summary-supervisors">0</strong>
                </div>

                <div>
                    <span>EMPLOYEES</span>
                    <strong id="staff-summary-employees">0</strong>
                </div>

                <div>
                    <span>ACTIVE</span>
                    <strong id="staff-summary-active">0</strong>
                </div>

                <div>
                    <span>PENDING</span>
                    <strong id="staff-summary-pending">0</strong>
                </div>

                <div>
                    <span>INACTIVE</span>
                    <strong id="staff-summary-inactive">0</strong>
                </div>

            </section>


            <section class="staff-page-panel">

                <div class="staff-directory-header">

                    <div>
                        <span class="staff-panel-label">
                            SUPERVISORS
                        </span>

                        <h2>
                            Supervisor directory
                        </h2>
                    </div>

                    <div class="staff-filter-row">

                        <button
                            type="button"
                            class="active"
                            data-staff-status="all"
                        >
                            All
                        </button>

                        <button
                            type="button"
                            data-staff-status="active"
                        >
                            Active
                        </button>

                        <button
                            type="button"
                            data-staff-status="inactive"
                        >
                            Inactive
                        </button>

                    </div>

                </div>


                <div class="staff-search-row">

                    <div class="staff-search-box">
                        <span>⌕</span>

                        <input
                            id="admin-staff-search"
                            type="search"
                            placeholder="Search supervisors..."
                            autocomplete="off"
                        />
                    </div>

                </div>


                <div
                    id="admin-supervisor-list"
                    class="admin-supervisor-list"
                >

                    <div class="staff-loading">
                        Loading staff...
                    </div>

                </div>

            </section>
            
            <section
    id="admin-staff-attention"
    class="staff-attention-strip"
></section>


            <section
                id="admin-unassigned-panel"
                class="staff-page-panel staff-unassigned-panel"
                hidden
            >

                <div class="staff-directory-header">

                    <div>
                        <span class="staff-panel-label">
                            ATTENTION
                        </span>

                        <h2>
                            Unassigned staff
                        </h2>

                        <p>
                            Employees who are not currently
                            connected to a supervisor team.
                        </p>
                    </div>

                </div>

                <div
                    id="admin-unassigned-list"
                    class="admin-unassigned-list"
                ></div>

            </section>


            <div
                id="admin-staff-drawer-backdrop"
                class="staff-drawer-backdrop"
                hidden
            ></div>


            <aside
                id="admin-staff-drawer"
                class="admin-staff-drawer"
                aria-hidden="true"
            >

                <div class="staff-drawer-header">

                    <div>
                        <span>
                            STAFF PROFILE
                        </span>

                        <h2 id="staff-drawer-name">
                            Staff
                        </h2>

                        <p id="staff-drawer-role">
                            —
                        </p>
                    </div>

                    <button
                        type="button"
                        class="staff-drawer-close"
                        id="staff-drawer-close"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="staff-drawer-content"
                    class="staff-drawer-content"
                ></div>

            </aside>

        </section>
    `;


    setupAdminStaffEvents();

    await loadAdminStaffData();

}


async function loadAdminStaffData() {

    try {

        const data =
            await CleanTrack.api.request(
                "/api/admin/staff"
            );

        if (
            !document.querySelector(
                ".admin-staff-page"
            )
        ) {
            return;
        }

        CleanTrack.adminStaffData =
            data;

        renderAdminStaffData(data);

    } catch (error) {

        console.error(
            "Admin Staff loading error:",
            error
        );

        const list =
            document.getElementById(
                "admin-supervisor-list"
            );

        if (list) {

            list.innerHTML = `
                <div class="staff-empty">
                    Unable to load staff data.
                </div>
            `;

        }

    }

}


function renderAdminStaffData(data) {

    const summary =
        data.summary || {};

    setAdminStaffText(
        "staff-summary-total",
        summary.total_staff ?? 0
    );

    setAdminStaffText(
        "staff-summary-supervisors",
        summary.supervisors ?? 0
    );

    setAdminStaffText(
        "staff-summary-employees",
        summary.employees ?? 0
    );

    setAdminStaffText(
        "staff-summary-active",
        summary.active ?? 0
    );

    setAdminStaffText(
        "staff-summary-pending",
        summary.pending ?? 0
    );

    setAdminStaffText(
        "staff-summary-inactive",
        summary.inactive ?? 0
    );


    renderAdminSupervisorList(
        data.supervisors || [],
        "all"
    );


    renderAdminUnassignedStaff(
        data.unassigned_employees || []
    );
    
    renderAdminStaffAttention(data);

}

function renderAdminStaffAttention(data) {

    const container =
        document.getElementById(
            "admin-staff-attention"
        );

    if (!container) {
        return;
    }


    const summary =
        data.summary || {};

    const unassigned =
        (data.unassigned_employees || []).length;

    const pending =
        summary.pending || 0;

    const inactive =
        summary.inactive || 0;


    const items = [];


    if (unassigned) {

        items.push(`
            <button
                type="button"
                class="staff-attention-item"
                onclick="
                    document
                        .getElementById('admin-unassigned-panel')
                        ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                "
            >
                <strong>
                    ${unassigned}
                </strong>

                <span>
                    unassigned employee${
                        unassigned === 1 ? "" : "s"
                    }
                </span>

                <em>Review →</em>
            </button>
        `);

    }


    if (pending) {

        items.push(`
            <div class="staff-attention-item">
                <strong>
                    ${pending}
                </strong>

                <span>
                    pending staff account${
                        pending === 1 ? "" : "s"
                    }
                </span>
            </div>
        `);

    }


    if (inactive) {

        items.push(`
            <div class="staff-attention-item">
                <strong>
                    ${inactive}
                </strong>

                <span>
                    inactive staff member${
                        inactive === 1 ? "" : "s"
                    }
                </span>
            </div>
        `);

    }


    if (!items.length) {

        container.innerHTML = `
            <div class="staff-attention-clear">
                Staff structure is healthy
            </div>
        `;

        return;
    }


    container.innerHTML =
        items.join("");

}


function setAdminStaffText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


function renderAdminSupervisorList(
    supervisors,
    status
) {

    const container =
        document.getElementById(
            "admin-supervisor-list"
        );

    if (!container) {
        return;
    }


    const query =
        (
            document.getElementById(
                "admin-staff-search"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    let filtered =
        supervisors.filter(
            supervisor => {

                const active =
                    Boolean(
                        supervisor.is_active
                    );

                if (
                    status === "active" &&
                    !active
                ) {
                    return false;
                }

                if (
                    status === "inactive" &&
                    active
                ) {
                    return false;
                }

                if (!query) {
                    return true;
                }

                return [
                    supervisor.name,
                    supervisor.email,
                    ...(supervisor.teams || [])
                        .map(team => team.name),
                    ...(supervisor.location_names || [])
                ]
                    .filter(Boolean)
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(query)
                    );

            }
        );


    if (!filtered.length) {

        container.innerHTML = `
            <div class="staff-empty">
                <strong>No supervisors found</strong>
                <span>
                    Try a different search or filter.
                </span>
            </div>
        `;

        return;
    }


    container.innerHTML =
        filtered
            .map(supervisor => {

                const teamNames =
                    supervisor.teams || [];

                const employeeCount =
                    supervisor.employee_count || 0;

                const locationCount =
                    (
                        supervisor.location_names || []
                    ).length;

                const statusLabel =
                    supervisor.is_active
                        ? "Active"
                        : "Inactive";

                return `
                    <button
                        type="button"
                        class="admin-supervisor-card"
                        data-supervisor-id="${escapeHtml(
                            String(supervisor.id)
                        )}"
                    >

                        <div class="staff-person-avatar">
                            ${escapeHtml(
                                getStaffInitials(
                                    supervisor.name
                                )
                            )}
                        </div>

                        <div class="admin-supervisor-main">

                            <strong>
                                ${escapeHtml(
                                    supervisor.name ||
                                    "Unnamed"
                                )}
                            </strong>

                            <span>
                                Supervisor
                            </span>

                            <div class="admin-supervisor-meta">

                                <span>
                                    ${teamNames.length || 0}
                                    ${teamNames.length === 1
                                        ? "team"
                                        : "teams"}
                                </span>

                                <span>·</span>

                                <span>
                                    ${employeeCount}
                                    ${employeeCount === 1
                                        ? "employee"
                                        : "employees"}
                                </span>

                                <span>·</span>

                                <span>
                                    ${locationCount}
                                    ${locationCount === 1
                                        ? "location"
                                        : "locations"}
                                </span>

                            </div>

                        </div>


                        <div class="admin-supervisor-status">

                            <span
                                class="
                                    staff-status-dot
                                    ${supervisor.is_active
                                        ? "active"
                                        : "inactive"}
                                "
                            ></span>

                            <span>
                                ${statusLabel}
                            </span>

                            <em>
                                →
                            </em>

                        </div>

                    </button>
                `;

            })
            .join("");


    container
        .querySelectorAll(
            "[data-supervisor-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openAdminSupervisorDrawer(
                        button.dataset.supervisorId
                    );

                }
            );

        });

}


function renderAdminUnassignedStaff(employees) {

    const panel =
        document.getElementById(
            "admin-unassigned-panel"
        );

    const list =
        document.getElementById(
            "admin-unassigned-list"
        );

    if (!panel || !list) {
        return;
    }


    if (!employees.length) {

        panel.hidden = true;
        return;

    }


    panel.hidden = false;


    list.innerHTML =
        employees
            .map(employee => `

                <button
                    type="button"
                    class="admin-unassigned-row"
                    data-employee-id="${escapeHtml(
                        String(employee.id)
                    )}"
                >

                    <div class="staff-person-avatar small">
                        ${escapeHtml(
                            getStaffInitials(
                                employee.name
                            )
                        )}
                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                employee.name ||
                                "Unnamed"
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                employee.email || ""
                            )}
                        </span>

                    </div>

                    <em>
                        Review →
                    </em>

                </button>

            `)
            .join("");


    list
        .querySelectorAll(
            "[data-employee-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openAdminEmployeeDrawer(
                        button.dataset.employeeId
                    );

                }
            );

        });

}


function setupAdminStaffEvents() {

    const search =
        document.getElementById(
            "admin-staff-search"
        );


    const backdrop =
        document.getElementById(
            "admin-staff-drawer-backdrop"
        );


    const close =
        document.getElementById(
            "staff-drawer-close"
        );


    if (search) {

        search.addEventListener(
            "input",
            () => {

                const data =
                    CleanTrack.adminStaffData;

                if (!data) {
                    return;
                }

                const activeFilter =
                    document.querySelector(
                        "[data-staff-status].active"
                    )?.dataset.staffStatus ||
                    "all";


                renderAdminSupervisorList(
                    data.supervisors || [],
                    activeFilter
                );

            }
        );

    }


    document
        .querySelectorAll(
            "[data-staff-status]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "[data-staff-status]"
                        )
                        .forEach(
                            item =>
                                item.classList
                                    .remove(
                                        "active"
                                    )
                        );

                    button.classList.add(
                        "active"
                    );


                    const data =
                        CleanTrack.adminStaffData;

                    if (data) {

                        renderAdminSupervisorList(
                            data.supervisors || [],
                            button.dataset.staffStatus
                        );

                    }

                }
            );

        });


    if (close) {

        close.addEventListener(
            "click",
            closeAdminStaffDrawer
        );

    }


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeAdminStaffDrawer
        );

    }


    document
        .querySelectorAll(
            "[data-staff-action]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.staffAction;


                    if (action === "export") {
                        exportAdminStaffCsv();
                        return;
                    }


                    if (action === "invite") {
                        loadPage("invitations");
                    }

                }
            );

        });

}


function getStaffInitials(name) {

    return String(
        name || "U"
    )
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            part =>
                part.charAt(0).toUpperCase()
        )
        .join("");

}


function openAdminSupervisorDrawer(id) {

    const data =
        CleanTrack.adminStaffData;

    if (!data) {
        return;
    }


    const supervisor =
        (data.supervisors || [])
            .find(
                item =>
                    String(item.id) ===
                    String(id)
            );


    if (!supervisor) {
        return;
    }


    openAdminStaffDrawer(
        supervisor.name,
        "Supervisor",
        renderSupervisorDrawer(
            supervisor
        )
    );

}


function renderSupervisorDrawer(
    supervisor
) {

    const teams =
        supervisor.teams || [];

    const locations =
        supervisor.location_names || [];

    const employees =
        supervisor.employees || [];


    return `

        <div class="staff-detail-block">

            <span class="staff-detail-label">
                ACCOUNT
            </span>

            <div class="staff-detail-grid">

                <div>
                    <span>Email</span>
                    <strong>
                        ${escapeHtml(
                            supervisor.email || "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Phone</span>
                    <strong>
                        ${escapeHtml(
                            supervisor.phone || "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Employee ID</span>
                    <strong>
                        ${escapeHtml(
                            supervisor.employee_id || "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>
                        ${supervisor.is_active
                            ? "Active"
                            : "Inactive"}
                    </strong>
                </div>

            </div>

        </div>


        <div class="staff-detail-block">

            <span class="staff-detail-label">
                TEAMS
            </span>

            ${
                teams.length
                    ? `
                        <div class="staff-chip-row">
                            ${teams
                                .map(
                                    team => `
                                        <span class="staff-chip">
                                            ${escapeHtml(
                                                team.name
                                            )}
                                        </span>
                                    `
                                )
                                .join("")}
                        </div>
                    `
                    : `
                        <div class="staff-detail-empty">
                            No team assigned.
                        </div>
                    `
            }

        </div>


        <div class="staff-detail-block">

            <span class="staff-detail-label">
                LOCATIONS
            </span>

            ${
                locations.length
                    ? `
                        <div class="staff-chip-row">
                            ${locations
                                .map(
                                    location => `
                                        <span class="staff-chip">
                                            ${escapeHtml(
                                                location
                                            )}
                                        </span>
                                    `
                                )
                                .join("")}
                        </div>
                    `
                    : `
                        <div class="staff-detail-empty">
                            No location activity yet.
                        </div>
                    `
            }

        </div>


        <div class="staff-detail-block">

            <div class="staff-detail-label-row">

                <span class="staff-detail-label">
                    EMPLOYEES
                </span>

                <span class="staff-detail-count">
                    ${employees.length}
                </span>

            </div>


            ${
                employees.length
                    ? `
                        <div class="staff-employee-list">

                            ${employees
                                .map(
                                    employee => `

                                        <button
                                            type="button"
                                            class="staff-employee-row"
                                            data-employee-id="${escapeHtml(
                                                String(
                                                    employee.id
                                                )
                                            )}"
                                        >

                                            <div
                                                class="
                                                    staff-person-avatar
                                                    small
                                                "
                                            >
                                                ${escapeHtml(
                                                    getStaffInitials(
                                                        employee.name
                                                    )
                                                )}
                                            </div>

                                            <div>

                                                <strong>
                                                    ${escapeHtml(
                                                        employee.name ||
                                                        "Unnamed"
                                                    )}
                                                </strong>

                                                <span>
                                                    ${escapeHtml(
                                                        (
                                                            employee.team_names || []
                                                        )[0] ||
                                                        "No team"
                                                    )}
                                                </span>

                                            </div>

                                            <em>
                                                →
                                            </em>

                                        </button>
                                    `
                                )
                                .join("")}

                        </div>
                    `
                    : `
                        <div class="staff-detail-empty">
                            This supervisor has no employees yet.
                        </div>
                    `
            }

        </div>


        <div class="staff-detail-actions">

            <button
                type="button"
                data-staff-edit-id="${escapeHtml(
                    String(supervisor.id)
                )}"
            >
                Edit Staff
            </button>

            <button
                type="button"
                data-staff-toggle-id="${escapeHtml(
                    String(supervisor.id)
                )}"
                class="danger"
            >
                ${
                    supervisor.is_active
                        ? "Deactivate"
                        : "Activate"
                }
            </button>

        </div>
    `;

}


function openAdminEmployeeDrawer(id) {

    const data =
        CleanTrack.adminStaffData;

    if (!data) {
        return;
    }


    let employee = null;


    (data.supervisors || [])
        .some(
            supervisor => {

                employee =
                    (supervisor.employees || [])
                        .find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );

                return Boolean(employee);

            }
        );


    if (!employee) {

        employee =
            (data.unassigned_employees || [])
                .find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

    }


    if (!employee) {
        return;
    }


    openAdminStaffDrawer(
        employee.name,
        "Employee",
        renderEmployeeDrawer(employee)
    );

}


function renderEmployeeDrawer(employee) {

    const teamNames =
        employee.team_names || [];


    return `

        <div class="staff-detail-block">

            <span class="staff-detail-label">
                PROFILE
            </span>

            <div class="staff-detail-grid">

                <div>
                    <span>Email</span>
                    <strong>
                        ${escapeHtml(
                            employee.email || "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Phone</span>
                    <strong>
                        ${escapeHtml(
                            employee.phone || "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Employee ID</span>
                    <strong>
                        ${escapeHtml(
                            employee.employee_id || "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>
                        ${employee.is_active
                            ? "Active"
                            : "Inactive"}
                    </strong>
                </div>

            </div>

        </div>


        <div class="staff-detail-block">

            <span class="staff-detail-label">
                TEAM
            </span>

            <div class="staff-chip-row">

                ${
                    teamNames.length
                        ? teamNames
                            .map(
                                team => `
                                    <span class="staff-chip">
                                        ${escapeHtml(
                                            team
                                        )}
                                    </span>
                                `
                            )
                            .join("")
                        : `
                            <span class="staff-detail-empty">
                                No team assigned.
                            </span>
                        `
                }

            </div>

        </div>


        <div class="staff-detail-block">

            <span class="staff-detail-label">
                LOCATION
            </span>

            <div class="staff-chip-row">

                <span class="staff-chip">
                    ${escapeHtml(
                        employee.location_name ||
                        "No location assigned"
                    )}
                </span>

            </div>

        </div>


        <div class="staff-detail-block">

            <span class="staff-detail-label">
                LAST ACTIVITY
            </span>

            <div class="staff-detail-empty">
                Activity tracking will appear here
                when the audit system is connected.
            </div>

        </div>


        <div class="staff-detail-actions">

            <button
                type="button"
                data-staff-edit-id="${escapeHtml(
                    String(employee.id)
                )}"
            >
                Edit Staff
            </button>

            <button
                type="button"
                data-staff-toggle-id="${escapeHtml(
                    String(employee.id)
                )}"
                class="danger"
            >
                ${
                    employee.is_active
                        ? "Deactivate"
                        : "Activate"
                }
            </button>

        </div>
    `;

}


function openAdminStaffDrawer(
    name,
    role,
    content
) {

    const drawer =
        document.getElementById(
            "admin-staff-drawer"
        );

    const backdrop =
        document.getElementById(
            "admin-staff-drawer-backdrop"
        );

    const drawerName =
        document.getElementById(
            "staff-drawer-name"
        );

    const drawerRole =
        document.getElementById(
            "staff-drawer-role"
        );

    const drawerContent =
        document.getElementById(
            "staff-drawer-content"
        );


    if (
        !drawer ||
        !backdrop ||
        !drawerContent
    ) {
        return;
    }


    drawerName.textContent =
        name || "Staff";

    drawerRole.textContent =
        role || "—";

    drawerContent.innerHTML =
        content;


    drawer.classList.add(
        "open"
    );

    drawer.setAttribute(
        "aria-hidden",
        "false"
    );

    backdrop.hidden = false;


    drawerContent
        .querySelectorAll(
            "[data-employee-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openAdminEmployeeDrawer(
                        button.dataset.employeeId
                    );

                }
            );

        });


    drawerContent
        .querySelectorAll(
            "[data-staff-edit-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    editAdminStaff(
                        button.dataset.staffEditId
                    );

                }
            );

        });


    drawerContent
        .querySelectorAll(
            "[data-staff-toggle-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    toggleAdminStaff(
                        button.dataset.staffToggleId
                    );

                }
            );

        });

}


function closeAdminStaffDrawer() {

    const drawer =
        document.getElementById(
            "admin-staff-drawer"
        );

    const backdrop =
        document.getElementById(
            "admin-staff-drawer-backdrop"
        );


    if (drawer) {

        drawer.classList.remove(
            "open"
        );

        drawer.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (backdrop) {
        backdrop.hidden = true;
    }

}


async function toggleAdminStaff(id) {

    const data =
        CleanTrack.adminStaffData;

    if (!data) {
        return;
    }


    const person =
        findAdminStaffPerson(id);

    if (!person) {
        return;
    }


    try {

        await CleanTrack.api.request(
            `/api/users/${encodeURIComponent(id)}`,
            {
                method: "PUT",
                body: JSON.stringify({
                    is_active:
                        !person.is_active
                })
            }
        );

        closeAdminStaffDrawer();

        await loadAdminStaffData();

    } catch (error) {

        console.error(
            "Unable to update staff status:",
            error
        );

    }

}


function findAdminStaffPerson(id) {

    const data =
        CleanTrack.adminStaffData;

    if (!data) {
        return null;
    }


    for (
        const supervisor
        of data.supervisors || []
    ) {

        if (
            String(supervisor.id) ===
            String(id)
        ) {
            return supervisor;
        }


        const employee =
            (supervisor.employees || [])
                .find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

        if (employee) {
            return employee;
        }

    }


    return (
        data.unassigned_employees || []
    ).find(
        employee =>
            String(employee.id) ===
            String(id)
    ) || null;

}


function editAdminStaff(id) {

    const person =
        findAdminStaffPerson(id);

    const data =
        CleanTrack.adminStaffData;

    if (!person || !data) {
        return;
    }


    const teams =
        data.teams || [];

    const locations =
        data.locations || [];


    const currentTeamId =
        (
            person.team_ids ||
            []
        )[0] || "";


    const currentLocationId =
        person.location_id || "";


    openAdminStaffDrawer(
        person.name,
        person.role === "supervisor"
            ? "Supervisor"
            : person.role === "admin"
                ? "Administrator"
                : "Employee",
        `
            <form
                class="staff-edit-form"
                id="admin-staff-edit-form"
            >

                <label>
                    Full name

                    <input
                        name="name"
                        value="${escapeHtml(
                            person.name || ""
                        )}"
                        required
                    />
                </label>


                <label>
                    Email

                    <input
                        type="email"
                        name="email"
                        value="${escapeHtml(
                            person.email || ""
                        )}"
                    />
                </label>


                <label>
                    Phone

                    <input
                        name="phone"
                        value="${escapeHtml(
                            person.phone || ""
                        )}"
                    />
                </label>


                <label>
                    Employee ID

                    <input
                        name="employee_id"
                        value="${escapeHtml(
                            person.employee_id || ""
                        )}"
                    />
                </label>


                <label>
                    Role

                    <select name="role">

                        <option
                            value="employee"
                            ${person.role === "employee"
                                ? "selected"
                                : ""}
                        >
                            Employee
                        </option>

                        <option
                            value="supervisor"
                            ${person.role === "supervisor"
                                ? "selected"
                                : ""}
                        >
                            Supervisor
                        </option>

                        <option
                            value="admin"
                            ${person.role === "admin"
                                ? "selected"
                                : ""}
                        >
                            Administrator
                        </option>

                    </select>
                </label>


                <label>
                    Team

                    <select name="team_id">

                        <option value="">
                            No team
                        </option>

                        ${teams
                            .map(
                                team => `
                                    <option
                                        value="${escapeHtml(
                                            String(team.id)
                                        )}"
                                        ${
                                            String(
                                                team.id
                                            ) ===
                                            String(
                                                currentTeamId
                                            )
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${escapeHtml(
                                            team.name
                                        )}
                                    </option>
                                `
                            )
                            .join("")}

                    </select>
                </label>


                <label>
                    Location

                    <select name="location_id">

                        <option value="">
                            No location
                        </option>

                        ${locations
                            .map(
                                location => `
                                    <option
                                        value="${escapeHtml(
                                            String(
                                                location.id
                                            )
                                        )}"
                                        ${
                                            String(
                                                location.id
                                            ) ===
                                            String(
                                                currentLocationId
                                            )
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${escapeHtml(
                                            location.name
                                        )}
                                    </option>
                                `
                            )
                            .join("")}

                    </select>
                </label>


                <div class="staff-detail-actions">

                    <button
                        type="button"
                        data-staff-cancel-edit
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary"
                    >
                        Save Changes
                    </button>

                </div>

            </form>
        `
    );


    const form =
        document.getElementById(
            "admin-staff-edit-form"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const formData =
                new FormData(form);


            const nextRole =
                String(
                    formData.get("role") || ""
                );


            const roleChanged =
                nextRole !==
                String(person.role || "");


            if (
                nextRole === "admin" &&
                person.role !== "admin"
            ) {

                const confirmed =
                    window.confirm(
                        "Grant this person Administrator access? " +
                        "This gives them organization-wide admin permissions."
                    );


                if (!confirmed) {
                    return;
                }

            }


            try {

                await CleanTrack.api.request(
                    `/api/users/${encodeURIComponent(id)}`,
                    {
                        method: "PUT",

                        body: JSON.stringify({

                            name:
                                formData.get("name"),

                            email:
                                formData.get("email"),

                            phone:
                                formData.get("phone"),

                            employee_id:
                                formData.get(
                                    "employee_id"
                                ),

                            role:
                                nextRole,

                            team_id:
                                formData.get(
                                    "team_id"
                                ) || null,

                            location_id:
                                formData.get(
                                    "location_id"
                                ) || null

                        })
                    }
                );


                await loadAdminStaffData();

                closeAdminStaffDrawer();


            } catch (error) {

                console.error(
                    "Unable to update staff:",
                    error
                );

            }

        }
    );


    const cancel =
        form.querySelector(
            "[data-staff-cancel-edit]"
        );


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeAdminStaffDrawer
        );

    }

}


function exportAdminStaffCsv() {

    const data =
        CleanTrack.adminStaffData;

    if (!data) {
        return;
    }


    const rows = [
        [
            "Name",
            "Role",
            "Email",
            "Phone",
            "Employee ID",
            "Status",
            "Teams",
            "Locations"
        ]
    ];


    (data.supervisors || [])
        .forEach(supervisor => {

            rows.push([
                supervisor.name || "",
                "Supervisor",
                supervisor.email || "",
                supervisor.phone || "",
                supervisor.employee_id || "",
                supervisor.is_active
                    ? "Active"
                    : "Inactive",
                (supervisor.teams || [])
                    .map(team => team.name)
                    .join("; "),
                (supervisor.location_names || [])
                    .join("; ")
            ]);

            (supervisor.employees || [])
                .forEach(employee => {

                    rows.push([
                        employee.name || "",
                        "Employee",
                        employee.email || "",
                        employee.phone || "",
                        employee.employee_id || "",
                        employee.is_active
                            ? "Active"
                            : "Inactive",
                        (employee.team_names || [])
                            .join("; "),
                        employee.location_name || ""
                    ]);

                });

        });


    (data.unassigned_employees || [])
        .forEach(employee => {

            rows.push([
                employee.name || "",
                "Employee",
                employee.email || "",
                employee.phone || "",
                employee.employee_id || "",
                employee.is_active
                    ? "Active"
                    : "Inactive",
                "",
                employee.location_name || ""
            ]);

        });


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(value => {

                            const text =
                                String(
                                    value ?? ""
                                )
                                    .replace(
                                        /"/g,
                                        '""'
                                    );

                            return `"${text}"`;

                        })
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "cleantrack-staff.csv";

    link.click();

    URL.revokeObjectURL(url);

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

if (page === "staff") {

    const role =
        String(
            CleanTrack.currentUser?.role || ""
        ).toLowerCase();

    if (role === "admin") {
        renderAdminStaff();
        return;
    }

    renderPlaceholder(page);
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