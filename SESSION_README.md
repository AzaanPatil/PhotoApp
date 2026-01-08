Session handling and tests

Overview

This project uses `express-session` to keep server-side sessions. When a user logs in, the server sets a session cookie. The frontend must send that cookie with subsequent requests (including after a browser refresh) so the server can restore the session.

What I changed

- Ensured the frontend sends cookies with XHR requests by setting `axios.defaults.withCredentials = true` in `photoShare.jsx`.
- The server uses `express-session` (cookie `connect.sid`) and `GET /admin/session` to report the active session; the frontend calls this on app mount to restore login state.
- Passwords are now salted and hashed (`password.js`), and registration/login use the salted hashes.

Run & Test Instructions (Windows / PowerShell)

1. Install dependencies (run once):

```powershell
npm install
```

2. Load initial data (optional):

```powershell
node loadDatabase.js
```

3. Start the server (in one terminal):

```powershell
node webServer.js
```

4. Run server tests (in another terminal):

```powershell
npm test
```

Notes

- `npm test` will run the Mocha tests: `test/serverApiTest.js`, `test/sessionInputApiTest.js`, and `test/passwordTest.js`.
- If running tests locally, make sure MongoDB is running on `mongodb://127.0.0.1/project6`.
- If your browser is served from a different origin than the server, ensure the server and client allow cross-site cookies and set appropriate CORS settings. For same-origin setups no extra CORS changes are required.

Troubleshooting

- If `npm` is not available in your environment, install Node.js (which includes npm) from https://nodejs.org/.
- If tests fail due to missing seed data, run `node loadDatabase.js` then restart the server and re-run tests.
