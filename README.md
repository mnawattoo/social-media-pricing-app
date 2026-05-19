# 🎵 BeatPulse Agency - Music Social & Release Rollout Management Platform

A high-performance, premium, neon-obsidian themed pricing landing page and authenticated administration console designed exclusively for the **music industry**. This application enables independent artists, record labels, touring DJs, and beat producers to calculate custom campaign budgets in real time and capture client leads securely.

Backed by a zero-dependency **Ruby WEBrick REST API** server and local **JSON database** tables, the entire stack runs flawlessly without complex package dependencies or containers.

---

## ✨ Features

### 🎧 Client Landing Page (`/public`)
* **Exclusive Dark-Synthwave Visuals:** Electric cyan (`#00f0ff`), neon fuchsia (`#ff007f`), cyber gold (`#ffe600`), and obsidian backgrounds (`#05070c`) featuring premium typographic scales (`Space Grotesk` + `Plus Jakarta Sans`) and smooth glowing glassmorphic elements.
* **Music-Centric Pricing Tiers:** Tailored packages designed for different artist stages:
  * **Independent Plan ($399/mo):** Ideal for rising beatmakers and indie creators.
  * **Rising Artist Plan ($799/mo - "Hottest Choice"):** Designed for active rollouts, includes proactive playlist outreach and dedicated VA support.
  * **Headliner Elite Plan ($1399/mo):** High-volume deliverables, 3D album cover designs, lyric videos, and sync licensing admin.
* **Interactive Release Budget Builder:** Real-time modular pricing calculator. Select a baseline campaign and add customized deliverables (e.g. *Spotify Playlist Pitching*, *TikTok Trend Hype*, *Animated Lyric Videos*, *Spotify Canvas Loops*).
* **Dynamic Lead-Capture Form:** Validates contact information and captures selected plans, quantities, sub-budgets, and final calculated prices.

### 🎛️ Administrative Console Dashboard (`/public/admin`)
* **Secure Access Lock:** Authentication overlay utilizing token-based session headers (default password: `admin`).
* **KPI Metrics Overview:** Displays key agency statistics: Total Leads captured, Average Lead/Rollout Value, Active baseline plans, and Active add-on campaigns.
* **Dynamic Plans CRUD:** Full administration for baseline plans. Add new plans, edit pricing, or toggle visibility. Includes an interactive list-manager to add/remove custom features on the fly.
* **Add-ons Manager:** Adjust specific pricing, description scopes, or toggle active status of specialized marketing deliverables.
* **Inquiry Leads Feed:** Sortable client table showing complete client profiles, custom release packages selected, total budgets, and time of submission. Supports **JSON Data Export** with a single click.
* **Global Agency Settings:** Fully customize agency branding names, email/phone contacts, currency symbol, and the featured plans sticker. Securely change the admin portal login password.

---

## 📂 Project Architecture

```
social-media-pricing-app/
├── server.rb                       # Zero-dependency WEBrick Server & REST API
├── deploy.rb                       # Self-contained Ruby GitHub deployment script
├── data/                           # Local JSON Database
│   ├── plans.json                  # Baseline plans configuration
│   ├── addons.json                 # Specialized add-on services
│   ├── settings.json               # Global metadata & password credentials
│   └── leads.json                  # Inquiry capture submissions
└── public/                         # Client-Side Frontend
    ├── index.html                  # Landing Page Structure
    ├── css/
    │   └── style.css               # Theme & Micro-animations style sheet
    ├── js/
    │   └── app.js                  # Pricing calculation and UI coordinator
    └── admin/                      # Administrative Dashboard Console
        ├── index.html              # Admin Portal views
        ├── css/
        │   └── style.css           # Premium Admin CSS skin
        └── js/
            └── app.js              # REST queries & Admin page controller
```

---

## 🚀 Running the Platform Locally

To spin up the BeatPulse Agency site and administrative backend locally, simply follow these steps:

### 1. Boot the Ruby Backend Server
The entire app runs on standard **Ruby (2.6+)** with zero external gems or library installations required. Open your terminal in the root folder and run:
```bash
ruby server.rb
```

### 2. View the Landing Page
Open your web browser and navigate to:
👉 [**http://localhost:3000**](http://localhost:3000)

### 3. Open the Admin Console
To review submissions, edit pricing rates, or change global variables, navigate to:
👉 [**http://localhost:3000/admin/**](http://localhost:3000/admin/)
* **Default Password:** `admin` (You can update this securely inside the "Pricing Settings" tab in the dashboard).

---

## 🔒 Security & Performance
* **Restricted Admin Gateways:** The Ruby servlet rejects all modifying endpoints (`POST`/`PUT`/`DELETE` plans and add-ons, `GET` leads) unless a valid `X-Admin-Token` session header is authenticated.
* **Zero Dependencies:** Eliminating package nodes (`node_modules`) or bundlers avoids local security vulnerabilities and delivers blazing fast load times under standard WEBrick compilation.
