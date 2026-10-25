# Nginx: сайт, ID и CMS

Шаблоны рассчитаны на Nginx на том же VDS, где запущен production Compose, без внешнего CDN/reverse proxy. Nginx завершает TLS и единственный передаёт доверенные `X-Forwarded-*`. Если позже появится CDN, сначала настройте доверенные адреса CDN и real IP, не принимайте произвольный клиентский `X-Forwarded-For`.

| Имя | Upstream |
| --- | --- |
| `example.ru` | `127.0.0.1:3002` |
| `id.example.ru` | `127.0.0.1:3000` |
| `cms.example.ru` | `127.0.0.1:3001` |

В DNS нужны три A-записи на IPv4 VDS. Входящие 80/443 должны быть доступны. Примеры ниже используют структуру каталогов Debian/Ubuntu с установленными Nginx и Certbot; фактический домен заменяет `example.ru`. Не заменяйте конфигурации других сайтов. Шаблоны входят в архив релиза, хостовый Nginx не перезагружается автоматически при CI-деплое.

В серверном `/opt/persons/shared/.env` задайте:

```dotenv
PUBLIC_PERSON_URL=https://example.ru
PUBLIC_ID_URL=https://id.example.ru
PUBLIC_ADMIN_URL=https://cms.example.ru
SESSION_COOKIE_DOMAIN=example.ru
```

Локально `SESSION_COOKIE_DOMAIN` остаётся пустым: cookie работает на `localhost` с разными портами. В production она имеет `Domain=example.ru`, `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`; выход и восстановление пароля удаляют cookie с тем же доменом. Общий домен должен содержать только доверенные приложения.

Сначала включите HTTP-конфигурацию без ссылок на ещё не выпущенные сертификаты. Команды выполняются из каталога подготовленного релиза/checkout infrastructure:

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
```

После успешного выпуска переключите сайт на HTTPS:

```sh
sh scripts/render-nginx.sh "$domain" https | sudo tee /etc/nginx/sites-available/persons.conf >/dev/null
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Включите штатный таймер обновления Certbot, если пакет ещё не сделал этого. HTTP сохраняет путь ACME и перенаправляет остальные запросы на HTTPS. Ограничения тела запроса: ID — 1 MiB, сайт/CMS — 545 MiB; прикладные ограничения файлов продолжают действовать (видео до 512 MiB, фотографии до 32 MiB). Буферизация загрузок и ответов отключена для потоковой передачи, тайм-аут сайта/CMS — 600 секунд. Продолжительность сессии и cookie контролирует приложение, Nginx их не переписывает.

Проверка: откройте основной домен, войдите через `id.`, вернитесь на сайт и откройте `cms.` администратором. В сессиях должны совпадать реальный IP клиента и HTTPS; после выхода общий доступ исчезает. Перезапуск frontend-контейнеров требует актуального `.env`, локальный gateway в production включать не нужно.

Автоматическая проверка: `sh scripts/tests/nginx.test.sh` (нужен Docker). Проверяется также, что подложенные клиентом forwarded-заголовки не доходят до приложения.

Источники: [Nginx proxy headers](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header), [Certbot webroot](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot).

## Регион в сессиях

Nginx может определять город и страну по локальной базе [DB-IP City Lite](https://db-ip.com/db/download/ip-to-city-lite). IP посетителей не передаются внешнему API. Геолокация приблизительная; VPN и мобильные сети могут показывать регион выхода в интернет.

Установите совместимый с вашим Nginx модуль GeoIP2 и `mmdb-bin`. В текущем production модуль уже загружен. Затем:

```sh
sudo sh scripts/update-geoip.sh
sudo install -m 644 docker/nginx/geoip.conf /etc/nginx/conf.d/persons-geoip.conf
sh scripts/render-nginx.sh "$domain" https geoip | sudo tee /etc/nginx/sites-available/persons.conf >/dev/null
sudo nginx -t && sudo systemctl reload nginx
```

Повторный запуск `update-geoip.sh` загружает базу текущего месяца и заменяет её только после проверки. Nginx перечитывает файл раз в час. Используйте свежую ежемесячную базу. Ссылка на DB-IP в списке сессий обеспечивает атрибуцию CC BY 4.0. Без параметра `geoip` шаблон очищает заголовок региона; локальный gateway также очищает его. Фронтенды передают регион ID только при `TRUST_PROXY=true`, ID принимает метаданные только от доверенного сервиса.
