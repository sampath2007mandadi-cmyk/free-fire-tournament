# NOVA SQUAD — Tournament Control

## Final setup

### 1. Supabase
Open **Supabase → SQL Editor**, paste the complete contents of `supabase_setup.sql`, and run it once. This is a fresh reset and removes the current tournament tables/data before recreating them.

Initial admin password: `Admin@123`

Change it immediately from the Admin Panel.

### 2. Vercel environment variables
Add these under **Project → Settings → Environment Variables**:

- `SUPABASE_URL` = your Supabase Data API URL
- `SUPABASE_SECRET_KEY` = your Supabase secret/service-role key
- `ADMIN_SESSION_SECRET` = a long random secret, for example `N7v!q2L#9xP@4mZ8$kR5&dT1wY6`

Never put the Supabase secret key in GitHub or browser JavaScript.

### 3. PhonePe QR
Upload your own PhonePe QR image to the repository root with the exact filename:

`phonepe-qr.jpeg`

The public registration page displays this image and asks the payer for the UTR. A payment screenshot is not required.

### 4. Vercel
Import this GitHub repository into Vercel and deploy. Vercel will serve `index.html` and the `/api` functions automatically.

## Public vs admin

Everyone can view the website, register a team, request tournament entry and see the public leaderboard.

Only the admin password unlocks editing. Admin can manage teams, approve/reject ₹200 payment requests, edit scores and change the admin password.
