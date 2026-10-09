CURRENT APP TYPE:
Vanilla HTML/CSS/JS (Client-Side Only)

PACKAGE.JSON:
ABSENT

CURRENT RUN METHOD:
node preview.cjs (Local HTTP Server)

PREVIEW.CJS PURPOSE:
Dependency-free, loopback-only local HTTP static file server to serve the frontend on port 4177 without CORS issues.

FILE:// SAFE:
NO
Reason: Modern browser CORS policies and ES modules/fetch API behavior heavily restrict ile:// origins, breaking the authentication flow and API requests to the Railway backend.

RUNTIME FILES REQUIRED:
index.html
app.js
auth-client.js
event-timers.js
roadmap.js
roadmap-data.js
styles.css
assets/ (entire folder)

CURRENT API BASE:
https://mdarb3bot-production.up.railway.app

REQUIRED BACKEND ENDPOINTS:
GET /api/auth/aion2-guilds
GET /api/auth/aion2-leaderboard
GET /api/auth/aion2-lfg
POST /api/auth/aion2-lfg/create
POST /api/auth/aion2-lfg/join
POST /api/auth/aion2-lfg/leave
POST /api/auth/aion2-lfg/close
POST /api/auth/aion2-lfg/vote
GET /api/auth/aion2-notifications
POST /api/auth/login
POST /api/auth/exchange
GET /api/auth/me
GET /api/auth/aion2-chat
POST /api/auth/aion2-chat

LOCAL BACKEND CHANGES REQUIRED IN PRODUCTION:
- GET /api/auth/aion2-chat (Phase 10)
- POST /api/auth/aion2-chat (Phase 10)
- GET /api/auth/aion2-notifications (Phase 9)
- POST /api/auth/aion2-lfg/vote (Completion Voting cores - Phase 8)
- Updated AION_AUTH_ORIGINS environment variable to include the desktop origin.

BACKEND DEPLOYMENT REQUIRED BEFORE FINAL RELEASE:
YES

CURRENT AUTH FLOW:
Frontend requests PKCE challenge -> window.open(Discord OAuth URL) -> Discord redirects to Railway backend (/api/auth/callback) -> Backend finalizes OAuth and renders a "close this window" HTML page -> Frontend polls /api/auth/exchange -> Receives session token -> Stores in sessionStorage.

CURRENT OAUTH REDIRECT:
Redirects directly to the Railway backend (e.g., https://mdarb3bot-production.up.railway.app/api/auth/callback) which processes the code and renders a static HTML page.

SESSION STORAGE:
The backend returns a custom Bearer token to the frontend, which stores it in browser sessionStorage. Subsequent requests include it in the Authorization header.

DESKTOP AUTH WORKS UNCHANGED:
YES

AUTH PACKAGING CHANGE REQUIRED:
YES
Electron must be configured to allow window.open to create a managed BrowserWindow or use a secure IPC flow to open the system browser and intercept the redirect (though the current flow works if the Electron popup can just be closed by the frontend script popup.close()).

RECOMMENDED PACKAGING PLATFORM:
ELECTRON

WHY:
Lowest risk to the existing vanilla JS project. Electron natively supports sessionStorage, window.open behavior required by the current Auth flow, and seamlessly handles the existing DOM manipulations (innerHTML) and polling loops without requiring a build step, frontend rewrite, or complex Rust backend bridging.

PACKAGING SECURITY REQUIREMENTS:
- nodeIntegration: false
- contextIsolation: true
- sandbox: true
- Restrict window.open explicitly to Discord OAuth endpoints.
- Intercept external link clicks (target="_blank") and route them to the OS default browser via shell.openExternal.
- Strict Content-Security-Policy (CSP) restricting connect-src to Railway and img-src to Discord CDNs.

BANNER MODE:
Currently rendered via CSS classes modifying the DOM layout within the single browser window.

MINI MODE:
Currently rendered via CSS classes modifying the DOM layout within the single browser window.

ALWAYS-ON-TOP POSSIBLE LATER:
YES (Electron natively supports win.setAlwaysOnTop(true))

ROADMAP PACKAGING COMPATIBLE:
YES

TIMERS PACKAGING COMPATIBLE:
YES

ALERT SOUNDS PACKAGING COMPATIBLE:
YES

LOCALSTORAGE PACKAGING COMPATIBLE:
YES

NOTIFICATION LOCAL READ STATE COMPATIBLE:
YES

NETWORK/CORS CHANGES REQUIRED:
YES
The Railway environment variable AION_AUTH_ORIGINS must be updated to include the origin used by the Electron wrapper (e.g., pp://- or ile:// if explicitly allowed).

DESKTOP SECURITY RISKS:
- Heavy reliance on innerHTML for dynamic content rendering (susceptible to XSS if a Discord username/message circumvents escapeHTML).
- Loading remote images (Discord avatars, attachments) directly in the DOM.

FRONTEND SECRETS:
NONE

BACKEND SECRETS WOULD BE PACKAGED:
NO

??????????????????
RUNTIME TEST STATUS
??????????????????

Auth/Profile:
STATIC ONLY

Guild Members/Stats:
STATIC ONLY

Points/Leaderboard:
STATIC ONLY

LFG Read:
STATIC ONLY

LFG Create:
STATIC ONLY

LFG Join:
STATIC ONLY

LFG Leave:
STATIC ONLY

LFG Close:
STATIC ONLY

Voting:
STATIC ONLY

Notifications:
STATIC ONLY

Chat History:
STATIC ONLY

Chat Send:
STATIC ONLY

Roadmap/Timers:
STATIC ONLY

??????????????????
MINIMUM RELEASE TESTS
??????????????????

1. Launch application and verify UI renders.
2. Click Login and verify Discord OAuth popup flow completes.
3. Verify Profile, Guild Stats, and Leaderboard fetch and render correctly.
4. Verify LFG groups are fetched and displayed.
5. Perform LFG Join on an existing group (Requires Production Action).
6. Perform Completion Voting on a group (Requires Production Action).
7. Verify Notifications polling fetches real notifications.
8. Send a chat message and verify it appears (Requires Production Action).
9. Test Banner/Mini mode transitions.
10. Test Logout successfully clears session.

TESTS REQUIRING REAL PRODUCTION ACTION:
- LFG Join
- Completion Voting
- Chat Send

TESTS SAFE WITHOUT PRODUCTION MUTATION:
- App Launch
- Discord Login
- Profile/Stats/Leaderboard Load
- LFG Read
- Notifications Read
- Chat History Read
- Banner/Mini Modes
- Logout

??????????????????
PRODUCTION DEPLOYMENT SAFETY
??????????????????

RAILWAY HEALTHCHECK VERIFIED:
NOT VERIFIED

ZERO-DOWNTIME DEPLOYMENT VERIFIED:
NOT VERIFIED

ROLLBACK PROCEDURE VERIFIED:
NOT VERIFIED

DATABASE MIGRATION REQUIRED FOR LOCAL INTEGRATION:
UNKNOWN (Phase 8/9 features use existing tables but may require schema verification on Railway)

REGISTRATION CONTINUITY RISK:
HIGH
Reason: Deploying the bot to Railway interrupts the node process. If a member is actively using the Discord slash commands or Voice channels during the restart, their registration flow or group state could be interrupted or lost.

PRE-DEPLOYMENT SAFETY CHECKS REQUIRED:
- Verify Railway healthcheck configuration to ensure the bot starts cleanly before traffic is routed.
- Verify Phase 8/9/10 SQL schemas exist in the production PostgreSQL instance.
- Review Discord API rate limits upon bot mass-restart.
- Schedule the deployment during a known low-traffic window.

??????????????????
PACKAGING
??????????????????

RECOMMENDED INSTALLER:
electron-builder (NSIS)

EXPECTED INSTALLER OUTPUT:
M3RGEEN-Aion2-Setup.exe (Installer) and a standalone unpacked executable.

DESKTOP SHORTCUT:
YES

START MENU:
YES

UNINSTALL:
YES

APP ICON:
YES

VERSION METADATA:
YES

FILES TO EXCLUDE FROM RELEASE:
- preview.cjs
- verify.cjs
- AUTH-SETUP.md
- README.md
- FINAL_REPORT.md
- dungeon-icons-review.jpg
- about-latest.png

AUTO UPDATE POSSIBLE LATER:
YES (via electron-updater)

FINAL DESKTOP ARCHITECTURE:
Windows Desktop App (Electron EXE) -> Secure context-isolated Chromium wrapper -> Vanilla UI (app.js/auth-client.js) -> HTTPS requests -> Railway Node.js backend -> PostgreSQL/Discord.

PACKAGING BLOCKERS:
- package.json is missing and needs initialization.
- Electron main process script (e.g., main.js) needs to be written to handle window creation, window.open interception, and security defaults.
- Backend APIs for Chat and Notifications are not yet deployed to Railway, and CORS origin is not yet configured for the desktop app.

SAFE TO BEGIN PACKAGING:
YES (Locally only, pending backend deployment).

??????????????????
PRODUCTION FREEZE CONFIRMATION
??????????????????

LIVE BOT MODIFIED:
NO

LIVE BOT RESTARTED:
NO

RAILWAY ACTION PERFORMED:
NO

GIT PUSHED:
NO

PRODUCTION DATABASE WRITE:
NO

REGISTRATION SYSTEM TOUCHED:
NO

SHUGO SYSTEM TOUCHED:
NO

LIVE WORKERS TOUCHED:
NO

DISCORD CONFIGURATION TOUCHED:
NO

PRODUCTION TEST PERFORMED:
NO

FILES CHANGED:
NONE
