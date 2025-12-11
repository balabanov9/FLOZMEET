# FlozMeet

Видеоконференции с WebRTC и Socket.io

## Локальная разработка

```bash
npm install
npm run dev
```

Приложение будет доступно на http://localhost:3000

## Деплой на Vercel

### 1. Деплой сигнального сервера (Railway/Render)

Сигнальный сервер (Socket.io) нужно развернуть отдельно, т.к. Vercel не поддерживает WebSocket.

#### Railway:
1. Создай новый проект на [railway.app](https://railway.app)
2. Подключи репозиторий
3. Настрой:
   - Build Command: `npm run build:server`
   - Start Command: `npm run start:server`
   - Root Directory: `flozmeet`
4. Добавь переменную `SIGNAL_PORT=3001`
5. После деплоя скопируй URL (например: `https://flozmeet-server.up.railway.app`)

#### Render:
1. Создай Web Service на [render.com](https://render.com)
2. Build Command: `npm install && npm run build:server`
3. Start Command: `npm run start:server`
4. Environment: `SIGNAL_PORT=3001`

### 2. Деплой фронтенда на Vercel

1. Импортируй проект на [vercel.com](https://vercel.com)
2. Root Directory: `flozmeet`
3. Добавь переменную окружения:
   ```
   NEXT_PUBLIC_SIGNAL_SERVER=https://your-signal-server-url.com
   ```
4. Deploy!

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_SIGNAL_SERVER` | URL сигнального сервера |
| `SIGNAL_PORT` | Порт сигнального сервера (по умолчанию 3001) |
