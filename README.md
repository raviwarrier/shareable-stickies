# Shareable Stickies v0.3.5

Self-hostable modern pastebin for you to use or share with others.

Self-hostable modern pastebin for you to use or share with others.

## Features

- **Paste creation** — Title, content, syntax highlighting across 19 languages, custom slug, expiration options (10 minutes to never), password protection, visibility (public / unlisted / private), burn-after-reading
- **File attachments** — Admin-configurable file type categories (documents, code, images, video, audio, archives, other), unlimited files per sticky, served via local storage, Cloudinary, or S3. Executables (.exe, .msi, .bat, .sh, .js, .jar, etc.) are always blocked. Max size per file is configurable via `MAX_FILE_SIZE` in `.env` (default 15MB) or the Admin Settings modal.
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

### File Type Categories

Administrators can control which file types users may attach to stickies via the Admin Settings modal or `.env`:

| Category | File Extensions | `.env` toggle |
|----------|----------------|---------------|
| Documents | .pdf, .doc, .docx, .txt, .rtf, .odt, .pages | `ALLOW_DOCUMENTS` |
| Code | .js, .ts, .py, .java, .cpp, .c, .html, .css, .xml, .json, .yaml, .md, etc. | `ALLOW_CODE` |
| Images | .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp, .ico, .tiff | `ALLOW_IMAGES` |
| Video | .mp4, .avi, .mov, .wmv, .flv, .mkv, .webm, .m4v | `ALLOW_VIDEO` |
| Audio | .mp3, .wav, .flac, .aac, .ogg, .wma, .m4a | `ALLOW_AUDIO` |
| Archives | .zip, .rar, .7z, .tar, .gz, .bz2, .xz | `ALLOW_ARCHIVES` |
| Other | Any non-executable file not in above categories | `ALLOW_OTHER` |

Set any category to `false` to disable it. Executables (`.exe`, `.msi`, `.bat`, `.sh`, `.js`, `.jar`, `.app`, `.dmg`, `.pkg`, etc.) are **always blocked** regardless of category settings.

### setup.sh

`setup.sh` is the interactive installation and administration wizard. It configures:
- Default theme (dark / light / sepia)
- Public/anonymous creation toggle
- OIDC SSO settings
- Storage driver (local / Cloudinary / S3) and credentials
- File type categories and max attachment size
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

Static Application Security Testing (SAST) results are published below. All identified issues have been remediated — see the detailed fix log for each change, including the rule name, severity, and rationale.

- **SonarCloud Project**: https://sonarcloud.io/project/overview?id=raviwarrier_shareable-stickies
- **SAST Fixes Log**: [fixes.md](./fixes.md) — one-line summary of every code fix applied, categorized by rule ID (e.g., `typescript:S3776`, `typescript:S6848`, `docker:S6470`, `javascript:S2076`) with severity level (CRITICAL, MAJOR, MINOR, CODE_SMELL, BUG, VULNERABILITY).

The SAST remediation covers SQL injection defense-in-depth, SHA-1 → SHA-256 encryption upgrade, Docker non-root user and image pinning, multer file size limits, Express header hardening, cognitive complexity reductions, accessibility fixes (ARIA roles, keyboard listeners, form labels), and more.

## License

MIT License

This project is completely open and free for anyone to use. You are welcome to copy, modify, merge, publish, distribute, or even sell this software without any restrictions or required copyright notices.

⚠️ Important Warning:
While this application has been tested, no software is entirely bug-free. Please thoroughly inspect, test, and validate the code yourself before deploying it into any critical infrastructure, production environment, or high-stakes application. You assume all responsibility for its use.