# LuxeStudio LeadFlow CRM — Production Deployment & Operations Guide

## 1. Architecture & Cost Evaluation

To keep total monthly operational costs within the targeted **₹500 – ₹1,500 / month** budget for 2–5 users, we recommend the following lean, single-database architecture:

| Component | Recommended Provider | Tier / Configuration | Estimated Cost |
| :--- | :--- | :--- | :--- |
| **Next.js App Hosting** | Vercel or Render Web Service | Hobby / Starter | ₹0 – ₹600 / month |
| **PostgreSQL Database** | Neon Serverless Postgres or Supabase | Free / Launch ($5/mo) | ₹0 – ₹450 / month |
| **Cron / Reminder Worker** | Vercel Cron or cron-job.org | Free Tier (calls `/api/cron` every 5 min) | ₹0 / month |
| **Telegram Bot API** | Telegram Official Bot API | Unlimited Free | ₹0 / month |
| **Transactional Email** | Amazon SES (Asia-South Mumbai `ap-south-1`) | Pay-as-you-go (~$0.10 / 1,000 emails) | ₹10 – ₹50 / month |
| **Custom Domain & SSL** | Cloudflare DNS + `leadflow.theluxestudio.in` | Free SSL & DDoS protection | ₹0 (Domain existing) |
| **Total Estimated Cost** | | | **₹450 – ₹1,100 / month** |

---

## 2. Environment Variables Specification

Configure the following variables in your production environment (e.g. Vercel Project Settings > Environment Variables):

```bash
# Database (Neon / Supabase PostgreSQL URL)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/leadflow?sslmode=require"

# Application URL & Defaults
NEXT_PUBLIC_APP_URL="https://leadflow.theluxestudio.in"
NEXT_PUBLIC_DEFAULT_TIMEZONE="Asia/Kolkata"
NEXT_PUBLIC_DEFAULT_CURRENCY="INR"

# Authentication & Session Security (Generate via: openssl rand -base64 32)
SESSION_SECRET="64_character_random_cryptographic_secret_key"
INVITE_SECRET="64_character_random_invite_secret_key"

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
TELEGRAM_BOT_USERNAME="LuxeStudioLeadFlowBot"
TELEGRAM_WEBHOOK_SECRET="random_webhook_secret_string"

# Transactional Email (Amazon SES / SMTP)
EMAIL_PROVIDER="ses" # "ses" or "smtp" or "unconfigured"
EMAIL_FROM="LuxeStudio <notifications@theluxestudio.in>"
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."

# Cron Worker Secret Header
CRON_SECRET="generate_a_long_random_cron_secret"
```

---

## 3. Database Migration & Initialization

### Switching from Local SQLite to Production PostgreSQL
1. Ensure your `.env` contains the live PostgreSQL `DATABASE_URL`.
2. Push or migrate the schema using Prisma:
   ```bash
   # Option A: Push schema directly to new database
   DATABASE_URL="postgresql://..." npx prisma db push --schema=prisma/schema.postgresql.prisma

   # Option B: Run version-controlled migration
   DATABASE_URL="postgresql://..." npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
   ```
3. Seed the initial pipeline stages, organization, templates, and admin user:
   ```bash
   node scripts/seed.mjs
   ```

---

## 4. Telegram Bot Setup Guide

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow instructions to name the bot (e.g., `LuxeStudio LeadFlow Assistant`, username `LuxeStudioLeadFlowBot`).
3. Copy the HTTP API token provided by BotFather into your environment variable `TELEGRAM_BOT_TOKEN`.
4. Configure the bot webhook so Telegram notifies LeadFlow when users click `/start`:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://leadflow.theluxestudio.in/api/telegram/webhook"
   ```
5. Personal Linking Workflow:
   - Team members navigate to **Settings & Integrations** in the LeadFlow CRM.
   - Click **"Generate Telegram Linking Code"**.
   - Click the bot link or send `/start <TOKEN>` to the bot.
   - The bot responds with instant confirmation and links their personal Telegram ID.

---

## 5. Automated Scheduled Reminders (Cron Worker)

The background worker checks for scheduled follow-ups, overdue alerts, and daily digests.
To trigger the worker every 5 minutes:
- In Vercel, `vercel.json` can define:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron",
        "schedule": "*/5 * * * *"
      }
    ]
  }
  ```
- Or use any free uptime/cron service (e.g. `cron-job.org`) with a POST request to:
  `https://leadflow.theluxestudio.in/api/cron`
  Header: `x-cron-key: <YOUR_CRON_SECRET>`

---

## 6. Database Backup & Disaster Recovery

### Automated Daily Neon / Supabase Backups
Neon and Supabase take automated Point-in-Time snapshots daily.

### Manual Backup (pg_dump)
To take an offline backup:
```bash
pg_dump "postgresql://..." --clean --no-owner --format=c -f leadflow_backup_$(date +%F).dump
```

### Restore Procedure
To restore from backup:
```bash
pg_restore --clean --no-owner -d "postgresql://..." leadflow_backup_YYYY-MM-DD.dump
```

---

## 7. Custom Domain Setup (`leadflow.theluxestudio.in`)

1. In Vercel / Render: add custom domain `leadflow.theluxestudio.in`.
2. In your DNS provider (Cloudflare / GoDaddy):
   - Type: `CNAME`
   - Name: `leadflow`
   - Target: `cname.vercel-dns.com` (or provider CNAME)
3. SSL certificates are provisioned automatically via Let's Encrypt with automatic 90-day renewal.
