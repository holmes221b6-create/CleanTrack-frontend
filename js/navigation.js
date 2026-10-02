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

        if (role === "admin") {
            return [
                {
                    id: "dashboard",
                    label: "Dashboard",
                    icon: "▣"
                },
                {
                    id: "tasks",
                    label: "Tasks",
                    icon: "✓"
                },
                {
                    id: "staff",
                    label: "Staff",
                    icon: "♙"
                },
                {
                    id: "teams",
                    label: "Teams",
                    icon: "♟"
                },
                {
                    id: "zones",
                    label: "Zones",
                    icon: "⌂"
                },
                {
                    id: "locations",
                    label: "Locations",
                    icon: "⌖"
                },
                {
                    id: "logs",
                    label: "Cleaning Logs",
                    icon: "▤"
                },
                {
                    id: "analytics",
                    label: "Analytics",
                    icon: "◈"
                },
                {
                    id: "reports",
                    label: "Reports",
                    icon: "▥"
                },
                {
                    id: "alerts",
                    label: "Alerts",
                    icon: "!"
                }
            ];
        }

        if (role === "supervisor") {
            return [
                {
                    id: "dashboard",
                    label: "Team Dashboard",
                    icon: "▣"
                },
                {
                    id: "team",
                    label: "My Team",
                    icon: "♟"
                },
                {
                    id: "tasks",
                    label: "Team Tasks",
                    icon: "✓"
                },
                {
                    id: "staff",
                    label: "Team Staff",
                    icon: "♙"
                },
                {
                    id: "zones",
                    label: "Zones",
                    icon: "⌂"
                },
                {
                    id: "locations",
                    label: "Locations",
                    icon: "⌖"
                },
                {
                    id: "logs",
                    label: "Cleaning Logs",
                    icon: "▤"
                },
                {
                    id: "analytics",
                    label: "Team Analytics",
                    icon: "◈"
                },
                {
                    id: "reports",
                    label: "Team Reports",
                    icon: "▥"
                },
                {
                    id: "alerts",
                    label: "Alerts",
                    icon: "!"
                }
            ];
        }

        if (role === "employee" || role === "staff") {
            return [
                {
                    id: "dashboard",
                    label: "My Dashboard",
                    icon: "▣"
                },
                {
                    id: "tasks",
                    label: "My Tasks",
                    icon: "✓"
                },
                {
                    id: "activity",
                    label: "My Activity",
                    icon: "◷"
                },
                {
                    id: "performance",
                    label: "My Performance",
                    icon: "◈"
                },
                {
                    id: "zones",
                    label: "My Zones",
                    icon: "⌂"
                },
                {
                    id: "alerts",
                    label: "Alerts",
                    icon: "!"
                }
            ];
        }

        return [
            {
                id: "dashboard",
                label: "Dashboard",
                icon: "▣"
            }
        ];
    }

    function render() {

        const navigation = document.getElementById("main-navigation");

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

        navigation.querySelectorAll(".nav-item").forEach(button => {

            button.addEventListener("click", () => {

                const page = button.dataset.page;

                setActive(page);

                if (CleanTrack.app &&
                    typeof CleanTrack.app.loadPage === "function") {

                    CleanTrack.app.loadPage(page);
                }
            });

        });

        setActive("dashboard");
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