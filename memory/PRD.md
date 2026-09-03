# Flash CarX - PRD

## Vision
Mobile-first app for car wash professionals to track wash earnings, compete with friends via daily/weekly/monthly rankings, and gamify their daily work with XP, levels, achievements and goals.

## Tech Stack
- Frontend: Expo + React Native + Expo Router (TypeScript)
- Backend: FastAPI + Motor (MongoDB async)
- Auth: JWT + bcrypt (email + password)
- Local secure token storage: expo-secure-store (native) / localStorage (web)

## Core Features (v1 implemented)
1. **Auth (email + password)**
   - Register: username (3-20 chars, lowercase), email, password (6+ chars)
   - Login with email + password, JWT token stored securely
   - Persistent session via `/api/auth/me`
2. **Wash tracking (Hoje tab)**
   - Register wash: car name + value; auto-computes user_earning = value * default_percentage / 100
   - Quick-pick amounts, delete individual washes
   - Hero card with today's earnings, daily goal progress
   - Stats cards: washes, revenue, ticket médio, week & month totals
   - Award XP on each wash (10 base + R$ earned as XP)
3. **Ranking (only among friends + me)**
   - Period: daily / weekly / monthly
   - Metric: earnings / revenue / washes
   - Podium view (top 3) + list
4. **History**
   - Filters: all / today / week / month
   - Search by car name
   - Summary totals for filtered list
5. **Profile**
   - Banner + avatar + username + email
   - Level bar with XP progress
   - Total earnings, total washes, achievement count
   - Menu: Amigos, Análise, Metas, Configurações
   - Achievements horizontal scroll (8 badges)
   - Friends activity feed (last 30 washes from friends)
6. **Friends system**
   - Search users by username/email
   - Send/accept/reject friend requests
   - List friends, remove friend
7. **Goals**
   - Daily goal + weekly goal with live progress bars
8. **Analytics screen (nested)**
   - Daily earnings bar chart (current month)
   - Highlights: most profitable car, most washed car
   - Car ranking list (mês)
9. **Settings (nested)**
   - Default percentage config
   - Account info, logout

## Data Models (Mongo)
- **users**: id (uuid), username (unique), email (unique), password_hash, avatar, level, xp, default_percentage, daily_goal, weekly_goal, total_earnings, total_washes, created_at
- **washes**: id, user_id, car_name, value, percentage, user_earning, date (YYYY-MM-DD), created_at
- **friend_requests**: id, from_user, to_user, status (pending/accepted/rejected), created_at
- **friendships**: id, user_a, user_b, created_at

## API Endpoints (all under /api)
- POST /auth/register, POST /auth/login, GET /auth/me, PATCH /auth/me
- POST /washes, GET /washes, PATCH /washes/{id}, DELETE /washes/{id}
- GET /stats/dashboard, GET /stats/analytics
- GET /users/search?q=
- POST /friends/request/{uid}, GET /friends/requests, POST /friends/accept/{rid}, POST /friends/reject/{rid}, DELETE /friends/{uid}, GET /friends
- GET /ranking?period=&metric=
- GET /achievements, GET /feed
