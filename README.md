# myMoney

myMoney is a personal finance workbench that blends cashflow forecasting, budgeting, and transaction hygiene. A guided onboarding captures pay cadence, deductions, bills, and goals, then the dashboard forecasts safe-to-spend before your next paycheck. You can manage transactions (with splits and rules), budgets, bills, recurring items, goals, debts, and category-level insights.

## Features
- Cashflow forecast that merges pay schedules, fixed bills, variable spend estimates, and live transactions.
- Guided onboarding to collect currency, timezone, pay cadence, deductions, recurring bills, savings goals, and debts.
- Transaction workspace with splits, category rules, and status tracking.
- Budget plans with category limits and progress, plus variable spending drift monitoring.
- Bills, recurring rules, and goals tracking with debt paydown support and insights.
- Email/password auth (NextAuth Credentials + Prisma) with guarded app routes.

## Tech Stack
- Next.js App Router (TypeScript) with Tailwind CSS v4 design tokens.
- Prisma + PostgreSQL for data and migrations.
- NextAuth credentials auth, bcrypt password hashing.
- Firebase Analytics client-side bootstrap (optional).

## Getting Started
1) Install dependencies:
```bash
npm install
```
2) Create a `.env` file with required values:
```
DATABASE_URL="postgresql://user:password@localhost:5432/mymoney"
NEXTAUTH_SECRET="your-random-secret"
```
3) Prepare the database:
```bash
npx prisma migrate dev
```
4) Run the app:
```bash
npm run dev
```
The app will be available at http://localhost:3000.

## Scripts
- `npm run dev` - start the dev server.
- `npm run build` / `npm start` - production build and serve.
- `npm run lint` - lint the codebase.
- `npm test` - run Vitest suites.
- `npx prisma studio` - inspect and edit data via Prisma Studio.

## Usage Notice
Use of this codebase is reserved for Ronald Guido. Do not deploy, distribute, or reuse it without express permission from Ronald Guido.
