#!/bin/bash

# === FlozMeet Deploy Script ===
# Запусти: chmod +x deploy.sh && ./deploy.sh

echo "🚀 Деплой FlozMeet..."

# Получаем внешний IP автоматически
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || hostname -I | awk '{print $1}')
echo "📍 Обнаружен IP: $SERVER_IP"

# 1. Установка зависимостей
echo "� Устанаовка зависимостей..."
npm install

# 2. Сборка
echo "🔨 Сборка проекта..."
npm run build
npm run build:server

# 3. Установка PM2 если нет
if ! command -v pm2 &> /dev/null; then
    echo "📥 Установка PM2..."
    sudo npm install -g pm2
fi

# 4. Остановка старых процессов
pm2 delete flozmeet-signal 2>/dev/null
pm2 delete flozmeet-web 2>/dev/null

# 5. Запуск
echo "▶️ Запуск сервисов..."
pm2 start npm --name "flozmeet-signal" -- run start:server
pm2 start npm --name "flozmeet-web" -- run start

# 6. Сохранение и автозапуск
pm2 save
pm2 startup

# 7. Настройка Nginx
echo "⚙️ Настройка Nginx..."
sed "s/YOUR_IP/$SERVER_IP/g" nginx.conf > /tmp/flozmeet-nginx.conf
sudo cp /tmp/flozmeet-nginx.conf /etc/nginx/sites-available/flozmeet
sudo ln -sf /etc/nginx/sites-available/flozmeet /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ Готово!"
echo "📍 FlozMeet доступен: http://$SERVER_IP"
echo ""
