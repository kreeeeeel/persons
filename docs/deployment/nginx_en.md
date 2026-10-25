# Nginx: website, ID and CMS

Run host Nginx on the same VDS as production Compose. Templates assume a direct internet connection without a CDN. Only host Nginx supplies trusted forwarded headers; configure explicit trusted CDN networks before adding another proxy.

Create A records for the base domain, `id.` and `cms.` pointing to the VDS IPv4. Open inbound 80/443. The base domain proxies to `127.0.0.1:3002`, ID to `:3000`, CMS to `:3001`. Production Compose disables the local gateway and binds frontend ports to loopback.

In the server-only `shared/.env` set `PUBLIC_PERSON_URL=https://example.ru`, `PUBLIC_ID_URL=https://id.example.ru`, `PUBLIC_ADMIN_URL=https://cms.example.ru`, `SESSION_COOKIE_DOMAIN=example.ru`, replacing the example. The shared session is Secure, HttpOnly, SameSite=Lax, path `/`; logout expires it on the same domain. All public hosts must belong to that domain and use HTTPS. Keep this variable empty for local `localhost` ports. Host only trusted applications below the shared domain.

With Nginx and Certbot installed, run the following from infrastructure's prepared checkout/release. These paths use Debian/Ubuntu conventions. Preserve other virtual hosts. Host Nginx configuration is deliberately not installed or reloaded by CI:

```sh
domain=example.ru
sudo mkdir -p /var/www/letsencrypt
sh scripts/render-nginx.sh "$domain" http | sudo tee /etc/nginx/sites-available/persons.conf >/dev/null
sudo ln -s /etc/nginx/sites-available/persons.conf /etc/nginx/sites-enabled/persons.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/letsencrypt --cert-name "$domain" \
  -d "$domain" -d "id.$domain" -d "cms.$domain" \
  --deploy-hook 'nginx -t && systemctl reload nginx'
sh scripts/render-nginx.sh "$domain" https | sudo tee /etc/nginx/sites-available/persons.conf >/dev/null
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Ensure Certbot's renewal timer is enabled. The HTTP bootstrap does not require a certificate. HTTPS keeps the ACME webroot and redirects other HTTP traffic. Request limits are 1 MiB for ID and 545 MiB for website/CMS; application file limits still apply (512 MiB videos, 32 MiB photos). Request and response buffering are disabled for streaming, with a 600-second website/CMS timeout.

Verify sign-in on ID, return to the website, CMS access for an administrator, client IP in the session list, and sign-out across all three hosts. `sh scripts/tests/nginx.test.sh` validates routing, TLS, redirects, ACME, body limits and rejection of spoofed forwarded headers in a disposable container.

References: [Nginx proxy headers](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header), [Certbot webroot](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot).
