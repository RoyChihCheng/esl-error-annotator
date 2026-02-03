# ESL Error Annotator

## Deployment Guide

This is a React Single Page Application (SPA). To deploy it:

1.  **Build the Application**:
    Run the build command in your terminal:
    ```bash
    npm run build
    ```
    This will create a `dist` or `build` folder containing static files (HTML, CSS, JS).

2.  **Host Static Files**:
    You can deploy the generated folder to any static hosting provider:
    *   **Vercel**: Drag and drop the build folder or connect your Git repository.
    *   **Netlify**: Drag and drop the build folder.
    *   **GitHub Pages**: Push the build folder to a `gh-pages` branch.
    *   **AWS S3 / CloudFront**: Upload files to an S3 bucket configured for static website hosting.

## Important Usage Notes

**Can I close the browser while processing?**
**No.** This application runs entirely in your browser (Client-Side). The batch processing logic relies on the active browser tab to send requests to the AI API and save data to Supabase.

*   **If you close the tab**: Processing will stop immediately.
*   **If you minimize the window**: Processing will continue, but might slow down depending on browser resource allocation.
*   **Data Safety**: Every processed item is immediately saved to the Supabase database. If you accidentally close the tab, you can reload the page, check the "History" to see what finished, and re-upload the remaining items (you may need to filter your CSV to exclude already processed text).
