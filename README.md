# S&S Design Build Estimator

A Netlify-ready React/Vite web app built from the uploaded pricing sheets.

## What's included
- Standard pricing estimator using the uploaded `Estimating Template - 5.pdf` as the base sheet.
- Tier multipliers for Volume (-5%), 5% (base), 7.5% (+10%), 10% (+20%), and 15% (+30%).
- Renaissance estimator using the uploaded `Renaissance 40 - Sell Price.pdf`, plus derived 50 (+20%) and 60 (+30%) tiers.
- Sales tax logic set to tax only 40% of subtotal.
- Automatic $500 permit fee.
- Financing modeled as `totalNoFinancing * 1.10`, divided by 5, 10, or 15 years.
- Local browser persistence via `localStorage`.
- Copy-to-clipboard quote summary.
- Seeded rule warnings for concrete scope issues and flat-pan minimum-charge reminders.

## Important limitations before production use
1. This build is based only on the two uploaded PDFs.
2. Your requested "intelligence" rule engine is scaffolded, but only seeded with a few sample rules. Add the rest of your out-of-scope / restriction rules into `src/data.js`.
3. Automatic Renaissance post-sizing logic is not fully possible from the uploaded sheet alone because the post/beam sizing thresholds were not explicitly provided. The app currently lets the rep choose the upgrade manually.
4. The app style is inspired by the public S&S website (white surfaces, dark type, gold accents), but you should drop in the official logo asset for production.

## Local setup
```bash
npm install
npm run dev
```

## Build
```bash
npm install
npm run build
```

## GitHub + Netlify
1. Create a new empty GitHub repo.
2. Upload these files or push them with Git.
3. In Netlify, choose **Add new site** > **Import an existing project**.
4. Connect GitHub and pick the repo.
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Deploy.

## Supabase?
Not needed for version 1. Add Supabase later only if you want:
- login per rep
- cloud-synced price sheets
- quote history
- commission tracking
- admin-only rules and pricing updates

## Source references used for this build
- Base 5 sheet pricing from the uploaded `Estimating Template - 5.pdf`.
- Renaissance 40 matrix and add-on pricing from the uploaded `Renaissance 40 - Sell Price.pdf`.


## Supabase environment variables

Create a `.env` file locally or set these in Netlify:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
```
