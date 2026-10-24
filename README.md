# TripTally — AI-Powered Collaborative Group Travel Planner & Expense Hub

[![Tests](https://img.shields.io/badge/tests-187%20passed%20(100%25)-1B4332.svg)](https://github.com)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-4285F4.svg)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/license-MIT-E07A5F.svg)](LICENSE)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite%206-61DAFB.svg)](https://vitejs.dev)
[![Node](https://img.shields.io/badge/backend-Express%20%2B%20Node.js-339933.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/database-MongoDB%20Atlas-47A248.svg)](https://www.mongodb.com)

TripTally is an AI-powered, collaborative group travel workspace and expense tallying platform tailored for Indian and global travellers. Built with an editorial travel aesthetic — featuring a warm ivory canvas, deep forest green accents, terracotta highlights, and Google Fonts (*Plus Jakarta Sans* and *Playfair Display*).

---

## 📸 Application Preview

| Dynamic Interactive Hero & Indian Circuits | Collaborative Dashboard & Rupee Tally |
| :---: | :---: |
| ![TripTally Hero Showcase](docs/screenshots/landing_hero_3d.png) | ![TripTally Dashboard](docs/screenshots/dashboard_overview.png) |

| Gemini AI Trip Planner & Itinerary Generator | Interactive Destination Map (Leaflet) |
| :---: | :---: |
| ![Gemini AI Trip Planner](docs/screenshots/ai_trip_planner.png) | ![Interactive Map View](docs/screenshots/trip_map_view.png) |

| Collaborative Trip Workspace (Rishikesh Circuit) | Mobile Responsive View (390px) |
| :---: | :---: |
| ![Trip Workspace](docs/screenshots/trip_workspace.png) | ![Mobile View](docs/screenshots/mobile_responsive.png) |

---

## 🏛️ System Architecture

TripTally follows a decoupled, service-oriented architecture designed for scalability, deterministic monetary calculation, and strict authorization scoping:

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 18 + Vite)"]
        UI[React Component Tree & Tailwind UI]
        Rtr[React Router DOM]
        Ctx[Auth & Toast Context]
        Viz[Recharts & Leaflet Maps]
        Globe[HTML5 Canvas 3D DotGlobe]
    end

    subgraph Server["Backend API (Express.js / Node.js ES Modules)"]
        Sec[Auth, Rate Limiter & Request Logger]
        Ctrl[Controllers & Route Handlers]
        Svc[Expense Calculation & Settlement Engines]
        Rem[Scheduled Reminder Cron Jobs]
        Err[Centralized Error Handling]
    end

    subgraph Data["Persistence & External Services"]
        Mongo[(MongoDB Atlas / Local DB)]
        Gemini[Google Gemini 2.5 Flash AI]
        CDN[Cloudinary CDN Media Storage]
        RZP[Razorpay / UPI Payment Gateway]
        OSM[OpenStreetMap / Nominatim]
        SMTP[Nodemailer SMTP Service]
    end

    UI --> Rtr --> Ctx
    Ctx --> Sec
    Sec --> Ctrl
    Ctrl --> Svc
    Ctrl --> Err
    Ctrl --> Mongo
    Ctrl --> Gemini
    Ctrl --> CDN
    Svc --> Mongo
    Rem --> Mongo
    Rem --> SMTP
    Ctrl --> RZP
    Ctrl --> OSM
    Viz --> OSM
```

---

## ✨ Features Breakdown

### 1. Google Gemini AI Itinerary Generator (`/ai-trip-planner`)
- **Official Google GenAI SDK**: Powered by `@google/genai` utilizing modern `gemini-3.1-flash-lite` (with automatic fallback to `gemini-3.8-flash`) for deterministic, structured JSON output.
- **Tailored for Indian Travellers**: Generates realistic plans for domestic circuits (Manali, Goa, Jaipur, Udaipur, Kashmir, Ladakh, Kerala, Rishikesh, Varanasi, Meghalaya, etc.) and international travel.
- **Realistic INR Budget Splits**: Accurately allocates transport, stays, food, activities, and miscellaneous costs in Indian Rupees (`₹`) for groups and individuals.
- **Geographic & Chronological Sequencing**: Sequences start and end times logically by neighborhood to eliminate transit fatigue.
- **Dynamic Customization**: Interactive day tabs, inline activity editor, single-day regeneration, Recharts donut budget charts, and smart packing checklists.
- **1-Click Persistence**: Saves generated itineraries directly to MongoDB as collaborative `Trip`, `ItineraryItem`, and `PackingItem` documents.
- **Production Resilience**: Server-only API key isolation, rate limiting (20 req/15 min), 50-second timeouts, and comprehensive error mapping.

### 2. Trip Management & Custom Banner Upload
- Create, view, edit, archive, and delete trips with customizable dates, destinations, and budgets in Indian Rupees (`₹`).
- **Banner Customization**: Select from curated destination photography or upload custom trip banners with Cloudinary / local fallback storage.
- Categorized views for **Upcoming**, **Ongoing**, and **Completed** expeditions.
- Scoped strictly to trips where the user is an owner or accepted member.

### 3. Collaborative Membership & Invitations
- Invite travel companions via email with unique, cryptographically secure 7-day invitation tokens.
- Role-based Access Control (RBAC):
  - **Owner**: Full administrative control, deletion, archiving, and role assignment.
  - **Organizer**: Can manage members, itineraries, and trip settings.
  - **Editor**: Can create and edit activities, log expenses, and update checklists.
  - **Viewer**: Read-only access to schedules, maps, and financial summaries.
- Local development fallback displays instant invitation URLs when SMTP is unconfigured.

### 4. Daily Itinerary Planner & Routes
- Day-by-day navigation for any trip date range.
- Timeline cards categorized by **Sightseeing**, **Dining**, **Lodging**, **Transport**, and **Activities**.
- Real-time planned cost aggregations per day and for the entire expedition in INR (`₹`).

### 5. Interactive Map View (OpenStreetMap & Leaflet)
- Automatic geocoding via OpenStreetMap Nominatim with in-memory caching and rate limiting.
- Plots destination stops, hotels, and attractions with custom map markers.
- Interactive detail popups and route lines connecting itinerary stops.
- 100% free and open-source — zero paid map tokens required.

### 6. Group Expense Management & Fair Rupee Split Ledger
- Log expenses with title, category, date, payer, split participants, notes, and receipt uploads.
- Supports **Equal Splits** and deterministic **Custom Percentage / Fixed Splits**.
- All monetary amounts are stored authoritatively in integer minor units (**paise**, where ₹1 = 100 paise) and displayed consistently in Indian Rupees.
- Built-in debt simplification engine calculates net balances and provides a settlement transfer plan ("Who owes Whom").
- Record settlements via Cash, UPI (GPay, PhonePe, Paytm, BHIM), or online payment.

### 7. Budget Analytics & Aggregations
- Real-time KPI summaries: Total Budget, Spent Amount, Remaining Funds, and Burn Rate Percentage.
- Category-wise spending donut chart (Dining, Stays, Activities, Transport).
- Planned vs. Actual spending comparison charts and daily spending trends.
- Individual member contribution summary and configurable budget threshold alerts (e.g. 80%).

### 8. Shared Packing Checklist & Activity Feed
- Categorized packing items (**Clothing**, **Gear**, **Documents**, **Medicines**, **Electronics**).
- Assign items to individual companions with real-time completion tracking.
- Immutable activity feed logging trip mutations (new activities, expenses, settlements).

### 9. In-App Notifications & Scheduled Reminders
- In-app notification center with read/unread statuses and bulk "Mark all as read".
- Automated background reminders for upcoming trips (24 hours prior) and pending debt balances.
- Configurable notification preferences (Email vs. In-App).

### 10. Razorpay Test-Mode Online Payments
- Standard merchant settlement collection flow.
- Server-side order creation and cryptographic HMAC SHA-256 signature verification.
- Idempotent webhook processing for `payment.captured`, `order.paid`, and `refund.processed`.
- Safe simulated fallback mode in local development when keys are not configured.

### 11. User Profile & Avatar Upload
- Customize display name, contact email, and travel bio.
- Upload custom profile pictures with Cloudinary CDN integration and local dev fallback.

---


## 🛠️ Tech Stack & Dependencies

### Frontend (`client/`)
- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS v3.4 + PostCSS + Autoprefixer
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod (`@hookform/resolvers`)
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts
- **3D Graphics**: HTML5 Canvas Particle DotGlobe (zero external 3D libraries)
- **Testing**: Vitest + React Testing Library + JSDOM

### Backend (`server/`)
- **Runtime**: Node.js v20+ (ES Modules)
- **Server Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT stored in secure HTTP-only cookies + bcryptjs
- **Rate Limiting**: Custom sliding-window in-memory rate limiter (zero dependencies)
- **Logging**: Structured request logger with sensitive parameter masking
- **Payments**: Razorpay SDK + Webhook cryptographic verification
- **Testing**: Vitest + Supertest

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB daemon running on `mongodb://localhost:27017` or MongoDB Atlas URI

### 2. Installation
Clone the repository and install all dependencies for both frontend and backend in one command:
```bash
git clone https://github.com/learnervivek/TripTally.git
cd TripTally
npm run install:all
```

### 3. Environment Configuration
Copy the example environment files:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Review `server/.env` (default values work out-of-the-box for local development):
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/triptally
JWT_SECRET=supersecret_triptally_dev_key_change_in_production
JWT_EXPIRES_IN=7d
```

### 4. Running the Development Servers
Start both the Express API and Vite React frontend concurrently:
```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **AI Trip Planner**: [http://localhost:5173/ai-trip-planner](http://localhost:5173/ai-trip-planner)

---

## 🔑 Environment Variables Reference

### Server Environment Variables (`server/.env`)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5001` | Express server port |
| `NODE_ENV` | Yes | `development` / `production` | Environment mode |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed CORS origin for cookies |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/triptally` | MongoDB connection string |
| `JWT_SECRET` | Yes | `supersecret_...` | Key used to sign authentication JWTs |
| `JWT_EXPIRES_IN` | No | `7d` | Token session validity duration |
| `RAZORPAY_KEY_ID` | Optional | `rzp_test_...` | Razorpay API Key ID (activates checkout) |
| `RAZORPAY_KEY_SECRET` | Optional | `secret_...` | Razorpay Key Secret for signature check |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | `webhook_...` | HMAC secret for verifying webhooks |
| `SMTP_HOST` | Optional | `smtp.mailtrap.io` | SMTP server for email dispatch |
| `SMTP_PORT` | Optional | `2525` | SMTP port |
| `SMTP_USER` | Optional | `username` | SMTP username |
| `SMTP_PASS` | Optional | `password` | SMTP password |
| `EMAIL_FROM` | Optional | `"TripTally" <noreply@...>` | Outgoing sender header |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Google Gemini API Key ([Get free at Google AI Studio](https://aistudio.google.com)) |
| `GEMINI_MODEL` | Optional | `gemini-3.1-flash-lite` | Gemini model identifier (e.g. `gemini-3.1-flash-lite`, `gemini-3.8-flash`) |
| `CLOUDINARY_CLOUD_NAME` | Optional | `your_cloud_name` | Cloudinary cloud identifier for uploads |
| `CLOUDINARY_API_KEY` | Optional | `your_api_key` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | `your_api_secret` | Cloudinary API secret (safe dev fallback if unconfigured) |


### Client Environment Variables (`client/.env`)

| Variable | Required | Default | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | No | `/api` | Base URL for API requests (proxied by Vite in dev) |

---

## 📡 REST API Documentation

All protected endpoints require an authenticated HTTP-only `token` cookie or `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user and set HTTP-only cookie |
| `POST` | `/api/auth/logout` | Public | Clear authentication cookie |
| `GET` | `/api/auth/me` | Private | Retrieve authenticated user profile |
| `PUT` | `/api/auth/profile` | Private | Update display name and travel bio |
| `POST` | `/api/auth/profile/avatar` | Private | Upload profile avatar picture (Cloudinary / local fallback) |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token |
| `PUT` | `/api/auth/reset-password/:token`| Public | Reset password using verified token |

### Trips & Collaboration (`/api/trips`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/trips` | Private | List authorized trips (supports `?search=`, `?status=`, `?page=`) |
| `POST` | `/api/trips` | Private | Create a new trip board |
| `POST` | `/api/trips/upload-banner` | Private | Upload custom trip cover banner (Cloudinary / local fallback) |
| `GET` | `/api/trips/:id` | Member | Retrieve trip details and member roster |
| `PUT` | `/api/trips/:id` | Organizer+ | Update title, destination, dates, budget |
| `PATCH`| `/api/trips/:id/archive` | Organizer+ | Toggle archived trip status |
| `DELETE`| `/api/trips/:id` | Owner | Delete trip and clean up associated records |
| `POST` | `/api/trips/:id/invitations` | Organizer+ | Invite companion by email |
| `DELETE`| `/api/trips/:id/members/:userId` | Organizer+ | Remove companion from trip |

### Daily Itinerary (`/api/trips/:tripId/itinerary`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/trips/:tripId/itinerary` | Member | List activities ordered by date and time |
| `POST` | `/api/trips/:tripId/itinerary` | Editor+ | Schedule new activity with estimated cost |
| `PUT` | `/api/trips/:tripId/itinerary/:id` | Editor+ | Update activity details |
| `DELETE`| `/api/trips/:tripId/itinerary/:id` | Editor+ | Delete activity |

### Group Expenses & Settlements (`/api/trips/:tripId/expenses`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/trips/:tripId/expenses` | Member | List logged expenses with category filters |
| `POST` | `/api/trips/:tripId/expenses` | Editor+ | Create expense with equal or custom splits |
| `GET` | `/api/trips/:tripId/expenses/balances` | Member | Calculate authoritative net balances and debt transfers |
| `POST` | `/api/trips/:tripId/expenses/upload-receipt` | Editor+ | Upload receipt image/PDF (max 5MB) |
| `POST` | `/api/trips/:tripId/settlements` | Editor+ | Record debt settlement |

### Gemini AI Itinerary Planner (`/api/ai`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/ai/itinerary/generate` | Private (Rate limited) | Generate structured day-by-day plan with Google Gemini AI |
| `POST` | `/api/ai/itinerary/regenerate-day` | Private (Rate limited) | Regenerate an individual day's activities with fresh recommendations |
| `POST` | `/api/ai/itinerary/save` | Private | Save AI plan directly into MongoDB as Trip, ItineraryItems, and PackingItems |

### Budget Analytics & Checklist
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/trips/:tripId/analytics` | Member | Aggregated budget metrics and charts |
| `PATCH`| `/api/trips/:tripId/budget-alert` | Organizer+ | Configure budget threshold percentage |
| `GET` | `/api/trips/:tripId/packing` | Member | List shared packing items |
| `POST` | `/api/trips/:tripId/packing` | Editor+ | Add checklist item with member assignment |
| `PATCH`| `/api/trips/:tripId/packing/:id/toggle` | Editor+ | Toggle item packed status |
| `GET` | `/api/trips/:tripId/activities` | Member | Paginated trip activity feed |

---

## 🧪 Testing Suite & Quality Assurance

TripTally includes comprehensive automated test suites covering UI workflows, backend API integration, deterministic mathematical models, rate limiting, and permission matrices. Automated tests run with 100% mocked AI responses—never incurring Google AI Studio charges.

```bash
# Run all tests (Server + Client)
npm test

# Run backend API tests only
npm --prefix server test

# Run frontend UI tests only
npm --prefix client test

# Run client production build
npm run build:client
```

### Test Coverage Results

- **Backend API Integration Tests**: **13 passed (13 files), 135 passed (135 tests)**
  - `server/src/test/aiItinerary.test.js` (Gemini API generation, input validations, quota/timeout handling, save to MongoDB, duplicate prevention)
  - `server/src/test/securityAndEdgeCases.test.js` (Expired tokens, forged signatures, RBAC denials, rate limiting, log sanitization)
  - `server/src/test/paymentApi.test.js` (Razorpay orders, HMAC signatures, webhooks, idempotency)
  - `server/src/test/expenseCalculation.test.js` (Deterministic minor currency units, custom splits, debt simplification)
  - `server/src/test/expenseApi.test.js` (Expense CRUD, receipt uploads, settlements)
  - `server/src/test/trip.test.js` (Trip lifecycles, date validations, owner permissions)
  - `server/src/test/invitation.test.js` (Secure token hash generation, duplicate invites, role assignments)
  - `server/src/test/itinerary.test.js` (Timeline activities, date boundaries, reordering)
  - `server/src/test/notificationApi.test.js` (In-app notifications, preferences, scheduled reminders)
  - `server/src/test/packingAndActivityApi.test.js` (Packing checklist toggles, audit activity logs)
  - `server/src/test/auth.test.js` (Registration, login, password reset tokens, cookie security)
  - `server/src/test/health.test.js` (API health check and 404 responses)
  - `server/src/test/analyticsApi.test.js` (Aggregation pipelines, threshold limits)
- **Frontend Component & Workflow Tests**: **11 passed (11 files), 52 passed (52 tests)**
  - `client/src/test/aiTripPlanner.test.jsx` (AI planner form inputs, Gemini generation, packing checklist toggles, saving to My Trips, error states)
  - `client/src/test/tripWorkflow.test.jsx` (`CreateTripModal`, date range validation, `InviteMemberModal`)
  - `client/src/test/payments.test.jsx` (Razorpay checkout modal, disabled fallbacks, transaction history)
  - `client/src/test/notifications.test.jsx` (Filter tabs, mark all read, reminder preferences)
  - `client/src/test/expense.test.jsx` (Split forms, balance calculations, settlement modal)
  - `client/src/test/analytics.test.jsx` (Recharts containers, threshold modals, filters)
  - `client/src/test/auth.test.jsx` (Login, registration, protected route redirection)
  - `client/src/test/dashboard.test.jsx` (KPI counters, destination cards, upcoming trip carousels)
  - `client/src/test/map.test.jsx` (Leaflet container mounting, geocoding coordinates)
  - `client/src/test/packingAndActivity.test.jsx` (Checklist assignments, progress bars, activity logs)
  - `client/src/test/components.test.jsx` (Button variants, Dialogs, Badges, Skeletons)
- **Overall Total**: **187 / 187 Tests Passing (100% Green)**.


---

## 🎯 Evaluator Demo Workflow

To test the application end-to-end as an evaluator:

1. **Launch the Application**: Run `npm run dev` and navigate to [http://localhost:5173](http://localhost:5173).
2. **Instant 1-Click Demo Login**:
   - On the landing page, click **"Sign In"** in the top navigation.
   - Click the **"1-Click Guest Demo"** button (`alex.traveler@example.com`).
   - You are immediately authenticated with a pre-configured sample profile.
3. **Generate an Itinerary with Gemini AI**:
   - In the sidebar, click **"AI Trip Planner"** (`/ai-trip-planner`).
   - Enter an Indian destination (e.g. *Manali & Solang Valley* or *Goa Coastal Getaway*), select dates, budget in INR (`₹40,000`), 4 travellers, and travel style (`Adventure`).
   - Click **"Generate Itinerary with AI"**.
   - Review the generated day-by-day itinerary, estimated cost distribution, and destination packing checklist.
   - Click **"Save & Convert to Collaborative Trip"** to save directly into MongoDB as an active trip board.
4. **Explore the Collaborative Dashboard & Rupee Tally**:
   - Notice the upcoming trips, active expeditions, and recent group expenses displaying consistent rupee amounts (converted from paise).
   - Press `⌘K` or `/` on your keyboard to instantly focus the search bar.
5. **Enter a Trip Workspace**:
   - Click on the **"Rishikesh Adventure trip"** or any expedition board.
   - **Itinerary Tab**: View daily activities with timing, locations, and planned expenses in ₹. Add activities or view the interactive map view.
   - **Map Tab**: Switch to the interactive Leaflet map to inspect markers plotted along the travel route.
   - **Expenses Tab**: Review the group tally. Inspect the net balances ("Who Owes Whom").
   - **Settle Up**: Click "Settle Debt" to record a UPI payment (GPay, PhonePe, Paytm) or test Razorpay online payment simulation.
   - **Analytics Tab**: Examine real-time category donut charts, daily spend trends, and budget burn rate.
   - **Packing Tab**: Check off packing essentials or assign items to companions.
   - **Activity Tab**: Review the audit log of all changes made to the trip.
6. **Profile & Custom Banner Uploads**:
   - In **Profile**, click to upload an avatar picture.
   - In **My Trips**, click "+ Create Trip" and upload a custom banner image for your expedition.
7. **Mobile & Tablet Responsiveness**:
   - Resize your browser window or switch to device emulation (iPad or iPhone).
   - Notice the smooth mobile drawer menu, touch-friendly buttons (≥44px), and responsive grids.

---

## 🚢 Production Deployment Guide

### Option A: AWS Deployment (Recommended)
1. **Database**: Use [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0 cluster or dedicated). Obtain your connection string (`MONGODB_URI`). In MongoDB Atlas Network Access, allow your AWS server IP (or `0.0.0.0/0` with secure user/password).
2. **Backend API on AWS App Runner / Elastic Beanstalk / EC2**:
   - Root directory: `server/` (or run containerized via `Dockerfile`)
   - Build Command: `npm install`
   - Start Command: `npm start` (runs `node src/server.js` on port `5001` or `PORT`)
   - Configure Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `GEMINI_API_KEY`, etc.
3. **Frontend on AWS S3 + CloudFront or AWS Amplify**:
   - Root directory: `client/`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable: `VITE_API_URL=https://your-api-domain.com/api`
   - Error document / rewrite rule: Configure `/index.html` as the fallback route for SPA client-side routing.
4. **CORS**: Set `CLIENT_URL=https://your-frontend-domain.com` in backend environment variables.

### Option B: Full-Stack on Render / Railway
1. Deploy `server` as a Node web service (`npm start`).
2. Deploy `client` static build (`dist`) to AWS Amplify, Netlify, or Render Static Site.
3. Set `CLIENT_URL` on the backend and `VITE_API_URL` on the frontend.

---

## ⚠️ Known Limitations & Considerations

1. **Email Service in Local Development**: When SMTP credentials are not specified in `.env`, invitation links and notification reminders are logged directly to the server terminal output rather than being sent over the network.
2. **Razorpay Merchant Collection**: Standard Razorpay checkout collects funds into the trip's verified merchant account; peer-to-peer wallet balances are recorded in the authoritative database ledger without requiring third-party custodial wallet integrations.
3. **OpenStreetMap Nominatim Geocoding**: Nominatim requests are rate-limited to 1 request per second in compliance with OpenStreetMap's usage policy; verified coordinates are cached in-memory.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
