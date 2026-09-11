# EduGame — Deployment

The app runs in Docker on an existing personal VPS, behind Apache (the VPS's existing reverse proxy for its other sites — not nginx, even though nginx is installed on the box), with a Let's Encrypt cert via certbot's Apache plugin.

- **URL:** https://game.corentinhillion.com
- **VPS:** `139.99.171.139` (Ubuntu 22.04), user `ubuntu`
- **SSH key:** `~/.ssh/edugame_vps` (dedicated to this project — don't reuse other projects' keys, and don't reuse this one elsewhere)
- **Container:** `edugame` (image `edugame:latest`), listens on `127.0.0.1:3001` on the host, `--restart unless-stopped`
- **Reverse proxy:** `/etc/apache2/sites-available/game.corentinhillion.com.conf` (+ `-le-ssl.conf` created by certbot), `ProxyPass`/`ProxyPassReverse` to `http://127.0.0.1:3001/`
- **Repo on VPS:** `~/edugame` (plain `git clone` of the GitHub repo — it's public, no deploy key needed to pull)

## How it's built

`Dockerfile` is a multi-stage build using Next.js's `output: "standalone"` (set in `next.config.ts`) for a minimal runtime image. Uses `npm install` rather than `npm ci` in the deps stage — the committed lockfile has minor optional-dependency drift from being generated on Windows, which trips `npm ci`'s strict check; revisit if the lockfile ever gets regenerated on Linux.

## Deploying a new version (manual — no CI yet)

From the VPS:

```bash
cd ~/edugame
git pull
sudo docker build -t edugame:latest .
sudo docker rm -f edugame
sudo docker run -d --name edugame --restart unless-stopped -p 127.0.0.1:3001:3000 edugame:latest
```

(Assumes port 3001 stays free/reserved for this app — see "Ports already in use" below before picking a different one.)

## Why Apache, not nginx

nginx is installed on this VPS but not running (`systemctl status nginx` shows `inactive (dead)`). The box's actual reverse proxy for every other domain on it (`bd.corentinhillion.com`, `files.corentinhillion.com`, etc.) is Apache with `mod_proxy`, on ports 80/443. `game.corentinhillion.com`'s vhost follows that same pattern rather than introducing a second reverse proxy. Don't start the host nginx service — nothing depends on it, and it doesn't own 80/443 here.

## Ports already in use on this VPS (checked before picking 3001)

`3000` (nodecast-tv), `3306` (mysql), `5000` (kavita, used by bd.corentinhillion.com), `6881` (qbittorrent), `8010` (uvicorn — business-fetcher's API), `8069` (Odoo), `8080`/`8081`/`8082` (docker-proxied services), `8096` (jellyfin), `9696` (prowlarr), `11211` (memcached). Check again before reusing a port for anything new here — this VPS runs several unrelated personal projects.

## Open questions / not yet set up

- No CI/CD — deploys are manual, run by hand per the steps above.
- No environment-variable/secrets management yet (nothing needed until the backend/DB phase).
- No health checks, log shipping, or monitoring beyond `docker ps`/`docker logs edugame`.
