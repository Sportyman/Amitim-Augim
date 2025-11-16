# Amitim Activity Finder (PWA)

This is a Progressive Web App for finding activities, built with Vite, React, and TypeScript. It's configured for easy deployment to GitHub Pages.

## Features

- **PWA Ready**: Installable on mobile devices and works offline thanks to a service worker.
- **Modern Tech Stack**: React, Vite, TypeScript, TailwindCSS.
- **Search & Filter**: Advanced filtering options to find the perfect activity.
- **Gemini API Integration**: Smart search capabilities powered by Google's Gemini API.

## Setup and Installation

1.  **Clone the repository.**
2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Running Locally

To start the development server:
```bash
npm run dev
```
This will open the app in your browser, usually at `http://localhost:5173`.

## Building for Production & Deployment

To build the application for production:
```bash
npm run build
```
This command will:
1.  Check for TypeScript errors.
2.  Run Vite's build process.
3.  Generate all necessary PWA assets (service worker, manifest, icons).
4.  Place the final, optimized application into a `/docs` folder at the root of the project.

### Deploying to GitHub Pages

1.  **Configure `vite.config.ts`**: Make sure the `base` property in `vite.config.ts` matches your repository name (e.g., `'/my-repo/'`).
2.  **Build the App**: Run `npm run build`.
3.  **Commit and Push**: Commit the generated `/docs` folder and push it to your GitHub repository.
4.  **Enable GitHub Pages**: In your repository settings on GitHub, navigate to **Pages**. Under "Build and deployment", select **Deploy from a branch**, and choose the `main` (or `master`) branch with the `/docs` folder as the source.

Your PWA will be live at the URL provided by GitHub Pages.
