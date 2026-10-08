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
scp deploy/Caddyfile root@<YOUR_HETZNER_IP>:/opt/framedl/
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

## 4. GitHub Container Registry Authentication

If your GitHub repository is private, log in to GitHub Container Registry on the VPS once:
```bash
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin
```
*(Personal Access Token needs `read:packages` permission).*

---

## 5. Configure Scheduled Crons

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

## 6. Configure GitHub Actions Secrets

In your GitHub repository settings under **Settings -> Secrets and variables -> Actions**, add:

| Secret Name | Value |
|---|---|
| `HETZNER_HOST` | IPv4 address of your Hetzner VPS |
| `HETZNER_USER` | `root` (or custom deploy user) |
| `HETZNER_SSH_KEY` | Private SSH key matching the public key on the VPS |
| `HETZNER_PORT` | `22` (or your custom SSH port) |

---

## 7. DNS Cutover (Removing Vercel)

1. Lower TTL on Cloudflare / your DNS provider to **300 seconds** (5 minutes).
2. Push your changes to `main` on GitHub to trigger the initial image build and deployment via GitHub Actions.
3. Test by accessing the VPS IP directly or via staging domain.
4. Point DNS:
   - `framedl.com` -> `A` record to Hetzner IPv4
   - `pro.framedl.xyz` -> `A` record to Hetzner IPv4
5. Caddy will automatically provision Let's Encrypt certificates within seconds of DNS propagating!
6. Once stable, disable Vercel crons and delete domain assignments in Vercel.
