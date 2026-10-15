# ⚜️ LuxeStudio LeadFlow CRM

> **Executive Internal Sales Pipeline & Client Lifecycle Management Platform**  
> Custom-built for luxury interior architecture, high-end residential design, and turnkey commercial fit-outs.

---

## 🌟 Executive Overview

**LuxeStudio LeadFlow** is a purpose-engineered, enterprise-grade Sales Pipeline and Relationship Management CRM designed to streamline high-ticket lead qualification, bespoke client onboarding, and automated follow-up cadences.

Equipped with dual-mode authentication, multi-channel lead ingestion, instantaneous Telegram bot notifications, and automated transactional emails, LeadFlow eliminates manual bottlenecks and gives design partners and sales leads real-time visibility across the entire deal lifecycle.

---

## 💎 Key Features & Capabilities

### 1. Dual-Identifier Authentication & RBAC
- **Flexible Sign-In:** Authenticate with either your registered **Work Email** or your unique **User ID / Username** using the same encrypted credentials.
- **Role-Based Access Control (RBAC):** Granular permission boundaries for `ADMIN`, `MANAGER`, and `SALES_MEMBER`.
- **Session Security:** Cryptographically signed, HTTP-only session cookies with HMAC-SHA256 verification and automatic expiry.
- **Brute-Force Protection:** Intelligent in-memory rate limiting across authentication endpoints.

### 2. 8-Stage High-Velocity Sales Pipeline
Visual, dynamic Kanban and list views reflecting the bespoke luxury sales cycle:
1. **New Inquiry:** Fresh inbound inquiries awaiting initial triage.
2. **Initial Contact:** Outreach initiated via phone, WhatsApp, or email.
3. **Briefing & Consultation:** Site visit and design brief consultation scheduled.
4. **Design Proposal:** Architectural concepts, 3D moodboards, and space planning submitted.
5. **Quotation & Negotiation:** Detailed BOQ (Bill of Quantities) and commercial terms review.
6. **Contract & Advance:** Agreement executed, initial advance deposit invoiced.
7. **Won & Closed:** Successful deal conversion; handed off to the execution and project management team.
8. **Lost & Archived:** Disqualified or dormant leads with documented loss reasons for pipeline intelligence.

### 3. Multi-Channel Lead Capture & Smart CSV Ingestion
- **Instant In-App Quick Capture:** Add qualified inquiries with client requirements, budget range, property type, and target handover date in seconds.
- **Bulk CSV Import Engine:** High-performance CSV parser with automated header mapping, duplicate detection, and batch transaction safety.
- **Instant Export:** One-click CSV export with customizable date ranges and stage filtering.

### 4. Real-Time Telegram Bot Assistant
- **Instant Deal Alerts:** Immediate push notifications whenever a new high-ticket lead is created or assigned.
- **One-Click Bot Linking:** Self-serve secure linking via `/start <token>` generated right from user settings.
- **Interactive Reminders:** Receive overdue follow-up alerts directly on Telegram with actionable inline links.

### 5. Automated Transactional Email Engine
- **Nodemailer SMTP & SES Support:** Native integration with business email providers (e.g., Zoho Mail SMTP, Amazon SES) with SSL/TLS encryption.
- **Personalized Email Templates:** Pre-configured luxury correspondence templates for consultations, quotation follow-ups, and proposal check-ins.

### 6. Follow-Up Centre & Automated Cron Reminders
- **Priority Task Tracker:** Dedicated view for **Today's Tasks**, **Overdue Follow-ups**, and **Upcoming Reviews**.
- **1-Click Snooze & Complete:** Postpone follow-ups by 24h, 3 days, or 1 week, or mark complete with mandatory activity note logging.
- **Automated Health & Activity Crons:** Serverless cron worker checking pending tasks and dispatching alerts.

### 7. Executive Analytics & Conversion Metrics
- **Pipeline Health:** Total active pipeline value, conversion win rate, average deal size, and stage velocity.
- **Performance by Rep:** Breakdown of won contracts and activity volumes across sales members.
- **Revenue Forecasting:** Projected billings based on weighted stage probabilities.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) | App Router, Server Components, Route Handlers |
| **Language** | TypeScript 5 | Strict mode, end-to-end type safety |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Curated midnight luxury design system (`#0B0D12` / Gold accents) |
| **Database ORM** | [Prisma ORM 5.22](https://www.prisma.io/) | Auto-generated type-safe client, migration tracking |
| **Database Engine** | PostgreSQL (Neon Serverless) | Connection pooler with SSL mode required |
| **Authentication** | Custom HMAC Session Cookies | `bcryptjs` password hashing (salt rounds: 10) |
| **Email Service** | Nodemailer / Amazon SES | SMTP over SSL (Port 465) / TLS (Port 587) |
| **Notifications** | Telegram Bot API | Webhook callbacks with token verification |
| **Hosting & Edge** | [Vercel](https://vercel.com/) | Edge network, Serverless functions, Automated crons |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js:** v18.17.0 or later (v20+ recommended)
- **npm:** v9.0.0 or later
- **PostgreSQL Database:** Local instance or cloud database (Neon, Supabase, AWS RDS)

### 1. Clone the Repository
```bash
git clone https://github.com/the-luxestudio/luxestudio-leadflow.git
cd luxestudio-leadflow
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create your local environment file by copying the template:
```bash
cp .env.example .env
```
Fill in your configuration settings (refer to the [Configuration Guide](#-configuration--environment-variables) below).

### 4. Synchronize Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration & Environment Variables

> **IMPORTANT:** Never commit real secrets, API keys, or production passwords to version control. The `.env` file is strictly ignored by `.gitignore`.

| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection pooler string | `postgresql://user:password@host/db?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Canonical public application URL | `https://leads.theluxestudio.in` |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE`| Default workspace timezone | `Asia/Kolkata` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY`| Default workspace currency symbol | `INR` |
| `SESSION_SECRET` | 32+ char secret for signing auth session cookies | Generate with `openssl rand -base64 32` |
| `INVITE_SECRET` | Secret token for securing invite URLs | Generate with `openssl rand -base64 32` |
| `CRON_SECRET` | Shared secret header for `/api/cron` verification | Random alphanumeric string |
| `TELEGRAM_BOT_TOKEN` | Bot API token obtained from `@BotFather` | `123456789:ABCdefGhIJKlmNoPQRstuVWXyz` |
| `TELEGRAM_BOT_USERNAME` | Username of your Telegram bot (no `@` prefix) | `luxestudio_leadflow_bot` |
| `TELEGRAM_WEBHOOK_SECRET` | Optional webhook signature validation secret | Random alphanumeric string |
| `EMAIL_PROVIDER` | Transactional email provider selection | `smtp`, `ses`, or `unconfigured` |
| `EMAIL_FROM` | Sender display name and email address | `LuxeStudio LeadFlow <name@domain.com>` |
| `SMTP_HOST` | Outgoing SMTP mail server | `smtp.zoho.in` or `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port (`465` for SSL, `587` for TLS) | `465` |
| `SMTP_USER` | Authenticated SMTP username / email address | `name@domain.com` |
| `SMTP_PASS` | SMTP application-specific password | App password / API token |

---

## 🔒 Security & Hardening Measures

- **Zero Secret Exposure:** Strict `.gitignore` policy enforcing clean repository commits.
- **Enterprise Security Headers:** Configured via `next.config.js`:
  - `X-Frame-Options: DENY` (Anti-Clickjacking protection)
  - `X-Content-Type-Options: nosniff` (MIME-sniffing prevention)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **Session Integrity:** Cookie payload encrypted with timestamp validity checks; invalidated immediately on logout or status deactivation.
- **Database Connection Pooling:** Managed via Neon's connection pooler with mandatory SSL encryption (`sslmode=require`).
- **Audit Logging:** Asynchronous logging of security and administrative events (login attempts, bulk reassignments, lead deletions).

---

## 📁 Repository Directory Structure

```plaintext
luxestudio-crm/
├── prisma/
│   ├── schema.prisma              # Primary Prisma database schema
│   └── schema.postgresql.prisma   # PostgreSQL production schema definition
├── public/                        # Static assets, branding logos, icons
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/             # Dual-login screen (Email or Username)
│   │   ├── (dashboard)/
│   │   │   ├── analytics/         # Deal metrics & conversion velocity
│   │   │   ├── dashboard/         # Executive overview & KPIs
│   │   │   ├── follow-ups/        # Actionable tasks & snooze centre
│   │   │   ├── import/            # CSV bulk import & export wizard
│   │   │   ├── leads/             # Lead management, detail views, drawer
│   │   │   ├── pipeline/          # 8-stage interactive Kanban board
│   │   │   ├── settings/          # Workspace & Telegram bot integrations
│   │   │   ├── team/              # Team management & permissions
│   │   │   └── templates/         # Transactional communication templates
│   │   └── api/                   # Serverless REST endpoints
│   │       ├── auth/              # Login, logout, session verification
│   │       ├── cron/              # Background follow-up & reminder worker
│   │       ├── leads/             # Lead CRUD operations
│   │       ├── pipeline/          # Stage updates & order sorting
│   │       ├── team/              # Team member provisioning & reassignment
│   │       └── telegram/          # Webhook callbacks & token pairing
│   ├── components/                # Reusable luxury UI components
│   │   ├── layout/                # AppShell, Header, Sidebar
│   │   ├── leads/                 # LeadDrawer, LeadCard, ActivityTimeline
│   │   ├── pipeline/              # KanbanColumn, DragDropBoard
│   │   └── ui/                    # Button, Badge, Modal, Input, Toast
│   ├── lib/
│   │   ├── auth/                  # Session handling, password hashing, guards
│   │   ├── db/                    # Prisma client singleton
│   │   └── services/              # Telegram API, SMTP/SES email delivery
│   └── types/                     # TypeScript data interfaces & enums
├── .env.example                   # Environment variable template
├── DEPLOYMENT.md                  # Detailed production deployment runbook
├── next.config.js                 # Next.js & security headers configuration
├── package.json                   # Project scripts and dependencies
└── tsconfig.json                  # TypeScript compiler settings
```

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `next dev` | Launch local development server at `localhost:3000` |
| `build` | `prisma generate && next build` | Compile optimized production application bundle |
| `start` | `next start` | Start production server locally |
| `lint` | `next lint` | Validate codebase against ESLint rules |
| `test` | `vitest run` | Execute unit and integration tests |

---

## 🛡️ License & Proprietary Notice

Copyright © 2026 **The LuxeStudio**. All rights reserved.  
This software is internal, confidential, and proprietary. Unauthorized copying, distribution, or deployment of this repository or any portion thereof is strictly prohibited.
