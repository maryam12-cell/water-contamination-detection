# Water Contamination Detection & Crop Recommendation

Final Year Project (FYP).

## Purpose

Help farmers decide whether a water source is safe for irrigation and which crops suit it:

1. **Water contamination detection**: the user uploads a photo of a water source (river, lake, pond, canal, etc.). A CNN model classifies it as `contaminated` or `not_contaminated`.
2. **Crop recommendation**: based on the water-quality result (and other inputs added later), the app recommends suitable crops.

## Tech Stack

| Layer        | Technology                              | Location      | Port |
|--------------|-----------------------------------------|---------------|------|
| Frontend     | React 19 + Vite + Tailwind CSS v4       | `client/`     | 5173 |
| Backend API  | Express.js 5 (Node.js, ES modules)      | `server/`     | 3001 |
| Database     | SQLite via `better-sqlite3`             | `server/data/app.db` | – |
| Auth         | bcryptjs (password hashing) + JWT in httpOnly cookie | `server/src/middleware/auth.js` | – |
| ML service *(planned)* | Python Flask + MobileNet CNN  | `ml-service/` (not created yet) | 5000 |

## Folder Structure

```
.
├── client/                 # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── App.jsx         # routes (react-router)
│   │   ├── api.js          # fetch wrapper: api('/path', { method, body })
│   │   ├── context/AuthContext.jsx   # current user, login/register/logout
│   │   ├── components/     # AppLayout (sidebar), RouteGuards, AuthForm, PageHeader, RoleBadge
│   │   ├── pages/          # Login, Register, Dashboard, UploadSample, Settings, ComingSoon (placeholder)
│   │   └── index.css       # contains `@import "tailwindcss";`
│   └── vite.config.js      # Tailwind plugin + /api proxy -> localhost:3001
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.js        # app entry, mounts routes
│   │   ├── db.js           # SQLite connection + table schema (CREATE TABLE IF NOT EXISTS)
│   │   ├── analysis/       # analyzeSample(): sensor thresholds now, CNN later (see below)
│   │   ├── middleware/     # auth.js (JWT cookie, requireAuth, requireRole), upload.js (multer image upload)
│   │   ├── routes/         # auth.js (/api/auth), admin.js (/api/admin), samples.js (/api/samples)
│   │   └── scripts/createAdmin.js
│   ├── .env                # PORT, JWT_SECRET (git-ignored; see .env.example)
│   ├── uploads/            # uploaded sample images, random UUID names (git-ignored)
│   └── data/               # SQLite database file (git-ignored)
├── water_dataset/          # training images for the CNN
│   ├── contaminated/
│   └── not_contaminated/
├── dataset_generator.py    # script that generated the image dataset
├── package.json            # root scripts (runs client + server together)
└── CLAUDE.md
```

## Commands

Run from the project root:

- `npm run install:all`: install dependencies for root, server and client
- `npm run dev`: start backend (3001) and frontend (5173) together using `concurrently`
- `npm test --prefix server`: run server unit tests (Node built-in test runner, `*.test.js`)
- `npm run create-admin --prefix server -- <email> <password> [name]`: create an admin (or promote an existing user)

First-time setup: copy `server/.env.example` to `server/.env` and set a random `JWT_SECRET`.

Open the app at http://localhost:5173. Health check: http://localhost:5173/api/health

## Database

Schema lives in `server/src/db.js` and is created on server start. Foreign keys are ON.

- `users`: name, email (unique, case-insensitive), password_hash (bcrypt), role `user` | `admin`
- `samples`: user_id, location, source_type (`river` | `lake` | `pond` | `stream`), sensor readings (`ph`, `turbidity` NTU, `tds` mg/L, `temperature` °C), image_path (relative to `server/`, e.g. `uploads/<uuid>.jpg`)
- `analysis_results`: sample_id, is_contaminated (0/1), confidence (0–1), model_version, notes
- `crop_recommendations`: analysis_id, crop_name, suitability_score (0–100), reason

Chain: users → samples → analysis_results → crop_recommendations (all `ON DELETE CASCADE`).

Schema changes to existing tables need a migration in `db.js` (SQLite can't alter CHECK constraints, so rebuild the table; see the `samples` migration). Water body types live in `WATER_BODY_TYPES` in `db.js`.

## Auth

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/admin/users` (admin only)
- `GET /api/samples/summary`: `{ total, contaminated, safe, pending }` from each sample's latest analysis. Admin sees all samples, users only their own.
- The JWT is stored in an httpOnly cookie named `token` (7 days). Never store tokens in localStorage.
- Registration always creates role `user`. Admins are only created via the `create-admin` script.
- Protect routes with `requireAuth`, and add `requireRole('admin')` for admin-only routes.
- On the frontend, wrap private pages in `<ProtectedRoute />` and use `useAuth()` for the current user.

## Sample Upload & Analysis

- `POST /api/samples` (multipart/form-data): `image` (JPG/JPEG/PNG, max 10 MB, file signature checked), `ph`, `turbidity`, `tds`, `temperature`, `sourceType`, optional `location`. All readings are required. Saves the sample and its analysis in one transaction, and returns `{ sample, analysis: { status, confidence, checks, reasons, ... } }`. The uploaded file is deleted if validation or saving fails.
- All analysis goes through `analyzeSample()` in `server/src/analysis/index.js`. Routes must not call individual analysers directly.
- Current method: `sensorAnalysis.js` (`model_version = 'sensor-thresholds-v1'`). Contaminated if pH < 6.0 or > 9.0, turbidity > 10 NTU, or TDS > 500 mg/L. Temperature is stored but not used.
- Confidence (0.5–1.0): contaminated → how far the worst reading is beyond its limit (double the limit, or 1 pH unit, = 1.0); safe → how far the reading closest to a limit is inside it. A reading exactly on a limit = 0.5.
- **Adding the CNN:** implement `predictImage(imagePath)` (call Flask `POST /predict`) and combine it with the sensor result inside `analyzeSample()`. The route, DB and frontend already handle `{ isContaminated, confidence, modelVersion, checks, reasons }`.

## Frontend Layout

- Logged-in pages render inside `AppLayout`: a fixed left sidebar on `lg` screens, and a top bar with a slide-in drawer on smaller screens.
- Sidebar links: `/dashboard`, `/upload`, `/crops`, `/reports`, `/settings`, plus Logout. To add a page, add it to `NAV_ITEMS` in `AppLayout.jsx` and as a route inside the `<AppLayout />` route in `App.jsx`.
- NFR-03 (responsive): every page must work at 375px width with no horizontal scroll. Use mobile-first Tailwind classes (`grid-cols-1 sm:grid-cols-3`), and wrap wide tables in `overflow-x-auto`.
- Icons come from `lucide-react`.

## Conventions

- All backend routes are prefixed with `/api`. The frontend calls relative URLs (`fetch('/api/...')`) and the Vite dev proxy forwards them to port 3001. Don't hard-code `localhost:3001` in client code.
- Server code uses ES modules (`import`/`export`), and imports of local files include the `.js` extension.
- Style the UI with Tailwind utility classes. Avoid separate CSS files.
- Never commit the SQLite database file (`server/data/*.db`).

## Planned: ML Service

- A separate Python Flask app in `ml-service/` will load a MobileNet model trained on `water_dataset/`.
- It will expose a prediction endpoint (e.g. `POST /predict` with an image) on port 5000.
- The Express backend will call it and store results in SQLite. The frontend will never call Flask directly.
