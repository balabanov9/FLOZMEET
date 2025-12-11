#!/bin/bash

# === FlozMeet Deploy Script ===
# Запусти: chmod +x deploy.sh && ./deploy.sh YOUR_DOMAIN
# Пример: ./deploy.sh flozmeet.duckdns.org

set -e

if [ -z "$1" ]; then
    echo "❌ Укажи домен!"
    echo "Использование: ./deploy.sh your-domain.duckdns.org"
    echo ""
    echo "Сначала:"
    echo "1. Зарегистрируйся на https://www.duckdns.org"
    echo "2. Создай субдомен (например: flozmeet)"
    echo "3. Укажи IP сервера: 64.188.83.189"
    echo "4. Запусти: ./deploy.sh flozmeet.duckdns.org"
    exit 1
fi

DOMAIN=$1
echo "🚀 Деплой FlozMeet..."
echo "📍 Домен: $DOMAIN"

# 1. Установка Node.js, Nginx, Certbot
echo "📥 Установка зависимостей..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v nginx &> /dev/null; then
    sudo apt update
    sudo apt install -y nginx
fi

if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# 2. Установка зависимостей проекта
echo "📦 Установка npm пакетов..."
npm install

# 3. Сборка
echo "🔨 Сборка проекта..."
npm run build
npm run build:server

# 4. PM2
echo "📥 Установка PM2..."
sudo npm install -g pm2

pm2 delete flozmeet-signal 2>/dev/null || true
pm2 delete flozmeet-web 2>/dev/null || true

echo "▶️ Запуск сервисов..."
pm2 start npm --name "flozmeet-signal" -- run start:server
pm2 start npm --name "flozmeet-web" -- run start

pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

# 5. Nginx конфиг (сначала HTTP для certbot)
echo "⚙️ Настройка Nginx..."
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

cat << EOF | sudo tee /etc/nginx/sites-available/flozmeet
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/flozmeet /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 6. SSL сертификат
echo "🔒 Получение SSL сертификата..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "⚠️ Certbot не смог получить сертификат автоматически."
    echo "Попробуй вручную: sudo certbot --nginx -d $DOMAIN"
}

# 7. Файрвол
echo "🔓 Настройка файрвола..."
sudo ufw allow 80 2>/dev/null || true
sudo ufw allow 443 2>/dev/null || true

echo ""
echo "✅ Готово!"
echo "📍 FlozMeet доступен: https://$DOMAIN"
echo ""
echo "Камера и микрофон теперь будут работать!"
