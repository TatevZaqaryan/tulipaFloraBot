// data/flowers.js
module.exports = [
    {
        id: 'budget',
        name: {
            hy: 'Բյուջետային Ծաղկեփնջեր',
            en: 'Budget Bouquets',
            ru: 'Бюджетные Букеты'
        },
        priceRange: { // New field for price range
            min: 8000,
            max: 14999 // Up to 14,999 to fit before Standard
        },
        description: {
            hy: 'Մատչելի և գեղեցիկ ընտրություն՝ ցանկացած տրամադրություն բարձրացնելու համար։',
            en: 'Affordable and beautiful options to brighten any day.',
            ru: 'Доступные и красивые варианты для поднятия настроения.'
        },
        imagePath: './images/budget_bouquet.jpg' // Example image, update as needed
    },
    {
        id: 'standard',
        name: {
            hy: 'Ստանդարտ Ծաղկեփնջեր',
            en: 'Standard Bouquets',
            ru: 'Стандартные Букеты'
        },
        priceRange: {
            min: 15000,
            max: 24999 // Up to 24,999 to fit before Premium
        },
        description: {
            hy: 'Հարմարավետ և նորաձև ծաղկեփնջեր՝ առօրյա և հատուկ առիթների համար։',
            en: 'Convenient and stylish bouquets for everyday and special occasions.',
            ru: 'Удобные и стильные букеты для повседневных и особых случаев.'
        },
        imagePath: './images/standard_bouquet.jpg' // Example image, update as needed
    },
    {
        id: 'premium',
        name: {
            hy: 'Պրեմիում Ծաղկեփնջեր',
            en: 'Premium Bouquets',
            ru: 'Премиум Букеты'
        },
        priceRange: {
            min: 25000,
            max: 39999 // Up to 39,999 to fit before Luxe
        },
        description: {
            hy: 'Ընտիր և յուրօրինակ կոմպոզիցիաներ՝ ամեն պահը անմոռանալի դարձնելու համար։',
            en: 'Exquisite and unique compositions to make every moment unforgettable.',
            ru: 'Изысканные и уникальные композиции, чтобы сделать каждый момент незабываемым.'
        },
        imagePath: './images/premium_bouquet.jpg' // Example image, update as needed
    },
    {
        id: 'luxe',
        name: {
            hy: 'Լյուքս Ծաղկեփնջեր',
            en: 'Luxe Bouquets',
            ru: 'Люкс Букеты'
        },
        priceRange: {
            min: 40000,
            max: null // 40000+ means no upper limit
        },
        description: {
            hy: 'Շքեղ և էքսկլյուզիվ դիզայն՝ ամենաբարձր ճաշակի համար։',
            en: 'Luxurious and exclusive designs for the most discerning taste.',
            ru: 'Роскошные и эксклюзивные дизайны для самого взыскательного вкуса.'
        },
        imagePath: './images/luxury_bouquet.jpg' // Example image, update as needed
    }
];