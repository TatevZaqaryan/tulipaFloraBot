# Telegram Order Flowers Bot

Простой Telegram-бот для бронирования, использующий Node.js, MongoDB и Docker.

## 📦 Стек технологий

- Node.js
- MongoDB
- Mongoose
- Docker + Docker Compose
- dotenv
- node-telegram-bot-api

## 🚀 Быстрый старт

### 1. Клонируйте репозиторий

```bash
    git clone https://github.com/TatevZaqaryan/tulipaFloraBot.git
    cd tulipaFloraBot
```

## 2. Создайте .env файл

### Создайте файл .env в корне проекта:

```bash
    MONGO_URI=mongodb://root:example@mongo:27017/order?authSource=admin
    BOT_TOKEN=ваш_токен
    ADMIN_USER_ID=123456789
```

## 3. Запуск через Docker Compose

```bash
  docker-compose up --build
```
Бот автоматически подключится к MongoDB и начнёт работу

## 🧠 Подключение к MongoDB

### В файле index.js происходит подключение к MongoDB через переменную окружения MONGO_URI.

```js
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

```

## 🔄 Перезапуск

При изменении кода можно использовать:

```bash
  docker-compose down
  docker-compose up --build
```
or if need to clear old data
```bash
    docker-compose down -v
    docker volume rm booking_mongo-data
    docker-compose up --build
```

## 🧼 Остановка и очистка

```bash
    docker-compose down -v
```

## Structure
```
booking/
├── config/
│   └── db.js                       # MongoDB connection setup
├── models/
│   └── Order.js                    # Mongoose Order model
├── images/
│   ├── some-images.jpg             # images
│   └── some-other-images.jpg
├── data/
│   ├── flowers.js           
│   ├── shopInfo.js          
│   └── userStates.json
├── src/
│   ├── index.js                    # Main entry point to initialize the bot
│   ├── constants.js
│   ├── handlers.js 
│   ├── keyboard.js 
│   ├── utils.js          
│   └── .env                        #  for environment variables
├── package.json            
├── Dockerfile              
└── docker-compose.yaml     
```

## 📚 Лицензия

#### MIT