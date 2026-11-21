# My Personal Hub

Private, all-in-one manager for personal info, records and finances.
Runs on your own Windows laptop with XAMPP MySQL. Currency: RM.

**Name:** change it in `src/lib/config.ts`.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Prisma · MySQL (XAMPP)

---

## First-time setup (Windows)

### 1. Put the project in place
Unzip `my-personal-hub` somewhere simple, for example `C:\Projects\my-personal-hub`.
Open that folder in VS Code (File → Open Folder).

### 2. Start MySQL
Open XAMPP Control Panel → click **Start** next to MySQL (it should show port 3306).

### 3. Create your `.env` file
In VS Code, copy `.env.example` and rename the copy to `.env`. Then:

1. **DATABASE_URL** — replace `YourStrongPassword` with your MySQL root password.
   If you haven't set one yet, use `mysql://root:@localhost:3306/personal_hub`
   for now (set a password soon).
2. **AUTH_SECRET** — open the VS Code terminal (Terminal → New Terminal) and run:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste the long result between the quotes.

### 4. Install and create the database
In the VS Code terminal:
```
npm install
npx prisma migrate dev --name init
```
The second command creates the `personal_hub` database and its tables.

### 5. Run it
```
npm run dev
```
Open **http://localhost:3000**. The first visit asks you to create your
name and password — that becomes the only account.

---

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Run while developing (auto-reloads on changes) |
| `npm run db:studio` | Browse your database in the browser |
| `npm run reset-password -- "NewPassword123"` | Reset your password if forgotten |

Auto-start (no terminal needed) and phone access are set up in Step 6.

## Installing an update (each new step)

1. Stop the server: click the terminal running it and press **Ctrl + C**.
2. Unzip the update and copy everything inside its `my-personal-hub` folder
   into your project folder. Choose **Replace** when Windows asks.
   (Your `.env`, database and `node_modules` aren't touched.)
3. In the VS Code terminal, update the database:
   ```
   npx prisma migrate dev --name <name given in the update notes>
   ```
4. Start again with `npm run dev`.

## Daily use: auto-start, phone access & notifications (Step 7)

### A. Start MySQL automatically
1. Close XAMPP. Right-click **XAMPP Control Panel** → **Run as administrator**.
2. Tick the **Service** box next to **MySQL** → **Yes**. MySQL now starts with Windows.

### B. Start the Hub automatically (fast production mode)
1. Stop `npm run dev` if it's running (Ctrl + C).
2. In the VS Code terminal: `npm run build` (takes a minute).
3. Press **Win + R**, type `shell:startup`, press Enter. A folder opens.
4. In your project, open `scripts\windows`. Right-click **start-hub-hidden.vbs** →
   **Show more options** → **Create shortcut**. Move that shortcut into the Startup folder.
5. Double-click the shortcut once now to start the Hub. Open http://localhost:3000.

From now on the Hub starts by itself when you sign in to Windows — no terminal.

| Script (in `scripts\windows`) | Use it when |
|---|---|
| `update-hub.cmd` | After copying in an update (rebuilds + restarts) |
| `stop-hub.cmd` | You want to stop the Hub, e.g. before using `npm run dev` |
| `start-hub-hidden.vbs` | Start it again without restarting Windows |

Logs are in the `logs` folder if something goes wrong.

### C. Phone access with Tailscale (private, free)
1. Install **Tailscale** on the laptop (tailscale.com/download) and sign in.
2. Install the **Tailscale** app on your phone and sign in with the **same account**.
3. In the Tailscale admin console (login.tailscale.com) → **DNS**: make sure **MagicDNS** is on,
   then click **Enable HTTPS**.
4. On the laptop, open **Command Prompt** and run:
   ```
   tailscale serve --bg 3000
   ```
   It prints your private address, like `https://your-laptop.tail1234.ts.net`.
   This setting survives restarts.
5. On your phone (Tailscale switched on), open that address and sign in.

Only your own devices signed in to your Tailscale account can open that address.
The Hub itself only listens on the laptop (127.0.0.1), so nobody on the same Wi-Fi can reach it.

### D. Install as an app
- **Laptop (Chrome/Edge):** open the Hub → install icon at the right of the address bar → **Install**.
- **Android (Chrome):** ⋮ menu → **Add to Home screen** / **Install app**.
- **iPhone (Safari):** Share → **Add to Home Screen**. (Needed for notifications on iPhone.)

### E. Notifications
Open **Settings → Notifications** on each device (on iPhone, from the Home Screen icon) →
**Turn on notifications** → **Send a test**. Choose what you want to be notified about on the same page.
Notifications are sent by the laptop, so they only go out while it's on and awake.

## Backups

- A backup is made **automatically once a day** (newest 14 kept) in the `backups`
  folder. Make one any time in **Settings → Export & backups → Back up now**.
- Each backup = `data.json` (whole database) + `files/` (encrypted uploads).
- **Copy the `backups` folder to a USB drive or Google Drive regularly.**
- To restore: Settings → Export & backups → restore icon → type RESTORE.
  A safety backup of your current data is made first.
- To restore on a new laptop: set up the project, use the same `.env`
  (especially `ENCRYPTION_KEY`), copy the backup folder into `backups`, sign in,
  then restore it.

## Records: encryption key & backups

Document numbers and uploaded files (Records) are encrypted with `ENCRYPTION_KEY`
from `.env`. Uploaded files are saved in the `storage/records` folder.

- **Write the key down somewhere safe.** If it's lost or changed, saved numbers
  and files can't be opened again.
- A complete backup = the MySQL database **+** the `storage` folder **+** your `.env`.

## Troubleshooting

- **`Can't reach database server`** — MySQL isn't started in XAMPP, or the
  password in `.env` is wrong.
- **`AUTH_SECRET is missing`** — `.env` wasn't created, or the secret is shorter
  than 32 characters.
- **Port 3000 already in use** — close the other terminal running `npm run dev`.

## Security notes

- Passwords are hashed with bcrypt; they're never stored as plain text.
- 5 wrong passwords lock the login for 15 minutes.
- Sessions last 12 hours, then you unlock again.
- Never share or upload your `.env` file — it holds your database password
  and session secret.
