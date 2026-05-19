# NeilProfile — Local Preview + Resume Upload

This repository contains a minimal portfolio (`index.html`) with a client-side resume upload UI and an optional small Express server to accept resume uploads and save them to disk.

Quick setup (recommended - server upload):

1. Install Node.js (if you don't have it).
2. From this folder, install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open http://localhost:5500 in your browser. Use the "Upload resume (PDF)" button in the Resume panel — the client will POST to `/upload` and the server will store the file in `uploads/`.

Notes:
- If the server is not running, the client will fallback to storing the resume data URL in `localStorage` so it remains downloadable from the page.
- Uploaded files are saved in the `uploads/` directory. Filenames are prefixed with a timestamp.
- The server is intentionally small and meant for local use only. Do not expose it to the public without adding authentication and security controls.
