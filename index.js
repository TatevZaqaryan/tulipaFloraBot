require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const categories = require('./data/flowers'); // Changed from 'bouquets' to 'categories'
const shopInfo = require('./data/shopInfo');
const moment = require('moment-timezone');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('Բոտը գործարկվեց...');

const userStates = {};

const STEPS = {
    WAITING_FOR_LANGUAGE: 'waiting_for_language',
    START: 'start',
    SHOW_CATEGORIES: 'show_categories', // Renamed from SHOW_BOUQUETS
    CATEGORY_SELECTED: 'category_selected', // Renamed from BOUQUET_SELECTED
    WAITING_FOR_DELIVERY_DATE: 'waiting_for_delivery_date',
    WAITING_FOR_DELIVERY_TIME: 'waiting_for_delivery_time',
    WAITING_FOR_ADDRESS: 'waiting_for_address',
    ORDER_CONFIRMED: 'order_confirmed'
};

const texts = {
    hy: {
        weekDays: ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'],
        welcome: (userName, shopName) => `*Բարև ձեզ, ${userName}!* 👋\nԲարի գալուստ *${shopName}*։\n\n🌸 Ծաղկի Կախարդական Աշխարհ 🌸\nՄենք առաջարկում ենք թարմ և նրբագեղ ծաղկեփնջեր ցանկացած առիթի համար։ Մեր ծաղիկները բերվում են լավագույն պլանտացիաներից և պատրաստվում են սիրով ու նվիրումով։\n\n*Ինչպե՞ս կարող եմ ձեզ օգնել այսօր:* 👇`,
        chooseLanguage: `*Խնդրում եմ, ընտրեք լեզուն։*\n*Please, choose a language.*`,
        mainMenuWelcome: `*Դուք վերադարձաք գլխավոր մենյու:* ✨\nԻնչպե՞ս կարող եմ ձեզ օգնել այսօր։`,
        orderBouquet: '💐 Պատվիրել Ծաղկեփունջ',
        aboutUs: 'ℹ️ Մեր Մասին',
        contactUs: '📞 Կապ Մեզ Հետ',
        chooseCategory: '*Ընտրեք ծաղկեփնջի կատեգորիան:* ⬇️', // New text
        categoryDetails: (name, description, priceMin, priceMax) => { // New text with price range
            let priceText = '';
            if (priceMin && priceMax) {
                priceText = `*Գինը:* ${priceMin} - ${priceMax} ֏`;
            } else if (priceMin) {
                priceText = `*Գինը:* ${priceMin} ֏-ից սկսած`;
            }
            return `*✨ ${name} ✨*\n\n_${description}_\n\n${priceText}\n\n*Հրաշալի ընտրություն է!* 🤩`;
        },
        imageNotAvailable: `_Նկարը հասանելի չէ։_`,
        orderThisCategory: '✅ Պատվիրել Այս Կատեգորիայից', // New text
        categoryNotFound: '❌ Ընտրված կատեգորիան չգտնվեց։ Խնդրում ենք նորից ընտրել։', // New text
        errorOccurred: '❌ Սխալ տեղի ունեցավ, խնդրում եմ, նորից սկսեք պատվերը։',
        chooseDeliveryDate: (categoryName) => `Դուք պատվիրում եք *"${categoryName}"* կատեգորիայից։\n\n🗓️ *Խնդրում եմ, ընտրեք առաքման ամսաթիվը:*`, // Updated text
        pastDateOrClosed: '⚠️ *Ցավոք, այս օրվա համար պատվերներն այլևս չեն ընդունվում կամ օրն արդեն անցել է։* Խնդրում ենք ընտրել մեկ այլ օր։',
        dateSelected: (formattedDate) => `*Դուք ընտրեցիք* _${formattedDate}_։\n⏰ *Խնդրում եմ, ընտրեք առաքման հարմար ժամը:*`,
        invalidDate: '❌ Սխալ ամսաթիվ։ Խնդրում եմ նորից ընտրել։',
        chooseDeliveryTime: `*Խնդրում եմ, ընտրեք առաքման հարմար ժամը:*`,
        pastTimeOrInvalid: '⚠️ *Ցավոք, այս ժամն արդեն անցել է կամ սխալ է։* Խնդրում եմ, ընտրեք մեկ այլ ժամ։',
        timeSelected: (formattedDate, time) => `*Դուք ընտրեցիք* _${formattedDate}_ *ժամը* _${time}_։\n\n*📍 Խնդրում եմ, մուտքագրեք առաքման հասցեն և ձեր կոնտակտային հեռախոսահամարը:* (Օրինակ՝ *Կոմիտասի 22, բն. 5, հեռ. 098123456*)`,
        deliveryAddressPrompt: `*📍 Խնդրում եմ, մուտքագրեք առաքման հասցեն և ձեր կոնտակտային հեռախոսահամարը:* (Օրինակ՝ *Կոմիտասի 22, բն. 5, հեռ. 098123456*)`,
        orderSummary: (categoryName, quantity, deliveryDate, deliveryTime, priceInfo, address) => // Updated parameters
            `*✨ Ձեր Պատվերի Ամփոփում ✨*\n` +
            `----------------------------------------\n` +
            `💐 *Կատեգորիա:* _${categoryName}_\n` + // Updated text
            `🔢 *Քանակ:* _${quantity} հատ_\n` +
            `🗓️ *Առաքման ամսաթիվ:* _${deliveryDate}_\n` +
            `⏰ *Առաքման ժամ:* _${deliveryTime}_\n` +
            `💰 *Գնային կատեգորիա:* _${priceInfo}_\n` + // Updated text
            `📍 *Առաքման հասցե և կոնտակտ:* _${address}_\n` +
            `----------------------------------------\n\n` +
            `*Խնդրում ենք ուշադիր ստուգել մուտքագրված տվյալները։* 👇`,
        confirmOrder: '✅ Այո, Հաստատել Պատվերը',
        cancelOrder: '❌ Ոչ, Չեղարկել / Սկսել Նորից',
        orderConfirmed: '*🎉 Շնորհակալություն Ձեր պատվերի համար! 🎉*\n\nՁեր պատվերը ընդունված է։ Մեր աշխատակիցը *շուտով կկապվի ձեզ հետ*՝ մանրամասները հաստատելու և առաքման ժամը ճշտելու համար։\n\n*Մաղթում ենք գեղեցիկ օր!* ✨',
        orderCancelled: '❌ *Պատվերը չեղարկվեց։* Դուք կարող եք սկսել նոր պատվեր՝ սեղմելով "💐 Պատվիրել Ծաղկեփունջ" կոճակը կամ ուղարկելով /start հրամանը։',
        aboutUsContent: (shopAddress, workingHours) =>
            `*🌸 Մեր Մասին 🌸*\n\n` +
            `Մենք առաջարկում ենք թարմ և նրբագեղ ծաղկեփնջեր ցանկացած առիթի համար։ Մեր ծաղիկները բերվում են լավագույն պլանտացիաներից և պատրաստվում են սիրով ու նվիրումով։\n\n` +
            `📍 *Մեր հասցեն:* ${shopAddress}\n` +
            `⏰ *Աշխատանքային ժամեր:* ${workingHours}\n\n` +
            `Մենք սիրով սպասում ենք ձեզ։`,
        followInstagram: '📸 Հետևել Instagram-ում',
        contactUsContent: (phone) => `*📞 Կապվեք Մեզ Հետ 📞*\n\nՀեռախոսահամար՝ *${phone}*\n\nՄենք պատրաստ ենք պատասխանել ձեր բոլոր հարցերին և օգնել ձեր պատվերների հետ կապված։`,
        callNow: '📞 Զանգահարել Հիմա',
        mainMenu: '🏠 Գլխավոր Մենյու',
        unknownCommand: '🤔 Հասկանալի չէ։ Խնդրում եմ, օգտագործեք առաջարկված հրամանները կամ սեղմեք կոճակները։ Եթի շփոթվել եք, ուղարկեք /start։',
        startOrderPrompt: 'Խնդրում եմ, սկսեք պատվերը /start հրամանով կամ սեղմեք "💐 Պատվիրել Ծաղկեփունջ" կոճակը։',
        noTimesForToday: '⚠️ Այսօրվա համար բոլոր ժամերն արդեն անցել են։',
        selectAnotherDate: '🔙 Ընտրել այլ ամսաթիվ',
        backToStartReload: 'Ողջույն! 👋\nՁեր նախորդ գործընթացը դադարեցվել է կամ բոտը վերագործարկվել է։ Խնդրում ենք նորից սկսել։'
    },
    en: {
        weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        welcome: (userName, shopName) => `*Hello, ${userName}!* 👋\nWelcome to *${shopName}*.\n\n🌸 Flower Magic World 🌸\nWe offer fresh and elegant bouquets for any occasion. Our flowers are sourced from the best plantations and prepared with love and dedication.\n\n*How can I help you today:* 👇`,
        chooseLanguage: `*Խնդրում եմ, ընտրեք լեզուն։*\n*Please, choose a language.*`,
        mainMenuWelcome: `*You are back to the main menu:* ✨\nHow can I help you today?`,
        orderBouquet: '💐 Order a Bouquet',
        aboutUs: 'ℹ️ About Us',
        contactUs: '📞 Contact Us',
        chooseCategory: '*Choose a bouquet category:* ⬇️',
        categoryDetails: (name, description, priceMin, priceMax) => {
            let priceText = '';
            if (priceMin && priceMax) {
                priceText = `*Price:* ${priceMin} - ${priceMax} ֏`;
            } else if (priceMin) {
                priceText = `*Price:* From ${priceMin} ֏`;
            }
            return `*✨ ${name} ✨*\n\n_${description}_\n\n${priceText}\n\n*Great choice!* 🤩`;
        },
        imageNotAvailable: `_Image not available._`,
        orderThisCategory: '✅ Order From This Category',
        categoryNotFound: '❌ Selected category not found. Please choose again.',
        errorOccurred: '❌ An error occurred, please restart the order.',
        chooseDeliveryDate: (categoryName) => `You are ordering from the *"${categoryName}"* category.\n\n🗓️ *Please, select a delivery date:*`,
        pastDateOrClosed: '⚠️ *Unfortunately, orders for this day are no longer accepted or the day has passed.* Please choose another day.',
        dateSelected: (formattedDate) => `*You selected* _${formattedDate}_.\n⏰ *Please, choose a convenient delivery time:*`,
        invalidDate: '❌ Invalid date. Please choose again.',
        chooseDeliveryTime: `*Please, choose a convenient delivery time:*`,
        pastTimeOrInvalid: '⚠️ *Unfortunately, this time slot has passed or is invalid.* Please choose another time.',
        timeSelected: (formattedDate, time) => `*You selected* _${formattedDate}_ *at* _${time}_.\n\n*📍 Please, enter the delivery address and your contact phone number:* (e.g., *Komitas 22, apt. 5, tel. 098123456*)`,
        deliveryAddressPrompt: `*📍 Please, enter the delivery address and your contact phone number:* (e.g., *Komitas 22, apt. 5, tel. 098123456*)`,
        orderSummary: (categoryName, quantity, deliveryDate, deliveryTime, priceInfo, address) =>
            `*✨ Your Order Summary ✨*\n` +
            `----------------------------------------\n` +
            `💐 *Category:* _${categoryName}_\n` +
            `🔢 *Quantity:* _${quantity} pcs_\n` +
            `🗓️ *Delivery Date:* _${deliveryDate}_\n` +
            `⏰ *Delivery Time:* _${deliveryTime}_\n` +
            `💰 *Price Category:* _${priceInfo}_\n` +
            `📍 *Delivery Address & Contact:* _${address}_\n` +
            `----------------------------------------\n\n` +
            `*Please carefully check the entered data.* 👇`,
        confirmOrder: '✅ Yes, Confirm Order',
        cancelOrder: '❌ No, Cancel / Start Over',
        orderConfirmed: '*🎉 Thank you for your order! 🎉*\n\nYour order has been accepted. Our employee *will contact you shortly* to confirm the details and arrange delivery time.\n\n*Have a beautiful day!* ✨',
        orderCancelled: '❌ *Order cancelled.* You can start a new order by clicking the "💐 Order a Bouquet" button or by sending the /start command.',
        aboutUsContent: (shopAddress, workingHours) =>
            `*🌸 About Us 🌸*\n\n` +
            `We offer fresh and elegant bouquets for any occasion. Our flowers are sourced from the best plantations and prepared with love and dedication.\n\n` +
            `📍 *Our Address:* ${shopAddress}\n` +
            `⏰ *Working Hours:* ${workingHours}\n\n` +
            `We look forward to seeing you.`,
        followInstagram: '📸 Follow on Instagram',
        contactUsContent: (phone) => `*📞 Contact Us 📞*\n\nPhone Number: *${phone}*\n\nWe are ready to answer all your questions and assist with your orders.`,
        callNow: '📞 Call Now',
        mainMenu: '🏠 Main Menu',
        unknownCommand: '🤔 Not understood. Please use the suggested commands or click the buttons. If you are confused, send /start.',
        startOrderPrompt: 'Please, start the order with the /start command or click the "💐 Order a Bouquet" button.',
        noTimesForToday: '⚠️ All time slots for today have already passed.',
        selectAnotherDate: '🔙 Select another date',
        backToStartReload: 'Hello! 👋\nYour previous process was stopped or the bot was restarted. Please start again.'
    },
    ru: {
        weekDays: ['Пон', 'Вто', 'Сре', 'Чет', 'Пят', 'Суб', 'Вос'],
        welcome: (userName, shopName) => `*Здравствуйте, ${userName}!* 👋\nДобро пожаловать в *${shopName}*.\n\n🌸 Волшебный Мир Цветов 🌸\nМы предлагаем свежие и элегантные букеты для любого случая. Наши цветы привозятся с лучших плантаций и готовятся с любовью и самоотверженностью.\n\n*Чем могу помочь сегодня:* 👇`,
        chooseLanguage: `*Խնդրում եմ, ընտրեք լեզուն։*\n*Please, choose a language.*`,
        mainMenuWelcome: `*Вы вернулись в главное меню:* ✨\nЧем могу помочь сегодня?`,
        orderBouquet: '💐 Заказать букет',
        aboutUs: 'ℹ️ О Нас',
        contactUs: '📞 Связаться с нами',
        chooseCategory: '*Выберите категорию букета:* ⬇️',
        categoryDetails: (name, description, priceMin, priceMax) => {
            let priceText = '';
            if (priceMin && priceMax) {
                priceText = `*Цена:* ${priceMin} - ${priceMax} ֏`;
            } else if (priceMin) {
                priceText = `*Цена:* От ${priceMin} ֏`;
            }
            return `*✨ ${name} ✨*\n\n_${description}_\n\n${priceText}\n\n*Отличный выбор!* 🤩`;
        },
        imageNotAvailable: `_Изображение недоступно._`,
        orderThisCategory: '✅ Заказать Из Этой Категории',
        categoryNotFound: '❌ Выбранная категория не найдена. Пожалуйста, выберите снова.',
        errorOccurred: '❌ Произошла ошибка, пожалуйста, начните заказ заново.',
        chooseDeliveryDate: (categoryName) => `Вы заказываете из категории *"${categoryName}"*.\n\n🗓️ *Пожалуйста, выберите дату доставки:*`,
        pastDateOrClosed: '⚠️ *К сожалению, заказы на этот день больше не принимаются или день уже прошел.* Пожалуйста, выберите другой день.',
        dateSelected: (formattedDate) => `*Вы выбрали* _${formattedDate}_.\n⏰ *Пожалуйста, выберите удобное время доставки:*`,
        invalidDate: '❌ Неверная дата. Пожалуйста, выберите снова.',
        chooseDeliveryTime: `*Пожалуйста, выберите удобное время доставки:*`,
        pastTimeOrInvalid: '⚠️ *К сожалению, этот временной интервал уже прошел или недействителен.* Пожалуйста, выберите другое время.',
        timeSelected: (formattedDate, time) => `*Вы выбрали* _${formattedDate}_ *в* _${time}_.\n\n*📍 Пожалуйста, введите адрес доставки и ваш контактный номер телефона:* (Например: *Комитаса 22, кв. 5, тел. 098123456*)`,
        deliveryAddressPrompt: `*📍 Пожалуйста, введите адрес доставки и ваш контактный номер телефона:* (Например: *Комитаса 22, кв. 5, тел. 098123456*)`,
        orderSummary: (categoryName, quantity, deliveryDate, deliveryTime, priceInfo, address) =>
            `*✨ Сводка Вашего Заказа ✨*\n` +
            `----------------------------------------\n` +
            `💐 *Категория:* _${categoryName}_\n` +
            `🔢 *Количество:* _${quantity} шт._\n` +
            `🗓️ *Дата доставки:* _${deliveryDate}_\n` +
            `⏰ *Время доставки:* _${deliveryTime}_\n` +
            `💰 *Ценовая Категория:* _${priceInfo}_\n` +
            `📍 *Адрес доставки и контакт:* _${address}_\n` +
            `----------------------------------------\n\n` +
            `*Пожалуйста, внимательно проверьте введенные данные.* 👇`,
        confirmOrder: '✅ Да, подтвердить заказ',
        cancelOrder: '❌ Нет, отменить / начать заново',
        orderConfirmed: '*🎉 Спасибо за Ваш заказ! 🎉*\n\nВаш заказ принят. Наш сотрудник *свяжется с вами в ближайшее время*, чтобы подтвердить детали и уточнить время доставки.\n\n*Желаем прекрасного дня!* ✨',
        orderCancelled: '❌ *Заказ отменен.* Вы можете начать новый заказ, нажав кнопку "💐 Заказать букет" или отправив команду /start.',
        aboutUsContent: (shopAddress, workingHours) =>
            `*🌸 О Нас 🌸*\n\n` +
            `Мы предлагаем свежие и элегантные букеты для любого случая. Наши цветы привозятся с лучших плантаций и готовятся с любовью и самоотверженностью.\n\n` +
            `📍 *Наш адрес:* ${shopAddress}\n` +
            `⏰ *Часы работы:* ${workingHours}\n\n` +
            `Мы ждем вас.`,
        followInstagram: '📸 Подписаться в Instagram',
        contactUsContent: (phone) => `*📞 Связаться с Нами 📞*\n\nНомер телефона: *${phone}*\n\nМы готовы ответить на все ваши вопросы и помочь с вашими заказами.`,
        callNow: '📞 Позвонить сейчас',
        mainMenu: '🏠 Главное меню',
        unknownCommand: '🤔 Непонятно. Пожалуйста, используйте предложенные команды или нажмите кнопки. Если вы запутались, отправьте /start.',
        startOrderPrompt: 'Пожалуйста, начните заказ с команды /start или нажмите кнопку "💐 Заказать букет".',
        noTimesForToday: '⚠️ Все временные интервалы на сегодня уже прошли.',
        selectAnotherDate: '🔙 Выбрать другую дату',
        backToStartReload: 'Здравствуйте! 👋\nВаш предыдущий процесс был остановлен или бот был перезапущен. Пожалуйста, начните заново.'
    }
};

// Գլխավոր մենյուի ստեղնաշարը (հիմնական bot commands-ի համար, այս դեպքում միայն /start)
const mainMenuReplyKeyboard = {
    keyboard: [
        [{ text: '/start' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

/**
 * Որոշում է տեքստի լեզուն օգտատիրոջ վիճակից։
 * @param {number} userId - Օգտատիրոջ ID-ն։
 * @returns {object} Տեքստերի օբյեկտը ընտրված լեզվի համար։
 */
function getLocalizedText(userId) {
    const lang = userStates[userId]?.language || 'hy'; // Լռությամբ՝ հայերեն
    return texts[lang];
}

/**
 * Ստանում է կատեգորիայի անունը ընտրված լեզվով։
 * @param {object} category - Կատեգորիայի օբյեկտը data/flowers.js-ից։
 * @param {string} lang - Ընտրված լեզվի կոդը (hy, en, ru)։
 * @returns {string} Կատեգորիայի անունը ընտրված լեզվով։
 */
function getCategoryName(category, lang) {
    return category.name[lang] || category.name['hy']; // Վերադարձնել հայերենը, եթե թարգմանություն չկա
}

/**
 * Ստանում է կատեգորիայի նկարագրությունը ընտրված լեզվով։
 * @param {object} category - Կատեգորիայի օբյեկտը data/flowers.js-ից։
 * @param {string} lang - Ընտրված լեզվի կոդը (hy, en, ru)։
 * @returns {string} Կատեգորիայի նկարագրությունը ընտրված լեզվով։
 */
function getCategoryDescription(category, lang) {
    return category.description[lang] || category.description['hy']; // Վերադարձնել հայերենը, եթե թարգմանություն չկա
}

/**
 * Ստեղծում է օրացույցի inline ստեղնաշար՝ որոշակի տարվա և ամսվա համար։
 * Օգտագործում է moment-timezone։
 * @param {number} year - Ցուցադրվող տարին։
 * @param {number} month - Ցուցադրվող ամիսը (0-ից 11)։
 * @param {number} userId - Օգտատիրոջ ID-ն։
 * @returns {object} Inline ստեղնաշարի օբյեկտ։
 */
function getCalendarKeyboard(year, month, userId) {
    const _texts = getLocalizedText(userId); // Լեզվական տեքստեր
    const today = moment().tz('Asia/Yerevan').startOf('day');
    const currentMonth = moment.tz([year, month], 'Asia/Yerevan');
    const daysInMonth = currentMonth.daysInMonth();
    const startDay = (currentMonth.startOf('month').day() + 6) % 7;

    const keyboard = [];
    const monthName = currentMonth.format('MMMM');
    keyboard.push([{ text: `🗓️ ${monthName}`, callback_data: 'ignore_month_year_display' }]);

    const weekDays = _texts.weekDays;
    keyboard.push(weekDays.map((d) => ({ text: d, callback_data: 'ignore_weekday' })));

    let row = new Array(startDay).fill({ text: ' ', callback_data: 'ignore_empty' });

    const [closingHourStr] = shopInfo.workingHours.split(' - ')[1].split(':');
    const closingHour = parseInt(closingHourStr);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = moment().tz('Asia/Yerevan').year(year).month(month).date(day).startOf('day'); // Ensure consistent timezone
        const dateStr = date.format('YYYY-MM-DD');

        if (date.isBefore(today) || (date.isSame(today) && moment().tz('Asia/Yerevan').hour() >= closingHour)) {
            row.push({ text: `🔒${day}`, callback_data: `ignore_date_${dateStr}` });
        } else if (date.isSame(today, 'day')) {
            row.push({ text: `📍${day}`, callback_data: `date_${dateStr}` });
        } else {
            row.push({ text: `${day}`, callback_data: `date_${dateStr}` });
        }

        if (row.length === 7) {
            keyboard.push(row);
            row = [];
        }
    }

    if (row.length > 0) {
        while (row.length < 7) row.push({ text: ' ', callback_data: 'ignore_empty' });
        keyboard.push(row);
    }

    const prev = moment([year, month]).subtract(1, 'month');
    const next = moment([year, month]).add(1, 'month');

    keyboard.push([
        { text: `⬅️`, callback_data: `month_${prev.year()}_${prev.month()}` },
        { text: `${currentMonth.format('MMMM')}`, callback_data: 'ignore_month_name_display' },
        { text: `➡️`, callback_data: `month_${next.year()}_${next.month()}` },
    ]);
    keyboard.push([{ text: _texts.mainMenu, callback_data: 'back_to_start' }]);

    return { inline_keyboard: keyboard };
}

/**
 * Ստեղծում է ժամերի ընտրության inline ստեղնաշար՝ օգտագործելով moment-timezone։
 * Անցած ժամերը անջատվում են։
 * @param {Date} selectedDateObj - Ընտրված ամսաթիվը (JavaScript Date օբյեկտ)։
 * @param {number} userId - Օգտատիրոջ ID-ն։
 * @returns {object} Inline ստեղնաշարի օբյեկտ։
 */
function getTimesKeyboard(selectedDateObj, userId) {
    const _texts = getLocalizedText(userId);
    console.log("DEBUG: getTimesKeyboard - Received selectedDateObj:", selectedDateObj);

    if (!selectedDateObj || !(selectedDateObj instanceof Date) || isNaN(selectedDateObj.getTime())) {
        console.error("ERROR: getTimesKeyboard - Invalid selectedDateObj received:", selectedDateObj);
        return { inline_keyboard: [[{ text: _texts.invalidDate, callback_data: 'select_date_back' }]] };
    }

    const now = moment().tz('Asia/Yerevan');
    const selectedDate = moment(selectedDateObj).tz('Asia/Yerevan').startOf('day');
    const dateString = selectedDate.format('YYYY-MM-DD');

    const buttons = [];
    let row = [];

    const [startHourStr] = shopInfo.workingHours.split(' - ')[0].split(':');
    const [endHourStr] = shopInfo.workingHours.split(' - ')[1].split(':');
    const startHour = parseInt(startHourStr);
    const endHour = parseInt(endHourStr);

    console.log(`DEBUG: getTimesKeyboard - Shop working hours (parsed): ${startHour}:00 - ${endHour}:00`);
    console.log(`DEBUG: getTimesKeyboard - Current time (Yerevan): ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`DEBUG: getTimesKeyboard - Selected date (start of day): ${selectedDate.format('YYYY-MM-DD HH:mm:ss')}`);

    const interval = 1;

    let hasValidTimeSlots = false;

    for (let hour = startHour; hour < endHour; hour += interval) {
        const timeSlot = selectedDate.clone().hour(hour).minute(0).second(0).millisecond(0);

        const isPastOrCurrentHour = selectedDate.isSame(now, 'day') && timeSlot.isSameOrBefore(now);

        console.log(`DEBUG: getTimesKeyboard - Processing hour: ${hour}:00. TimeSlot: ${timeSlot.format('YYYY-MM-DD HH:mm')}. Is past/current: ${isPastOrCurrentHour}`);

        if (!isPastOrCurrentHour) {
            hasValidTimeSlots = true;
            row.push({
                text: `🕒 ${String(hour).padStart(2, '0')}:00`,
                callback_data: `time_${dateString}_${String(hour).padStart(2, '0')}:00`,
            });

            if (row.length === 3) {
                buttons.push(row);
                row = [];
            }
        } else {
            row.push({
                text: `🔒 ${String(hour).padStart(2, '0')}:00`,
                callback_data: 'ignore_time_slot',
            });
            if (row.length === 3) {
                buttons.push(row);
                row = [];
            }
        }
    }

    if (row.length > 0) buttons.push(row);

    if (!hasValidTimeSlots && selectedDate.isSame(now, 'day')) {
        console.log("DEBUG: getTimesKeyboard - No valid time slots found for today.");
        buttons.push([{ text: _texts.noTimesForToday, callback_data: 'ignore_no_times' }]);
    }

    buttons.push([{ text: _texts.selectAnotherDate, callback_data: 'select_date_back' }]);

    return { inline_keyboard: buttons };
}


// /start հրամանի մշակում
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    userStates[userId] = { step: STEPS.WAITING_FOR_LANGUAGE };

    const languageKeyboard = {
        inline_keyboard: [
            [{ text: '🇦🇲 Հայերեն', callback_data: 'lang_hy' }],
            [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
            [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
        ]
    };

    bot.sendMessage(chatId, texts.hy.chooseLanguage, {
        parse_mode: 'Markdown',
        reply_markup: languageKeyboard
    });
});

// /help հրամանի մշակում
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const _texts = getLocalizedText(userId);
    bot.sendMessage(chatId, _texts.unknownCommand, { parse_mode: 'Markdown' });
});

// Callback query-ների մշակում (inline կոճակների սեղմումներ)
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;

    bot.answerCallbackQuery(callbackQuery.id);

    // Լեզվի ընտրության մշակում
    if (data.startsWith('lang_')) {
        const lang = data.split('_')[1];
        userStates[userId] = userStates[userId] || {};
        userStates[userId].language = lang;
        userStates[userId].step = STEPS.START;

        const _texts = getLocalizedText(userId);

        const userName = callbackQuery.from.first_name || callbackQuery.from.username;
        const inlineMenuKeyboard = {
            inline_keyboard: [
                [{ text: _texts.orderBouquet, callback_data: 'show_categories' }], // Changed callback data
                [{ text: _texts.aboutUs, callback_data: 'about_us' }],
                [{ text: _texts.contactUs, callback_data: 'contact_us' }]
            ]
        };

        bot.sendMessage(chatId,
            _texts.welcome(userName, shopInfo.name),
            {
                parse_mode: 'Markdown',
                reply_markup: inlineMenuKeyboard
            }
        );
        return;
    }


    // Եթե օգտատիրոջ վիճակը գոյություն չունի կամ բոտը վերագործարկվել է
    if (!userStates[userId] || (userStates[userId].step === STEPS.WAITING_FOR_LANGUAGE && !data.startsWith('lang_'))) {
        userStates[userId] = { step: STEPS.WAITING_FOR_LANGUAGE };
        const languageKeyboard = {
            inline_keyboard: [
                [{ text: '🇦🇲 Հայերեն', callback_data: 'lang_hy' }],
                [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
                [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
            ]
        };
        bot.sendMessage(chatId, texts.hy.chooseLanguage, {
            parse_mode: 'Markdown',
            reply_markup: languageKeyboard
        });
        return;
    }

    const _texts = getLocalizedText(userId);
    const currentLang = userStates[userId].language;

    if (data === 'show_categories') { // Changed from show_bouquets
        const inlineKeyboard = {
            inline_keyboard: categories.map(category => ([ // Changed from bouquets to categories
                {
                    text: `✨ ${getCategoryName(category, currentLang)}`, // Use translated name
                    callback_data: `select_category_${category.id}` // Changed callback data
                }
            ]))
        };

        bot.sendMessage(chatId, _texts.chooseCategory, { // Changed text
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
        });
        userStates[userId].step = STEPS.SHOW_CATEGORIES; // Changed step name

    } else if (data === 'about_us') {
        bot.sendMessage(chatId,
            _texts.aboutUsContent(shopInfo.address, shopInfo.workingHours),
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: _texts.followInstagram, url: shopInfo.instagram }],
                        [{ text: _texts.mainMenu, callback_data: 'back_to_start' }]
                    ]
                }
            }
        );
    } else if (data === 'contact_us') {
        bot.sendMessage(chatId,
            _texts.contactUsContent(shopInfo.phone),
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: _texts.callNow, url: `tel:${shopInfo.phone}` }],
                        [{ text: _texts.mainMenu, callback_data: 'back_to_start' }]
                    ]
                }
            }
        );
    } else if (data === 'back_to_start') {
        const inlineMenuKeyboard = {
            inline_keyboard: [
                [{ text: _texts.orderBouquet, callback_data: 'show_categories' }], // Changed callback data
                [{ text: _texts.aboutUs, callback_data: 'about_us' }],
                [{ text: _texts.contactUs, callback_data: 'contact_us' }]
            ]
        };
        bot.sendMessage(chatId, _texts.mainMenuWelcome, {
            parse_mode: 'Markdown',
            reply_markup: inlineMenuKeyboard
        });
        userStates[userId].step = STEPS.START;

    } else if (data.startsWith('select_category_')) { // Changed from select_bouquet_
        const categoryId = data.replace('select_category_', '');
        const selectedCategory = categories.find(c => c.id === categoryId); // Changed from bouquets.find to categories.find

        if (selectedCategory) {
            const translatedCategoryName = getCategoryName(selectedCategory, currentLang);
            const translatedCategoryDescription = getCategoryDescription(selectedCategory, currentLang);
            const priceMin = selectedCategory.priceRange.min;
            const priceMax = selectedCategory.priceRange.max;

            try {
                await bot.sendPhoto(chatId, selectedCategory.imagePath, {
                    caption: _texts.categoryDetails(translatedCategoryName, translatedCategoryDescription, priceMin, priceMax), // New categoryDetails text
                    parse_mode: 'Markdown',
                    contentType: 'image/jpeg',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: _texts.orderThisCategory, callback_data: `confirm_category_order_${categoryId}` }] // Changed callback data
                        ]
                    }
                });
            } catch (error) {
                console.error("Error sending photo:", error.message);
                bot.sendMessage(chatId,
                    _texts.categoryDetails(translatedCategoryName, translatedCategoryDescription, priceMin, priceMax) + `\n\n` + _texts.imageNotAvailable,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: _texts.orderThisCategory, callback_data: `confirm_category_order_${categoryId}` }]
                            ]
                        }
                    }
                );
            }

            // Store the category with its localized name and priceRange for later use
            userStates[userId].selectedCategory = {
                ...selectedCategory,
                name: translatedCategoryName // Store the already translated name
            };
            userStates[userId].step = STEPS.CATEGORY_SELECTED; // Changed step name

        } else {
            bot.sendMessage(chatId, _texts.categoryNotFound); // Changed text
        }
    } else if (data.startsWith('confirm_category_order_')) { // Changed from confirm_order_
        const categoryId = data.replace('confirm_category_order_', '');
        const selectedCategory = categories.find(c => c.id === categoryId);

        if (selectedCategory && userStates[userId] && userStates[userId].selectedCategory && userStates[userId].selectedCategory.id === categoryId) {
            const translatedCategoryName = getCategoryName(selectedCategory, currentLang);
            userStates[userId].selectedCategory = {
                ...selectedCategory,
                name: translatedCategoryName
            };
            userStates[userId].quantity = 1; // Default quantity remains 1 for now

            userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_DATE;
            const now = moment().tz('Asia/Yerevan');
            bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
                parse_mode: 'Markdown',
                reply_markup: getCalendarKeyboard(now.year(), now.month(), userId)
            });

        } else {
            bot.sendMessage(chatId, _texts.errorOccurred);
            userStates[userId].step = STEPS.START;
        }

    } else if (data === 'final_confirm_order' && userStates[userId] && userStates[userId].step === STEPS.ORDER_CONFIRMED) {
        const finalOrder = userStates[userId];
        console.log('ՆՈՐ ՊԱՏՎԵՐ:', finalOrder);

        // Here you would typically send the order details to your backend/admin channel
        // For now, it just confirms to the user

        bot.sendMessage(chatId, _texts.orderConfirmed, { parse_mode: 'Markdown' });
        delete userStates[userId];

    } else if (data === 'cancel_order') {
        bot.sendMessage(chatId, _texts.orderCancelled, { parse_mode: 'Markdown' });
        delete userStates[userId];
    } else if (data.startsWith('month_')) {
        const parts = data.split('_');
        const year = parseInt(parts[1]);
        const month = parseInt(parts[2]);

        bot.editMessageReplyMarkup(getCalendarKeyboard(year, month, userId), {
            chat_id: chatId,
            message_id: message.message_id
        });
    } else if (data.startsWith('date_')) {
        let selectedDateMoment;
        try {
            const dateString = data.split('_')[1];
            selectedDateMoment = moment.tz(dateString, 'YYYY-MM-DD', 'Asia/Yerevan');

            if (!selectedDateMoment.isValid()) {
                throw new Error("Invalid Moment Date created from callback data.");
            }

            console.log(`DEBUG: date_ callback - Ընտրված օրը (raw): ${dateString}`);
            console.log("DEBUG: date_ callback - selectedDateMoment օբյեկտը:", selectedDateMoment.format());

        } catch (error) {
            console.error("ERROR: Failed to parse date from callback data:", data, error.message);
            bot.sendMessage(chatId, _texts.invalidDate, { parse_mode: 'Markdown' });
            const nowForCalendar = moment().tz('Asia/Yerevan');
            // Ensure category name is translated here too
            const translatedCategoryName = userStates[userId].selectedCategory ? getCategoryName(categories.find(c => c.id === userStates[userId].selectedCategory.id), currentLang) : "";
            bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
                parse_mode: 'Markdown',
                reply_markup: getCalendarKeyboard(nowForCalendar.year(), nowForCalendar.month(), userId)
            });
            return;
        }

        const now = moment().tz('Asia/Yerevan');

        const [closingHourStr] = shopInfo.workingHours.split(' - ')[1].split(':');
        const closingHour = parseInt(closingHourStr);

        if (selectedDateMoment.isBefore(now, 'day') || (selectedDateMoment.isSame(now, 'day') && now.hour() >= closingHour)) {
            bot.sendMessage(chatId, _texts.pastDateOrClosed, { parse_mode: 'Markdown' });
            const nowForCalendar = moment().tz('Asia/Yerevan');
            const translatedCategoryName = userStates[userId].selectedCategory ? getCategoryName(categories.find(c => c.id === userStates[userId].selectedCategory.id), currentLang) : "";
            bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
                parse_mode: 'Markdown',
                reply_markup: getCalendarKeyboard(nowForCalendar.year(), nowForCalendar.month(), userId)
            });
            return;
        }

        userStates[userId].deliveryDate = selectedDateMoment.toDate();
        userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_TIME;

        console.log("DEBUG: date_ callback - userStates[userId].deliveryDate (after assignment, Date object):", userStates[userId].deliveryDate);

        const formattedDate = selectedDateMoment.format('DD.MM.YYYY');

        bot.sendMessage(chatId, _texts.dateSelected(formattedDate), {
            parse_mode: 'Markdown',
            reply_markup: getTimesKeyboard(userStates[userId].deliveryDate, userId)
        });
    } else if (data.startsWith('time_')) {
        const parts = data.split('_');
        const dateString = parts[1];
        const time = parts[2];

        const selectedDateTime = moment.tz(`${dateString} ${time}`, 'YYYY-MM-DD HH:mm', 'Asia/Yerevan');
        const now = moment().tz('Asia/Yerevan');

        if (!selectedDateTime.isValid() || selectedDateTime.isSameOrBefore(now)) {
            bot.sendMessage(chatId, _texts.pastTimeOrInvalid, { parse_mode: 'Markdown' });
            bot.sendMessage(chatId, _texts.chooseDeliveryTime, {
                parse_mode: 'Markdown',
                reply_markup: getTimesKeyboard(userStates[userId].deliveryDate, userId)
            });
            return;
        }

        userStates[userId].deliveryTime = time;
        userStates[userId].step = STEPS.WAITING_FOR_ADDRESS;

        const deliveryDateMoment = moment(userStates[userId].deliveryDate).tz('Asia/Yerevan');
        const deliveryDateFormatted = deliveryDateMoment.format('DD.MM.YYYY');

        bot.sendMessage(chatId, _texts.timeSelected(deliveryDateFormatted, time), { parse_mode: 'Markdown' });
    } else if (data === 'select_date_back') {
        const nowForCalendar = moment().tz('Asia/Yerevan');
        // Ensure category name is translated here too
        const translatedCategoryName = userStates[userId].selectedCategory ? getCategoryName(categories.find(c => c.id === userStates[userId].selectedCategory.id), currentLang) : "";
        bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
            parse_mode: 'Markdown',
            reply_markup: getCalendarKeyboard(nowForCalendar.year(), nowForCalendar.month(), userId)
        });
        userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_DATE;
    }
});

// Հաղորդագրությունների մշակում (հատկապես հասցեի համար)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text.startsWith('/')) {
        return;
    }

    // Եթե օգտատիրոջ վիճակը գոյություն չունի կամ լեզուն դեռ ընտրված չէ
    if (!userStates[userId] || userStates[userId].step === STEPS.WAITING_FOR_LANGUAGE) {
        const languageKeyboard = {
            inline_keyboard: [
                [{ text: '🇦🇲 Հայերեն', callback_data: 'lang_hy' }],
                [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
                [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
            ]
        };
        bot.sendMessage(chatId, texts.hy.chooseLanguage, {
            parse_mode: 'Markdown',
            reply_markup: languageKeyboard
        });
        return;
    }

    const _texts = getLocalizedText(userId);

    switch (userStates[userId].step) {
        case STEPS.WAITING_FOR_ADDRESS: {
            userStates[userId].address = text;
            userStates[userId].step = STEPS.ORDER_CONFIRMED;

            const category = userStates[userId].selectedCategory; // This now holds the translated name and priceRange
            const quantity = userStates[userId].quantity;
            const address = userStates[userId].address;

            const deliveryDateMoment = userStates[userId].deliveryDate && !isNaN(userStates[userId].deliveryDate.getTime())
                                 ? moment(userStates[userId].deliveryDate).tz('Asia/Yerevan')
                                 : null;
            const deliveryDate = deliveryDateMoment ? deliveryDateMoment.format('DD.MM.YYYY') : _texts.invalidDate;

            const deliveryTime = userStates[userId].deliveryTime;

            let priceInfo = '';
            if (category.priceRange.min && category.priceRange.max) {
                priceInfo = `${category.priceRange.min} - ${category.priceRange.max} ֏`;
            } else if (category.priceRange.min) {
                priceInfo = `Starting from ${category.priceRange.min} ֏`;
                if (currentLang === 'hy') priceInfo = `${category.priceRange.min} ֏-ից սկսած`;
                else if (currentLang === 'ru') priceInfo = `От ${category.priceRange.min} ֏`;
            }

            const orderSummary = _texts.orderSummary(category.name, quantity, deliveryDate, deliveryTime, priceInfo, address);

            bot.sendMessage(chatId, orderSummary, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: _texts.confirmOrder, callback_data: 'final_confirm_order' }],
                        [{ text: _texts.cancelOrder, callback_data: 'cancel_order' }]
                    ]
                }
            });
            break;
        }

        default:
            bot.sendMessage(chatId, _texts.unknownCommand, { parse_mode: 'Markdown' });
            break;
    }
});

// Սխալների մշակում Polling-ի ընթացքում
bot.on('polling_error', (error) => {
    console.error(`Polling error: ${error.code} - ${error.message}`);
});

console.log('Բոտը պատրաստ է ստանալ հաղորդագրություններ։');