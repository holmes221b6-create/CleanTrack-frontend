window.CleanTrack = window.CleanTrack || {};

CleanTrack.navigation = (() => {

    function getUser() {
        return CleanTrack.currentUser || {};
    }

    function getRole() {
        return String(getUser().role || "").toLowerCase();
    }

    function getNavigationItems() {

        const role = getRole();

        const commonStart = [
            {
                id: "home",
                label: "Home",
                icon: "\u2302"
            }
        ];

        const commonEnd = [
            {
                id: "profile",
                label: "Profile",
                icon: "\u25c9"
            }
        ];

        if (role === "admin") {
            return [
                ...commonStart,

                {
                    id: "dashboard",
                    label: "Dashboard",
                    icon: "\u25a3"
                },
                {
                    id: "tasks",
                    label: "Tasks",
                    icon: "\u2713"
                },
                {
                    id: "staff",
                    label: "Staff",
                    icon: "\u2659"
                },
                {
                    id: "teams",
                    label: "Teams",
                    icon: "\u265f"
                },
                {
                    id: "zones",
                    label: "Zones",
                    icon: "\u25ab"
                },
                {
                    id: "locations",
                    label: "Locations",
                    icon: "\u2306"
                },
                {
                    id: "logs",
                    label: "Cleaning Logs",
                    icon: "\u25a4"
                },
                {
                    id: "analytics",
                    label: "Analytics",
                    icon: "\u25c8"
                },
                {
                    id: "reports",
                    label: "Reports",
                    icon: "\u25a5"
                },
                {
                    id: "alerts",
                    label: "Alerts",
                    icon: "!"
                },

                ...commonEnd
            ];
        }

        if (role === "supervisor") {
            return [
                ...commonStart,

                {
                    id: "dashboard",
                    label: "Team Dashboard",
                    icon: "\u25a3"
                },
                {
                    id: "team",
                    label: "My Team",
                    icon: "\u265f"
                },
                {
                    id: "tasks",
                    label: "Team Tasks",
                    icon: "\u2713"
                },
                {
                    id: "staff",
                    label: "Team Staff",
                    icon: "\u2659"
                },
                {
                    id: "zones",
                    label: "Zones",
                    icon: "\u25ab"
                },
                {
                    id: "locations",
                    label: "Locations",
                    icon: "\u2306"
                },
                {
                    id: "logs",
                    label: "Cleaning Logs",
                    icon: "\u25a4"
                },
                {
                    id: "analytics",
                    label: "Team Analytics",
                    icon: "\u25c8"
                },
                {
                    id: "reports",
                    label: "Team Reports",
                    icon: "\u25a5"
                },
                {
                    id: "alerts",
                    label: "Alerts",
                    icon: "!"
                },

                ...commonEnd
            ];
        }

        if (role === "employee" || role === "staff") {
            return [
                ...commonStart,

                {
                    id: "dashboard",
                    label: "My Dashboard",
                    icon: "\u25a3"
                },
                {
                    id: "tasks",
                    label: "My Tasks",
                    icon: "\u2713"
                },
                {
                    id: "activity",
                    label: "My Activity",
                    icon: "\u25c7"
                },
                {
                    id: "performance",
                    label: "My Performance",
                    icon: "\u25c8"
                },
                {
                    id: "zones",
                    label: "My Zones",
                    icon: "\u25ab"
                },
                {
                    id: "alerts",
                    label: "Alerts",
                    icon: "!"
                },

                ...commonEnd
            ];
        }

        return [
            ...commonStart,
            ...commonEnd
        ];
    }

    function render() {

        const navigation =
            document.getElementById("main-navigation");

        if (!navigation) {
            return;
        }

        const items = getNavigationItems();

        navigation.innerHTML = items.map(item => `
            <button
                type="button"
                class="nav-item"
                data-page="${item.id}"
            >
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
            </button>
        `).join("");

        navigation
            .querySelectorAll(".nav-item")
            .forEach(button => {

                button.addEventListener("click", () => {

                    const page =
                        button.dataset.page;

                    setActive(page);

                    if (
                        CleanTrack.app &&
                        typeof CleanTrack.app.loadPage === "function"
                    ) {
                        CleanTrack.app.loadPage(page);
                    }

                });

            });

        setActive("home");
    }

    function setActive(pageId) {

        document
            .querySelectorAll(".nav-item")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page === pageId
                );

            });

    }

    return {
        render,
        setActive,
        getNavigationItems
    };

})();