# Step 10: GoHighLevel integration foundation

This build adds the safe foundation for GoHighLevel.

## What this build does right now
- Adds a **Send to GoHighLevel** button in the quote summary.
- Stores GHL settings in Supabase `pricing_settings`.
- Calls a **Supabase Edge Function** so your private token stays off the frontend.
- Upserts the contact in GoHighLevel first.
- Returns a prepared estimate payload so the final exact product mapping can be finished in the next pass.

## What you need to do later
1. Create a **Private Integration** in GoHighLevel.
2. Copy the token one time.
3. Set that token as a Supabase Edge Function secret named:
   `GHL_PRIVATE_INTEGRATION_TOKEN`
4. Deploy the edge function in `supabase/functions/send-to-ghl`
5. Paste your GoHighLevel **Location ID** into the admin pricing panel in the app and save.

## Important
Do **not** put the GoHighLevel private token in Netlify env vars or in the frontend.
Keep it only in the Supabase Edge Function secret.
