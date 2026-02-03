# ESL Error Annotator

## Frontend (GitHub Pages)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the app:
   ```bash
   npm run build
   ```

3. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

4. In GitHub: Settings → Pages → select `gh-pages` and `/ (root)`.

## Backend (Vertex AI on Cloud Run)

This app uses Vertex AI, which **cannot be called directly from a browser**. You must use a backend.

### 1) Enable APIs
- Vertex AI API
- Cloud Run API

### 2) Create a service account
Give it the **Vertex AI User** role. Use this service account when deploying Cloud Run.

### 3) Deploy the server
From the project root:

```bash
gcloud run deploy esl-error-annotator-api \
  --source server \
  --region asia-east1 \
  --allow-unauthenticated \
  --service-account YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com \
  --set-env-vars PROJECT_ID=YOUR_PROJECT_ID,LOCATION=asia-east1,MODEL=gemini-2.5-flash
```

When it finishes, copy the Cloud Run URL.

### 4) Configure the frontend
Open the deployed site → Settings → paste your **Cloud Run API URL** → Save.

(Alternatively, set `VITE_API_BASE_URL` in a `.env` file before building and redeploy.)

## Important Usage Notes

**Can I close the browser while processing?**
**No.** This application runs entirely in your browser (Client-Side). The batch processing logic relies on the active browser tab to send requests to the AI API and save data to Supabase.

- **If you close the tab**: Processing will stop immediately.
- **If you minimize the window**: Processing will continue, but might slow down depending on browser resource allocation.
- **Data Safety**: Every processed item is immediately saved to the Supabase database. If you accidentally close the tab, you can reload the page, check the "History" to see what finished, and re-upload the remaining items (you may need to filter your CSV to exclude already processed text).
