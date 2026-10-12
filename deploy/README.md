# Hetzner VPS Deployment Guide for Framedl & Framedl PRO

This guide covers setting up your Hetzner Cloud VPS to host **framedl.com** and **pro.framedl.xyz**, connected to your existing **Neon** databases, with automated GitHub Actions CI/CD on every push to `main`.

---

## 1. VPS Provisioning on Hetzner Cloud

1. Create a server in the [Hetzner Cloud Console](https://console.hetzner.cloud/):
   - **Type:** Standard (x86) -> **CPX21** (3 vCPU AMD, 4 GB RAM) or **CPX31** (4 vCPU AMD, 8 GB RAM).
   - **Location:** Falkenstein or Nuremberg (Germany).
   - **Image:** Ubuntu 24.04 LTS.
   - **SSH Key:** Add your public SSH key.
2. Note the public IPv4 and IPv6 addresses.

---

## 2. Server Hardening & Docker Installation

SSH into the server as root:
```bash
ssh root@<YOUR_HETZNER_IP>
```

Run basic updates and firewall configuration:
```bash
# Update packages
apt update && apt upgrade -y

# Configure firewall (UFW)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp # For HTTP/3
ufw enable

# Install fail2ban & curl
apt install -y fail2ban curl git
```

Install Docker and the Compose plugin via official Docker repository:
```bash
# Add Docker's official GPG key & repo:
apt install -y ca-certificates
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

---

## 3. Setup Deployment Directory on VPS

Create the `/opt/framedl` folder structure:
```bash
mkdir -p /opt/framedl/scripts
```

Copy the deployment files from your repo to the VPS (or clone the repo):
```bash
# On your local machine:
scp deploy/docker-compose.yml root@<YOUR_HETZNER_IP>:/opt/framedl/
scp deploy/scripts/* root@<YOUR_HETZNER_IP>:/opt/framedl/scripts/
ssh root@<YOUR_HETZNER_IP> "chmod +x /opt/framedl/scripts/*.sh"
```

Create your production environment files:
```bash
# On the VPS:
cp /opt/framedl/.env.framedl.sample /opt/framedl/.env.framedl
cp /opt/framedl/.env.pro.sample /opt/framedl/.env.pro

# Fill in your secrets and Neon database URLs:
nano /opt/framedl/.env.framedl
nano /opt/framedl/.env.pro
```

*(Ensure `PG_CONNECTION_STRING` points to your Neon database for each instance, and `FRAMEDL_PRO=true` is set on `.env.pro`).*

---

## 4. Reverse Proxy Setup (Host Nginx vs Docker Caddy)

### Option A: If your VPS already runs Nginx (Recommended)
If your Hetzner VPS is already running Nginx on the host, **do not run Caddy** (to avoid port 80/443 collisions). The containers expose their internal ports to localhost:
- `framedl-app` listens on `127.0.0.1:3000`
- `framedl-pro` listens on `127.0.0.1:3001`

1. Copy the sample Nginx config to your Nginx sites:
   ```bash
   scp deploy/nginx.conf.sample root@<YOUR_HETZNER_IP>:/etc/nginx/sites-available/framedl.conf
   ```
2. Enable the site and reload Nginx on the VPS:
   ```bash
   ln -s /etc/nginx/sites-available/framedl.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```
3. Issue SSL certificates via Certbot:
   ```bash
   certbot --nginx -d framedl.com -d www.framedl.com -d pro.framedl.xyz
   ```

### Option B: If your VPS is clean / standalone (Docker Caddy)
If your server does NOT run any other web server on port 80/443, Caddy can be enabled via Docker Compose profiles:
```bash
scp deploy/Caddyfile root@<YOUR_HETZNER_IP>:/opt/framedl/
docker compose --profile caddy up -d
```

---

## 5. GitHub Container Registry Authentication

If your GitHub repository is private, log in to GitHub Container Registry on the VPS once:
```bash
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin
```
*(Personal Access Token needs `read:packages` permission).*

---

## 6. Pre-Cutover Staging & Testing Guide

Before updating DNS or merging the `migration/hetzner` branch to `main`, verify everything on the VPS:

### Step 1: Start the Containers on VPS with the Migration Image
On the VPS in `/opt/framedl`:
```bash
# Pull and start using the migration branch image:
IMAGE_NAME=ghcr.io/cryptods8/openframedl:migration-hetzner docker compose up -d

# Verify both containers are running and healthy:
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3001/api/health
```

### Step 2: Test via SSH Port Forwarding (Zero DNS Changes, 100% Safe)
On your **local computer**, run an SSH tunnel to forward the VPS ports:
```bash
ssh -L 8080:localhost:3000 -L 8081:localhost:3001 root@<YOUR_HETZNER_IP>
```
While that terminal remains open:
- Open `http://localhost:8080` in your browser: You are browsing **framedl.com** running on your Hetzner VPS and connected to your Neon DB!
- Open `http://localhost:8081` in your browser: You are browsing **Framedl PRO** running on your Hetzner VPS!
- Test solving a puzzle, check the leaderboard, verify database inserts.
- **Production on Vercel is completely unaffected.**

### Step 3: Test with a Staging Subdomain (Optional, for Farcaster/SSL)
If you want to test Farcaster Sign-In or Frames with public HTTPS before cutover:
1. Add a temporary DNS A record: `staging.framedl.com` -> `<YOUR_HETZNER_IP>`
2. In `/etc/nginx/sites-available/framedl.conf`, uncomment the staging server block pointing to `127.0.0.1:3000`.
3. Run `certbot --nginx -d staging.framedl.com` to get an instant free SSL cert.
4. Open `https://staging.framedl.com` in your browser or Farcaster frame debugger!

### Step 4: Validate Background Crons
Test that the VPS can run scheduled tasks against Neon:
```bash
/opt/framedl/scripts/trigger-cron.sh daily-process
tail -n 20 /var/log/framedl-crons.log
```

---

## 7. Configure Scheduled Crons

Install the crontab configuration to trigger reminders, arena processing, bot casts, and payouts:
```bash
cp /opt/framedl/crontab.sample /etc/cron.d/framedl
chmod 0644 /etc/cron.d/framedl
```

View cron logs anytime:
```bash
tail -f /var/log/framedl-crons.log
```

---

## 8. Configure GitHub Actions Secrets for Automated CI/CD

In your GitHub repository settings under **Settings -> Secrets and variables -> Actions**, add:

| Secret Name | Value |
|---|---|
| `HETZNER_HOST` | IPv4 address of your Hetzner VPS |
| `HETZNER_USER` | `root` (or custom deploy user) |
| `HETZNER_SSH_KEY` | Private SSH key matching the public key on the VPS |
| `HETZNER_PORT` | `22` (or your custom SSH port) |

Once these secrets are set, any push to `main` will build the Docker image and automatically trigger a zero-downtime rolling restart via SSH.

---

## 9. Final Production DNS Cutover (Removing Vercel)

Once you have verified the staging setup:
1. Merge the `migration/hetzner` branch to `main`:
   ```bash
   git checkout main
   git merge migration/hetzner
   git push origin main
   ```
2. GitHub Actions will build and push `ghcr.io/cryptods8/openframedl:latest` and auto-deploy to `/opt/framedl` on Hetzner.
3. Lower TTL on Cloudflare / your DNS provider to **300 seconds** (5 minutes).
4. Point DNS:
   - `framedl.com` -> `A` record to Hetzner IPv4
   - `pro.framedl.xyz` -> `A` record to Hetzner IPv4
5. If using Nginx, run `certbot --nginx -d framedl.com -d www.framedl.com -d pro.framedl.xyz`.
6. Once DNS propagates and traffic hits Hetzner, disable Vercel crons and delete domain assignments in Vercel.
