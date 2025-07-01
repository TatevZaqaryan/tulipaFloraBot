const { texts } = require('./constants');

function getLocalizedText(userId, userStates = {}) { // Լռելյայն արժեք որպես դատարկ օբյեկտ
    console.log(`DEBUG: getLocalizedText - userId=${userId}, userStates=${JSON.stringify(userStates)}`);
    if (!userId || !userStates || !userStates[userId]) {
        console.log(`DEBUG: getLocalizedText - Defaulting to 'hy' for userId=${userId}`);
        return texts['hy'];
    }
    const lang = userStates[userId]?.language || 'hy';
    console.log(`DEBUG: getLocalizedText - Selected language: ${lang} for userId=${userId}`);
    return texts[lang];
}
function getCategoryName(category, lang) {
    return category.name[lang] || category.name['hy'];
}

function getCategoryDescription(category, lang) {
    return category.description[lang] || category.description['hy'];
}

module.exports = { getLocalizedText, getCategoryName, getCategoryDescription };