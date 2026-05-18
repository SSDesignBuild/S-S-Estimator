# Step 11 — Job photos + Google Drive setup

This build adds the in-app Job Photo Documentation view.

## What it does

- Adds a **Photos** view beside Estimator and Calendar.
- Lets reps/installers take a photo from iPhone/desktop using the app.
- Requests GPS location when the photo is uploaded.
- Stamps the image with:
  - S&S Design Build
  - Job name
  - Address or GPS location
  - Date/time taken
- Uploads the stamped photo to Google Drive.
- Groups photos in the app by job address first, or GPS location if no address is entered.
- Saves photo metadata in Supabase when the optional `job_photos` table is added.

## Supabase SQL

Run this in Supabase SQL Editor:

```sql
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  address text,
  taken_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  note text,
  file_name text,
  drive_file_id text,
  drive_url text,
  drive_folder_name text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.job_photos enable row level security;

drop policy if exists "job_photos_read_authenticated" on public.job_photos;
drop policy if exists "job_photos_insert_authenticated" on public.job_photos;
drop policy if exists "job_photos_update_own_or_admin" on public.job_photos;
drop policy if exists "job_photos_delete_own_or_admin" on public.job_photos;

create policy "job_photos_read_authenticated"
on public.job_photos
for select
to authenticated
using (true);

create policy "job_photos_insert_authenticated"
on public.job_photos
for insert
to authenticated
with check (uploaded_by = auth.uid() or uploaded_by is null);

create policy "job_photos_update_own_or_admin"
on public.job_photos
for update
to authenticated
using (uploaded_by = auth.uid() or public.current_user_role() = 'admin')
with check (uploaded_by = auth.uid() or public.current_user_role() = 'admin');

create policy "job_photos_delete_own_or_admin"
on public.job_photos
for delete
to authenticated
using (uploaded_by = auth.uid() or public.current_user_role() = 'admin');
```

## Google Drive service account setup

1. Create or choose a Google Cloud project.
2. Enable the **Google Drive API**.
3. Create a **service account**.
4. Create a JSON key for the service account.
5. Create the parent folder in Google Drive where job photos should go.
6. Share that folder with the service account email as **Editor**.
7. Copy the parent folder ID from the Google Drive URL.

## Supabase secrets

Set these secrets:

```bash
npx supabase secrets set GOOGLE_DRIVE_PHOTO_FOLDER_ID="your-drive-folder-id"
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ... }'
```

Then deploy the new Edge Function:

```bash
npx supabase functions deploy upload-job-photo --use-api --no-verify-jwt
```

Keep the existing GoHighLevel function deployed too:

```bash
npx supabase functions deploy send-to-ghl --use-api --no-verify-jwt
```

## Notes

- The service account can only upload into folders it has access to.
- If the Supabase `job_photos` table is not added yet, photo metadata falls back to local device history.
- If the Edge Function secrets are missing, the app will show a Google Drive upload error instead of crashing.
