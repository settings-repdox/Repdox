# Repdox - Event Management Platform

A modern event management SaaS application built with React, TypeScript, Supabase, and Vercel.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Security & Features](#security--features)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Database Setup](#database-setup)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase account (https://supabase.com)
- Vercel account (https://vercel.com)

### Local Development

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd repdox-spark-nexus

# Install dependencies
npm install
# or
pnpm install
# or
bun install

# Set up environment variables (see Environment Setup section)
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn-ui + Radix UI
- **Styling**: Tailwind CSS, PostCSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase WebSockets
- **Export**: XLSX (Excel), PDF
- **Email**: Resend (100 free emails/day)

---

## 📁 Project Structure

```
repdox-spark-nexus/
├── src/                          # React application
│   ├── pages/                    # Page components (routes)
│   ├── components/               # Reusable UI components
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom React hooks
│   ├── integrations/supabase/    # Supabase client
│   ├── lib/                      # Utility functions & services
│   └── App.tsx
├── api/                          # Vercel serverless endpoints
│   ├── events/                   # Event management APIs
│   ├── profile/                  # User profile APIs
│   ├── qr/                       # QR code generation/verification
│   └── contact/                  # Contact form endpoint
├── functions/                    # Vercel Functions
│   ├── send-verification/        # Email verification
│   └── export-registrations-xlsx/# Excel export
├── supabase/
│   ├── migrations/               # Database schema migrations
│   └── functions/                # Supabase Edge Functions
├── public/                       # Static assets
├── middleware.ts                 # Vercel request middleware
├── vercel.json                   # Vercel configuration
├── vite.config.ts                # Vite configuration
└── package.json
```

---

## ⚙️ Environment Setup

### 1. Create `.env` file

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email Service (free 100 emails/day)
RESEND_API_KEY=your-resend-api-key

# Optional: SendGrid (alternative email service)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM=noreply@your-domain.com

# Optional: Twilio (SMS verification)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM=+1234567890

# Vercel KV (for rate limiting - optional)
KV_REST_API_TOKEN=your-kv-token
KV_REST_API_URL=your-kv-url
```

### 2. Supabase Setup

1. Create project at https://supabase.com
2. Run migrations from `supabase/migrations/` in SQL editor
3. Enable Row Level Security (RLS) on tables
4. Configure authentication providers (GitHub, Google, etc.)

### 3. Resend Email Setup

1. Sign up at https://resend.com
2. Get API key from dashboard
3. Verify domain (optional, uses `onboarding@resend.dev` by default)
4. Add `RESEND_API_KEY` to environment variables

---

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Format code
npm run format
```

### Project Guidelines

- **TypeScript**: Use strict mode, avoid `any` types
- **React**: Use hooks, functional components
- **Styling**: Use Tailwind classes, shadcn-ui components
- **API Calls**: Use Supabase client or fetch with proper error handling
- **File Structure**: Keep related files in same directory

---

## 🔒 Security & Features

### Built-in Security Features

#### 1. Database Security

- Unique constraints on user profiles and registrations
- Foreign key relationships enforced
- Row Level Security (RLS) on all tables
- Usage quota tracking with triggers
- Atomic operations for race condition prevention

#### 2. Rate Limiting

- Per-IP rate limiting (adjustable by endpoint)
- Sliding window algorithm for fair distribution
- Distributed via Vercel KV (optional)
- Automatic 429 responses with retry headers

#### 3. Usage Quotas

- 5 events per user per day
- 200 registrations per user per day
- 20 verification requests per user per day
- 10,000 QR fetches per user per day
- Customizable via database

#### 4. Event Duplicate Detection

- Levenshtein distance algorithm
- Checks: organizer + location + date±1 day
- 80% similarity threshold
- Prevents accidental duplicates

#### 5. QR Code Security

- Tokenized codes (registration ID not exposed)
- HMAC-SHA256 signature verification
- Expiring tokens (default 24 hours)
- Single-use token enforcement

#### 6. API Security

- JWT token verification
- Service role key for server-side writes
- Client IP extraction and logging
- Comprehensive error handling

---

## 📡 API Documentation

### Event Endpoints

#### Create Event

```
POST /api/events/create
Headers: Authorization: Bearer <JWT_TOKEN>

Body:
{
  "title": "Tech Conference 2026",
  "description": "Annual tech conference",
  "location": "New York, NY",
  "city": "New York",
  "start_at": "2026-04-15T09:00:00Z",
  "end_at": "2026-04-15T18:00:00Z",
  "capacity": 500,
  "registration_deadline": "2026-04-01T00:00:00Z"
}

Response:
{
  "event_id": "uuid",
  "message": "Event created successfully"
}
```

#### Register for Event

```
POST /api/events/register
Headers: Authorization: Bearer <JWT_TOKEN>

Body:
{
  "event_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "role": "attendee"
}

Response:
{
  "registration_id": "uuid",
  "message": "Registration successful"
}
```

### QR Code Endpoints

#### Generate QR Code

```
POST /api/qr/generate
Headers: Authorization: Bearer <JWT_TOKEN>

Body:
{
  "registration_id": "uuid"
}

Response:
{
  "qr_code": "base64_encoded_image",
  "token": "jwt_token",
  "expires_at": "2026-04-15T18:00:00Z"
}
```

#### Verify QR Code

```
POST /api/qr/verify
Headers: Authorization: Bearer <JWT_TOKEN>

Body:
{
  "token": "jwt_token",
  "registration_id": "uuid"
}

Response:
{
  "verified": true,
  "registration": {...}
}
```

### Profile Endpoints

#### Create Profile

```
POST /api/profile/create
Headers: Authorization: Bearer <JWT_TOKEN>

Body:
{
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Event organizer",
  "avatar_url": "https://..."
}

Response:
{
  "profile_id": "uuid",
  "message": "Profile created"
}
```

#### Verify Email/Phone

```
POST /api/profile/verify
Headers: Authorization: Bearer <JWT_TOKEN>

Body:
{
  "type": "email|phone",
  "contact": "user@example.com|+1-555-0123"
}

Response:
{
  "verification_id": "uuid",
  "message": "Verification code sent"
}
```

### Contact Form

#### Send Contact Message

```
POST /api/contact/send

Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I have a question about..."
}

Response:
{
  "success": true,
  "message": "Message sent successfully. We'll be in touch soon!"
}
```

All contact emails go to: **supportrepdox@gmail.com**

---

## 🚀 Deployment

### Deploy to Vercel

1. **Connect Repository**
   - Push code to GitHub
   - Connect repo to Vercel (vercel.com)

2. **Environment Variables**
   - Add all `.env` variables to Vercel project settings
   - Production environment variables via Vercel dashboard

3. **Deploy**

   ```bash
   # Automatic deployment on git push to main
   git push origin main
   ```

4. **Database Migrations**
   - Run migrations in Supabase dashboard before deploying
   - Or use Supabase CLI: `supabase db push`

### Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] Email service (Resend) configured
- [ ] Domain configured (optional)
- [ ] SSL/TLS enabled (automatic via Vercel)
- [ ] Monitoring alerts set up
- [ ] Backup schedule configured
- [ ] Rate limiting tested
- [ ] Error tracking enabled (Sentry, etc.)

---

## 🗄️ Database Setup

### Migrations

Run in order via Supabase SQL Editor:

1. **Schema Hardening** - `supabase/migrations/20260114_schema_hardening_constraints.sql`
   - Creates base tables
   - Adds constraints and indexes
   - Sets up RLS policies

2. **Usage Quotas** - `supabase/migrations/20260114_usage_quotas_and_rate_limits.sql`
   - Creates quota tracking
   - Sets up triggers
   - Configures rate limits

3. **Event Similarity** - `supabase/migrations/20260114_event_similarity_detection.sql`
   - Adds similarity detection
   - Configures duplicate prevention

### Key Tables

- `profiles` - User profiles
- `events` - Event listings
- `event_registrations` - User registrations
- `profile_verifications` - Email/phone verification records
- `qr_tokens` - QR code tokens
- `usage_quota_tracking` - Rate limiting records

---

## 📞 Support & Contact

For issues or feature requests:

- Email: supportrepdox@gmail.com
- Use the contact form on the application
- GitHub Issues: (if public repo)

---

## 📄 License

This project is proprietary. All rights reserved.
