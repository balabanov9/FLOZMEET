#!/bin/bash

# === FlozMeet Deploy Script ===
# Запусти: chmod +x deploy.sh && ./deploy.sh

set -e

SERVER_IP="64.188.83.189"
echo "🚀 Деплой FlozMeet..."
echo "📍 IP сервера: $SERVER_IP"

# 1. Установка Node.js и Nginx
echo "📥 Установка Node.js и Nginx..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v nginx &> /dev/null; then
    sudo apt update
    sudo apt install -y nginx
fi

echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# 2. Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

# 3. Сборка
echo "🔨 Сборка проекта..."
npm run build
npm run build:server

# 4. Установка PM2
echo "📥 Установка PM2..."
sudo npm install -g pm2

# 5. Остановка старых процессов
pm2 delete flozmeet-signal 2>/dev/null || true
pm2 delete flozmeet-web 2>/dev/null || true

# 6. Запуск
echo "▶️ Запуск сервисов..."
pm2 start npm --name "flozmeet-signal" -- run start:server
pm2 start npm --name "flozmeet-web" -- run start

# 7. Автозапуск
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# 8. Настройка Nginx
echo "⚙️ Настройка Nginx..."
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

cat << EOF | sudo tee /etc/nginx/sites-available/flozmeet
server {
    listen 80;
    server_name $SERVER_IP;

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

# 9. Открыть порты
echo "🔓 Настройка файрвола..."
sudo ufw allow 80 2>/dev/null || true
sudo ufw allow 443 2>/dev/null || true

echo ""
echo "✅ Готово!"
echo "📍 FlozMeet доступен: http://$SERVER_IP"
