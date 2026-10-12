CleanTrack sidebar patch

Purpose
- Moves the existing #workspace-navigation into a left sidebar.
- Keeps the existing navigation renderer and route buttons.
- Adds a three-dot Menu control to collapse/expand the sidebar.
- On narrow screens, the control opens/closes the navigation drawer.

Install into:
  C:\Users\moham\OneDrive\Desktop\frontbackfile\frontendfile\frontendfile-restored

1) Copy js\sidebar-layout.js into the project's js folder.
2) Copy css\sidebar-layout.css into the project's css folder.
3) In index.html, add this stylesheet inside <head>, after the other CSS:
   <link rel="stylesheet" href="css/sidebar-layout.css">
4) Add this script after js/app.js (near the end of the existing deferred script list):
   <script src="js/sidebar-layout.js" defer></script>

Do not remove or rename existing navigation.js/app.js.
The patch targets #workspace-view and #workspace-navigation, which are the IDs in the current CleanTrack frontend context.
If your index.html already contains an old sidebar, do not install this on top of it.
