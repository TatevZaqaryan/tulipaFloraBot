require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const handlers = require('./handlers');
const { handleCallbackQuery, userStates } = require('./handlers');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const connectDB = require('../config/db');


// Connect to MongoDB
connectDB();
bot.onText(/\/start/, (msg) => handlers.handleStartCommand(bot, msg));
bot.onText(/\/help/, (msg) => handlers.handleHelpCommand(bot, msg));
bot.onText(/\/testnotify/, (msg) => handlers.handleTestNotifyCommand(bot, msg));
bot.onText(/\/send_receipt/, (msg) => handlers.handleSendReceiptCommand(bot, msg));
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const _texts = getLocalizedText(userId, userStates);

    bot.sendMessage(chatId, _texts.orderCancelled, { parse_mode: 'Markdown' });
    delete userStates[userId];
});
bot.on('callback_query', (callbackQuery) => handlers.handleCallbackQuery(bot, callbackQuery));
bot.on('message', (msg) => handlers.handleMessage(bot, msg));

bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
    // Restart polling after a delay
    setTimeout(() => {
        bot.stopPolling().then(() => bot.startPolling());
    }, 5000);
});

console.log('Bot started at', new Date().toLocaleString('en-US', { timeZone: 'Asia/Yerevan' }));// Սա փորձնական մեկնաբանություն է