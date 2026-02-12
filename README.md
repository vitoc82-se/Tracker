# NutriTrack - AI-Powered Fitness & Nutrition Tracker

A full-stack fitness and nutrition tracking app with AI-powered food photo analysis, built with Next.js and deployed on Vercel.

## Features

- **AI Food Analysis** - Snap a photo of your meal and Claude analyzes the nutritional content
- **Meal Tracking** - Log breakfast, lunch, dinner, and snacks with full macro breakdowns
- **Exercise Logging** - Track cardio, strength training, flexibility, and sports activities
- **Goal Setting** - Set daily/weekly/monthly targets for calories, protein, and exercise
- **Dashboard** - Visual charts showing calorie intake, macro breakdown, and progress over time
- **BMR/TDEE Calculator** - Estimated daily calorie needs based on your body metrics
- **Auth** - Email/password registration and Google OAuth support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **AI**: Anthropic Claude API (vision)
- **Storage**: Vercel Blob
- **UI**: Tailwind CSS, Lucide Icons, Recharts
- **Hosting**: Vercel (serverless)

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database
- Anthropic API key (for AI food analysis)
- Vercel Blob storage token

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

3. Push the database schema:

```bash
npm run db:push
```

4. Start the dev server:

```bash
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000 for dev) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret (optional) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude vision |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |

## Deploying to Vercel

1. Push your code to GitHub
2. Import the project on Vercel
3. Add a Neon Postgres database from the Vercel Marketplace
4. Add a Vercel Blob store
5. Set the `NEXTAUTH_SECRET` and `ANTHROPIC_API_KEY` environment variables
6. Deploy!

The `prisma generate` step runs automatically as part of the build process.
