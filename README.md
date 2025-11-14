# Vite + React + TypeScript App for GitHub Pages

This is a template project initialized with Vite, React, and TypeScript, pre-configured for easy deployment to GitHub Pages.

## Setup and Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

## Running the Application Locally

To start the development server, run:
```bash
npm run dev
```
Open your browser and navigate to the URL provided in the console (usually `http://localhost:5173`).

## Deployment to GitHub Pages

Follow these steps to deploy your application.

### Step 1: Configure Project Paths

You must update the placeholder paths in two files to match your GitHub repository details.

1.  **`vite.config.ts`**:
    *   Open the `vite.config.ts` file.
    *   Find the `base` configuration option.
    *   Replace `'/MY_REPOSITORY_NAME/'` with your actual repository name (e.g., `'/my-cool-app/'`).

2.  **`package.json`**:
    *   Open the `package.json` file.
    *   Find the `homepage` field.
    *   Replace `https://MY_USERNAME.github.io/MY_REPOSITORY_NAME/` with your GitHub Pages URL (e.g., `https://johndoe.github.io/my-cool-app/`).

### Step 2: Run the Deployment Script

Once the paths are correctly configured, run the following command in your terminal:

```bash
npm run deploy
```

This script will:
1.  Build your application for production in the `dist` folder.
2.  Automatically push the contents of the `dist` folder to a special branch named `gh-pages` in your GitHub repository.

### Step 3: Enable GitHub Pages in Repository Settings

1.  Navigate to your repository on GitHub.
2.  Go to **Settings** > **Pages**.
3.  Under the "Build and deployment" section, for the **Source**, select **Deploy from a branch**.
4.  In the branch dropdown, select `gh-pages` and keep the folder as `/ (root)`.
5.  Click **Save**.

GitHub will now build and deploy your site from the `gh-pages` branch. It might take a few minutes for the site to become live. You can find the URL on the same settings page.
