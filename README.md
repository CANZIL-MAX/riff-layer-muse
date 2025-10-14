# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4a9ac78c-8449-4d96-af58-32ea95a4c29f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4a9ac78c-8449-4d96-af58-32ea95a4c29f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Capacitor (for native iOS/Android apps)

## Native Mobile App Setup

This project includes native iOS support with a custom AudioInputPlugin located in `src/native-plugins/audio-input-plugin/`.

For detailed setup instructions, see [PLUGIN_SETUP.md](./PLUGIN_SETUP.md) and [QUICK_START.md](./QUICK_START.md).

Quick start:
1. Clone the repo or download ZIP from Lovable
2. Run `./setup.sh` for automated setup
3. Open in Xcode: `npx cap open ios`
4. Build and run (Cmd+R)

The plugin is now part of the `src/` directory to ensure it's always included in ZIP exports.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4a9ac78c-8449-4d96-af58-32ea95a4c29f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
