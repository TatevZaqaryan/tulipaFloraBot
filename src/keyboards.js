const moment = require('moment-timezone');
const shopInfo = require('../data/shopInfo');
const { texts } = require('./constants');
const { getLocalizedText } = require('./utils');
const { userStates } = require('./handlers'); // ներմուծեք userStates

const mainMenuReplyKeyboard = {
    keyboard: [
        [{ text: '🚀 Start' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};


function getCalendarKeyboard(year, month, userId, userStates) {
    const _texts = getLocalizedText(userId, userStates);
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
        const date = moment().tz('Asia/Yerevan').year(year).month(month).date(day).startOf('day');
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

function getTimesKeyboard(selectedDateObj, userId, userStates) {
    const _texts = getLocalizedText(userId, userStates);
    console.log(`DEBUG: getTimesKeyboard - userId=${userId}, userStates=${JSON.stringify(userStates)}`);
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
    let hasValidTimeSlots = false; // Հայտարարեք այստեղ

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
        console.log(`DEBUG: getTimesKeyboard - Adding noTimesForToday with chooseDeliveryTime:`, _texts.chooseDeliveryTime);
        buttons.push([{ text: _texts.noTimesForToday, callback_data: 'ignore_no_times' }]);
    }

    buttons.push([{ text: _texts.selectAnotherDate, callback_data: 'select_date_back' }]);

    return { inline_keyboard: buttons };
}

module.exports = { mainMenuReplyKeyboard, getCalendarKeyboard, getTimesKeyboard };