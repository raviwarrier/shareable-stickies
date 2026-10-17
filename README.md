# Shareable Stickies

Self-hostable modern pastebin for you to use or share with others.

## Features

- **Paste creation** — Title, content, syntax highlighting across 19 languages, custom slug, expiration options (10 minutes to never), password protection, visibility (public / unlisted / private), burn-after-reading
- **Image attachments** — Up to 15MB per image, unlimited images per sticky, served via local storage, Cloudinary, or S3
- **Stateless shares** — Compress paste data into a URL fragment (`#s=...`) with zero backend writes; share instantly without saving to the server
- **Client-side zero-knowledge encryption** — AES-256-GCM + PBKDF2 encryption in the browser before sending to the server; the server never sees plaintext
- **Authentication** — Login/registration, session tokens, admin/user roles, OIDC single sign-on (SSO), password changes
- **Dashboard** — Manage your pastes with search, sort (newest/oldest/views/copies/title), pin/unpin, delete, grid/list layout
- **Public sticky pages** — Browse public pastes by username at `/public-stickies/:username`
- **QR code sharing** — Generate QR codes for instant mobile access to any sticky
- **Admin panel** — Theme (dark / light / sepia), anonymous creation toggle, OIDC config, storage driver selection (local / Cloudinary / S3), admin credential management, storage connection testing
- **Raw text endpoint** — `/raw/:slug` for plaintext access
- **Solid Glass UI** — Tactile, technical, smoky pane design with dark/light/sepia themes


## Why This

I needed a pastebin that did two things in one app:

1. **Media file support** — Most pastebins are text-only. I wanted to attach images and screenshots directly to pastes without juggling a separate image host.
2. **Stateless one-off shares** — Sometimes I just need to send a quick snippet without creating an account, saving to a database, or managing expiration. Stateless mode compresses the paste into the URL itself — no backend write, no trace on the server, just share the link.

Existing tools forced me to choose between one or the other. Shareable Stickies does both, with client-side encryption so nothing sensitive ever leaves your browser unencrypted.

## Self-Hosting Installation

### Prerequisites

- Node.js 18+
- npm

### npm (direct)

```bash
git clone https://github.com/raviwarrier/shareable-stickies.git
cd shareable-stickies
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env with your settings (ENCRYPTION_SECRET, ADMIN_PASSWORD, etc.)
npm run dev        # development (tsx)
npm run build      # production build
npm run start      # production server (tsx)
```

### PM2 (process manager)

```bash
cd shareable-stickies
npm install --legacy-peer-deps
npm run build
npm install -g pm2
pm2 start "node server.js" --name shareable-stickies
pm2 save
```

### Docker

```bash
git clone https://github.com/raviwarrier/shareable-stickies.git
cd shareable-stickies
cp .env.example .env
# Edit .env as needed
docker build -t shareable-stickies .
docker run -d -p 3000:3000 --env-file .env shareable-stickies
```

Or with Docker Compose:

```bash
docker-compose up -d
```

## Update Instructions

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Reinstall dependencies (in case new packages were added):
   ```bash
   npm install --legacy-peer-deps
   ```

3. Run the setup script to sync configuration and environment variables to the database:
   ```bash
   ./setup.sh
   ```
   Or run it non-interactively using your existing `.env`:
   ```bash
   npx tsx server/setupCli.ts
   ```

4. Rebuild and restart:
   ```bash
   npm run build
   pm2 restart shareable-stickies   # if using PM2
   # or
   docker-compose up -d --build     # if using Docker
   ```

### setup.sh

`setup.sh` is the interactive installation and administration wizard. It configures:
- Default theme (dark / light / sepia)
- Public/anonymous creation toggle
- OIDC SSO settings
- Storage driver (local / Cloudinary / S3) and credentials
- Administrator username and password
- Encryption secret

It saves settings to `.env` and syncs them to `./data/stickies.json`. Run it after the initial clone, or anytime you want to reconfigure the server.

### update.sh

If an `update.sh` script exists in the repo, run it after pulling to apply any post-update steps (migrations, dependency checks, etc.):

```bash
./update.sh
```

Otherwise, the steps above (`git pull`, `npm install`, `./setup.sh`, `npm run build`) are the complete update procedure.

## Vibe-Coded with Google AI Studio

This application was developed with the assistance of Google AI Studio. AI was used to generate code, suggest architecture, and iterate on features. All code has been reviewed, compiled, and tested before release.

## SAST

Static Application Security Testing (SAST) results will be published here.

- **SonarCloud**: https://sonarcloud.io (project results link will be added once scans are run)
- **Fixes file**: Link to SAST remediation details will be added here

The SAST section is currently empty. Security findings and their fixes will be tracked here once scans are executed against the codebase.

## License

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.