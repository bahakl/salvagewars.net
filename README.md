# Salvage Wars website

Static site plus a small Cloudflare Worker for the beta sign-up and feedback forms.

## Before you publish

1. Find and replace two placeholders in `public/index.html`, `public/privacy.html` and `public/terms.html`:
   - `hello@salvagewars.net` with the email address players can write to
   - `Baha Kalmurat` with the name or studio you want shown
2. Swap in better screenshots whenever you have them: replace `public/assets/shot-1.jpg`, `shot-2.jpg` and `shot-3.jpg` (portrait, about 500×900).
3. Add the Google Play link once the game is live: replace the "Google Play: coming soon" span in `public/index.html` with a link.
4. Read `public/privacy.html` and `public/terms.html` and change anything that isn't true for your game (retention periods, ads, analytics, accounts). They are plain templates, not legal advice.

## Deploy

Replace everything in your website repo (except `.git`) with these files, including deleting the old `package-lock.json`, then push. Cloudflare builds and deploys automatically. The build command is `npm run build` and the deploy command is `npm run deploy`, which matches the defaults you already have.

## Turn on the forms

The site works without this, but the forms answer "This form isn't open yet" until you do it. Run these in the repo folder:

```
npx wrangler login
npx wrangler d1 create salvagewars
```

Copy the `database_id` it prints into the commented `d1_databases` block in `wrangler.jsonc` and remove the `//` marks. Then create the tables and push:

```
npx wrangler d1 execute salvagewars --remote --file=schema.sql
git add . && git commit -m "Enable forms" && git push
```

## Read the sign-ups and feedback

```
npx wrangler d1 execute salvagewars --remote --command "SELECT nickname, email, device FROM signups"
npx wrangler d1 execute salvagewars --remote --command "SELECT created_at, category, message FROM feedback ORDER BY id DESC"
```

You can also browse the tables in the Cloudflare dashboard under Storage & databases > D1.

Add the sign-up emails to a Google Group and attach that group to your closed test track in Play Console.

## Delete someone's data

```
npx wrangler d1 execute salvagewars --remote --command "DELETE FROM signups WHERE email = 'person@example.com'"
```

## Your own domain

In the Worker's Settings > Domains & Routes, add your domain. If you plan to show ads, put `app-ads.txt` in `public/` at that point.
