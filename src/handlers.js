const moment = require('moment-timezone');
const categories = require('../data/flowers');
const shopInfo = require('../data/shopInfo');
const { STEPS, texts } = require('./constants');
const { getLocalizedText, getCategoryName, getCategoryDescription } = require('./utils');
const { mainMenuReplyKeyboard, getCalendarKeyboard, getTimesKeyboard } = require('./keyboards');

const userStates = {};

// Admin configuration
const ADMIN_CHAT_ID = '1503741641'; // Admin's Telegram chat ID
const ADMIN_LANGUAGE = 'hy'; // Default to Armenian; can be 'ru' or 'en'

function handleStartCommand(bot, msg) {
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
        reply_markup: {
            ...languageKeyboard,
            keyboard: mainMenuReplyKeyboard.keyboard, // Ավելացնել reply ստեղնաշար
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
}

function handleHelpCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const _texts = getLocalizedText(userId, userStates);
    bot.sendMessage(chatId, _texts.unknownCommand, { parse_mode: 'Markdown' });
}

async function handleCallbackQuery(bot, callbackQuery) {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;

    bot.answerCallbackQuery(callbackQuery.id);

    if (data.startsWith('lang_')) {
        const lang = data.split('_')[1];
        userStates[userId] = userStates[userId] || {};
        userStates[userId].language = lang;
        userStates[userId].step = STEPS.START;
        console.log(`DEBUG: Language set for userId=${userId} to ${lang}, userStates=${JSON.stringify(userStates)}`);

        const _texts = getLocalizedText(userId, userStates);
        const userName = callbackQuery.from.first_name || callbackQuery.from.username;
        const inlineMenuKeyboard = {
            inline_keyboard: [
                [{ text: _texts.orderBouquet, callback_data: 'show_categories' }],
                [{ text: _texts.aboutUs, callback_data: 'about_us' }],
                [{ text: _texts.contactUs, callback_data: 'contact_us' }],
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

    if (!userStates[userId] || userStates[userId].step === STEPS.WAITING_FOR_LANGUAGE) {
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

    const _texts = getLocalizedText(userId, userStates);
    const currentLang = userStates[userId].language;

    if (data === 'show_categories') {
        const inlineKeyboard = {
            inline_keyboard: categories.map(category => ([{
                text: `✨ ${getCategoryName(category, currentLang)}`,
                callback_data: `select_category_${category.id}`
            }]))
        };

        bot.sendMessage(chatId, _texts.chooseCategory, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
        });
        userStates[userId].step = STEPS.SHOW_CATEGORIES;

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
        const sanitizedPhone = shopInfo.phone ? shopInfo.phone.replace(/[^+\d]/g, '') : '';
        console.log('shopInfo.phone:', shopInfo.phone, 'sanitizedPhone:', sanitizedPhone);

        const phoneRegex = /^\+\d{10,15}$/;
        let inlineKeyboard = [
            [{ text: _texts.mainMenu, callback_data: 'back_to_start' }]
        ];

        if (sanitizedPhone && phoneRegex.test(sanitizedPhone)) {
            try {
                inlineKeyboard.unshift([{ text: _texts.callNow, url: `tel:${sanitizedPhone}` }]);
                await bot.sendMessage(chatId,
                    _texts.contactUsContent(sanitizedPhone),
                    {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: inlineKeyboard }
                    }
                );
            } catch (error) {
                console.error('Error sending contact_us message:', error.message);
                inlineKeyboard = [
                    [{ text: _texts.mainMenu, callback_data: 'back_to_start' }]
                ];
                await bot.sendMessage(chatId,
                    _texts.contactUsContent(sanitizedPhone) ,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: inlineKeyboard }
                    }
                );
            }
        } else {
            console.error('Invalid phone number format:', sanitizedPhone);
            await bot.sendMessage(chatId,
                _texts.contactUsContent(sanitizedPhone || shopInfo.phone) + `\n\n${_texts.errorOccurred}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: inlineKeyboard }
                }
            );
        }
    } else if (data === 'back_to_start') {
        const inlineMenuKeyboard = {
            inline_keyboard: [
                [{ text: _texts.orderBouquet, callback_data: 'show_categories' }],
                [{ text: _texts.aboutUs, callback_data: 'about_us' }],
                [{ text: _texts.contactUs, callback_data: 'contact_us' }]
            ]
        };
        bot.sendMessage(chatId, _texts.mainMenuWelcome, {
            parse_mode: 'Markdown',
            reply_markup: inlineMenuKeyboard
        });
        userStates[userId].step = STEPS.START;

    } else if (data.startsWith('select_category_')) {
        const categoryId = data.replace('select_category_', '');
        const selectedCategory = categories.find(c => c.id === categoryId);

        if (selectedCategory) {
            const translatedCategoryName = getCategoryName(selectedCategory, currentLang);
            const translatedCategoryDescription = getCategoryDescription(selectedCategory, currentLang);
            const priceMin = selectedCategory.priceRange.min;
            const priceMax = selectedCategory.priceRange.max;

            try {
                await bot.sendPhoto(chatId, selectedCategory.imagePath, {
                    caption: _texts.categoryDetails(translatedCategoryName, translatedCategoryDescription, priceMin, priceMax),
                    parse_mode: 'Markdown',
                    contentType: 'image/jpeg',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: _texts.orderThisCategory, callback_data: `confirm_category_order_${categoryId}` }]
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

            userStates[userId].selectedCategory = {
                ...selectedCategory,
                name: translatedCategoryName
            };
            userStates[userId].step = STEPS.CATEGORY_SELECTED;

        } else {
            bot.sendMessage(chatId, _texts.categoryNotFound);
        }

    } else if (data.startsWith('confirm_category_order_')) {
        const categoryId = data.replace('confirm_category_order_', '');
        const selectedCategory = categories.find(c => c.id === categoryId);

        if (selectedCategory && userStates[userId] && userStates[userId].selectedCategory && userStates[userId].selectedCategory.id === categoryId) {
            const translatedCategoryName = getCategoryName(selectedCategory, currentLang);
            userStates[userId].selectedCategory = {
                ...selectedCategory,
                name: translatedCategoryName
            };
            userStates[userId].quantity = 1;
            userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_DATE;
            const now = moment().tz('Asia/Yerevan');
            bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
                parse_mode: 'Markdown',
                reply_markup: getCalendarKeyboard(now.year(), now.month(), userId, userStates)
            });

        } else {
            bot.sendMessage(chatId, _texts.errorOccurred);
            userStates[userId].step = STEPS.START;
        }

    } else if (data === 'include_card') {
        userStates[userId].step = STEPS.WAITING_FOR_CARD_MESSAGE;
        bot.sendMessage(chatId, _texts.cardMessagePrompt, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: _texts.selectTimeBack, callback_data: 'select_time_back' }]
                ]
            }
        });

    } else if (data === 'skip_card') {
        userStates[userId].cardMessage = null; // Explicitly set to null to indicate no card
        userStates[userId].step = STEPS.WAITING_FOR_ADDRESS;
        bot.sendMessage(chatId, _texts.addressExample, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: _texts.selectTimeBack, callback_data: 'select_time_back' }]
                ]
            }
        });

    } else if (data === 'final_confirm_order' && userStates[userId] && userStates[userId].step === STEPS.ORDER_CONFIRMED) {
        const finalOrder = userStates[userId];
        const deliveryDateMoment = finalOrder.deliveryDate && !isNaN(finalOrder.deliveryDate.getTime())
            ? moment(finalOrder.deliveryDate).tz('Asia/Yerevan')
            : null;
        const deliveryDate = deliveryDateMoment ? deliveryDateMoment.format('DD.MM.YYYY') : _texts.invalidDate;
        let priceInfo = '';
        if (finalOrder.selectedCategory.priceRange.min && finalOrder.selectedCategory.priceRange.max) {
            priceInfo = `${finalOrder.selectedCategory.priceRange.min} - ${finalOrder.selectedCategory.priceRange.max} ֏`;
        } else if (finalOrder.selectedCategory.priceRange.min) {
            priceInfo = ADMIN_LANGUAGE === 'hy' ? `${finalOrder.selectedCategory.priceRange.min} ֏-ից սկսած` :
                        ADMIN_LANGUAGE === 'ru' ? `От ${finalOrder.selectedCategory.priceRange.min} ֏` :
                        `Starting from ${finalOrder.selectedCategory.priceRange.min} ֏`;
        }

        const adminOrderSummary = texts[ADMIN_LANGUAGE].adminOrderSummary(
            finalOrder.selectedCategory.name,
            finalOrder.quantity,
            deliveryDate,
            finalOrder.deliveryTime,
            priceInfo,
            finalOrder.address,
            finalOrder.phone,
            finalOrder.cardMessage
        );

        try {
            await bot.sendMessage(ADMIN_CHAT_ID, `\n${adminOrderSummary}`, { parse_mode: 'Markdown' });
            if (finalOrder.paymentScreenshot) {
                await bot.sendPhoto(ADMIN_CHAT_ID, finalOrder.paymentScreenshot, {
                    caption: texts[ADMIN_LANGUAGE].paymentScreenshotCaption,
                    parse_mode: 'Markdown'
                });
            }
        } catch (error) {
            console.error('Error sending admin notification:', error.message);
        }

        console.log('ՆՈՐ ՊԱՏՎԵՐ:', {
            category: finalOrder.selectedCategory,
            quantity: finalOrder.quantity,
            deliveryDate: finalOrder.deliveryDate,
            deliveryTime: finalOrder.deliveryTime,
            cardMessage: finalOrder.cardMessage,
            address: finalOrder.address,
            phone: finalOrder.phone,
            paymentScreenshot: finalOrder.paymentScreenshot
        });
        bot.sendMessage(chatId, _texts.orderConfirmed, { parse_mode: 'Markdown' });
        delete userStates[userId];

    } else if (data === 'cancel_order') {
        bot.sendMessage(chatId, _texts.orderCancelled, { parse_mode: 'Markdown' });
        delete userStates[userId];

    } else if (data.startsWith('month_')) {
        const parts = data.split('_');
        const year = parseInt(parts[1]);
        const month = parseInt(parts[2]);

        bot.editMessageReplyMarkup(getCalendarKeyboard(year, month, userId, userStates), {
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
        } catch (error) {
            console.error("ERROR: Failed to parse date from callback data:", data, error.message);
            bot.sendMessage(chatId, _texts.invalidDate, { parse_mode: 'Markdown' });
            const nowForCalendar = moment().tz('Asia/Yerevan');
            const translatedCategoryName = userStates[userId].selectedCategory ? getCategoryName(categories.find(c => c.id === userStates[userId].selectedCategory.id), currentLang) : "";
            bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
                parse_mode: 'Markdown',
                reply_markup: getCalendarKeyboard(nowForCalendar.year(), nowForCalendar.month(), userId, userStates)
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
                reply_markup: getCalendarKeyboard(nowForCalendar.year(), nowForCalendar.month(), userId, userStates)
            });
            return;
        }

        userStates[userId].deliveryDate = selectedDateMoment.toDate();
        userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_TIME;
        const formattedDate = selectedDateMoment.format('DD.MM.YYYY');
        bot.sendMessage(chatId, _texts.dateSelected(formattedDate), {
            parse_mode: 'Markdown',
            reply_markup: getTimesKeyboard(userStates[userId].deliveryDate, userId, userStates)
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
                reply_markup: getTimesKeyboard(userStates[userId].deliveryDate, userId, userStates)
            });
            return;
        }

        userStates[userId].deliveryTime = time;
        userStates[userId].step = STEPS.WAITING_FOR_CARD_OPTION;
        const deliveryDateMoment = moment(userStates[userId].deliveryDate).tz('Asia/Yerevan');
        const deliveryDateFormatted = deliveryDateMoment.format('DD.MM.YYYY');
        bot.sendMessage(chatId, _texts.timeSelected(deliveryDateFormatted, time), {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: _texts.includeCard, callback_data: 'include_card' }],
                    [{ text: _texts.skipCard, callback_data: 'skip_card' }],
                    [{ text: _texts.selectDateBack, callback_data: 'select_date_back' }]
                ]
            }
        });

    } else if (data === 'select_date_back') {
        const nowForCalendar = moment().tz('Asia/Yerevan');
        const translatedCategoryName = userStates[userId].selectedCategory ? getCategoryName(categories.find(c => c.id === userStates[userId].selectedCategory.id), currentLang) : "";
        bot.sendMessage(chatId, _texts.chooseDeliveryDate(translatedCategoryName), {
            parse_mode: 'Markdown',
            reply_markup: getCalendarKeyboard(nowForCalendar.year(), nowForCalendar.month(), userId,userStates)
        });
        userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_DATE;

    } else if (data === 'select_time_back') {
        bot.sendMessage(chatId, _texts.chooseDeliveryTime, {
            parse_mode: 'Markdown',
            reply_markup: getTimesKeyboard(userStates[userId].deliveryDate, userId, use)
        });
        userStates[userId].step = STEPS.WAITING_FOR_DELIVERY_TIME;

    } else if (data === 'select_address_back') {
        bot.sendMessage(chatId, _texts.addressExample, { parse_mode: 'Markdown' });
        userStates[userId].step = STEPS.WAITING_FOR_ADDRESS;
    }
}

function handleMessage(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

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

    const _texts = getLocalizedText(userId, userStates);
    const currentLang = userStates[userId].language;

    if (userStates[userId].step === STEPS.WAITING_FOR_PAYMENT_SCREENSHOT && !msg.photo) {
        bot.sendMessage(chatId, _texts.invalidPaymentScreenshot, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: _texts.cancelOrder, callback_data: 'cancel_order' }],
                    [{ text: _texts.selectAddressBack, callback_data: 'select_address_back' }]
                ]
            }
        });
        return;
    }

    switch (userStates[userId].step) {
        case STEPS.WAITING_FOR_CARD_MESSAGE: {
            if (!text || text.length > 200) {
                bot.sendMessage(chatId, _texts.invalidCardMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: _texts.selectTimeBack, callback_data: 'select_time_back' }]
                        ]
                    }
                });
                return;
            }
            userStates[userId].cardMessage = text;
            userStates[userId].step = STEPS.WAITING_FOR_ADDRESS;
            bot.sendMessage(chatId, _texts.addressExample, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: _texts.selectTimeBack, callback_data: 'select_time_back' }]
                    ]
                }
            });
            break;
        }

        case STEPS.WAITING_FOR_ADDRESS: {
            userStates[userId].address = text;
            userStates[userId].step = STEPS.WAITING_FOR_PHONE;
            bot.sendMessage(chatId, _texts.phoneExample, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: _texts.selectAddressBack, callback_data: 'select_address_back' }]
                    ]
                }
            });
            break;
        }

        case STEPS.WAITING_FOR_PHONE: {
            const phoneRegex = /^\+374\s?\d{2}\s?\d{6}$/;
            if (!phoneRegex.test(text)) {
                bot.sendMessage(chatId, _texts.phoneExample + '\n\n' + _texts.invalidPhone, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: _texts.selectAddressBack, callback_data: 'select_address_back' }]
                        ]
                    }
                });
                return;
            }

            userStates[userId].phone = text;
            userStates[userId].step = STEPS.WAITING_FOR_PAYMENT_SCREENSHOT;

            const category = userStates[userId].selectedCategory;
            const quantity = userStates[userId].quantity;
            const address = userStates[userId].address;
            const phone = userStates[userId].phone;
            const cardMessage = userStates[userId].cardMessage;
            const deliveryDateMoment = userStates[userId].deliveryDate && !isNaN(userStates[userId].deliveryDate.getTime())
                                 ? moment(userStates[userId].deliveryDate).tz('Asia/Yerevan')
                                 : null;
            const deliveryDate = deliveryDateMoment ? deliveryDateMoment.format('DD.MM.YYYY') : _texts.invalidDate;
            const deliveryTime = userStates[userId].deliveryTime;

            let priceInfo = '';
            if (category.priceRange.min && category.priceRange.max) {
                priceInfo = `${category.priceRange.min} - ${category.priceRange.max} ֏`;
            } else if (category.priceRange.min) {
                priceInfo = currentLang === 'hy' ? `${category.priceRange.min} ֏-ից սկսած` :
                            currentLang === 'ru' ? `От ${category.priceRange.min} ֏` :
                            `Starting from ${category.priceRange.min} ֏`;
            }

            const orderSummary = _texts.orderSummary(category.name, quantity, deliveryDate, deliveryTime, priceInfo, address, phone, cardMessage);

            bot.sendMessage(chatId, orderSummary, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: _texts.cancelOrder, callback_data: 'cancel_order' }],
                        [{ text: _texts.selectAddressBack, callback_data: 'select_address_back' }]
                    ]
                }
            });
            bot.sendMessage(chatId, _texts.requestPaymentScreenshot, {
                parse_mode: 'Markdown'
            });
            break;
        }

        case STEPS.WAITING_FOR_PAYMENT_SCREENSHOT: {
            if (msg.photo && msg.photo.length > 0) {
                const photo = msg.photo[msg.photo.length - 1];
                userStates[userId].paymentScreenshot = photo.file_id;
                userStates[userId].step = STEPS.ORDER_CONFIRMED;

                bot.sendMessage(chatId, _texts.paymentScreenshotReceived, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: _texts.confirmOrder, callback_data: 'final_confirm_order' }],
                            [{ text: _texts.cancelOrder, callback_data: 'cancel_order' }]
                        ]
                    }
                });
            }
            break;
        }

        default:
            bot.sendMessage(chatId, _texts.unknownCommand, { parse_mode: 'Markdown' });
            break;
    }
}

module.exports = { handleStartCommand, handleHelpCommand, handleCallbackQuery, handleMessage, userStates };