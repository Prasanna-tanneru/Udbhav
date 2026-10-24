# How to Run the Project

Follow these exact commands in your terminal to install dependencies and run the JANSETU AI project locally:

```bash
cd JANSETU-AI-Firebase-sih2026-77922
npm install
npm run dev
```

---

## ⚡ Troubleshooting Port Errors (`Port 5173 is already in use`)

If you get the error **`Error: Port 5173 is already in use`**, it means the dev server is **already running background in your environment**, or another process is using port 5173.

### Solution Option 1: Access the already running server
Simply open your browser and navigate to:
👉 **`http://localhost:5173/`**

---

### Solution Option 2: Kill existing processes and restart
Run the following command in PowerShell to free up port 5173 and start fresh:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```

---

## Demo Login Credentials

You can log in using any of the following accounts with password **`demo123`** (or use the one-click role selectors on the sign-in page):

- **Citizen:** `citizen@jansetu.demo`
- **Student:** `student@jansetu.demo`
- **Faculty:** `faculty@jansetu.demo`
- **University:** `university@jansetu.demo`
- **Industry:** `industry@jansetu.demo`
- **Government:** `government@jansetu.demo`
- **District Officer:** `district@jansetu.demo`
- **Platform Admin:** `admin@jansetu.demo`

