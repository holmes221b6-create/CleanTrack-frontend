// ============================================================
// CleanTrack Application Bootstrap
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("CleanTrack starting...");

    try {

        await CleanTrack.auth.initialize();

        console.log("CleanTrack initialized.");

    } catch (error) {

        console.error(
            "CleanTrack initialization failed:",
            error
        );

    }

    // --------------------------------------------------------
    // Logout
    // --------------------------------------------------------

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

});

