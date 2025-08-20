/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 0.15; // 15% для первого места
    if (index === 1 || index === 2) return 0.1; // 10% для второго и третьего места
    if (index === total - 1) return 0; // 0% для последнего места
    return 0.05; // 5% для всех остальных
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    checkData(data);
    
    // Проверка наличия опций
    checkOptions(options);
    
    const { calculateRevenue = calculateSimpleRevenue, calculateBonus = calculateBonusByProfit } = options;
    const { products, sellers, purchase_records } = data;
    
    // Индексация продавцов и товаров для быстрого доступа
    const sellerMap = new Map();
    const productMap = new Map();
    
    // Создаем индекс продуктов по SKU
    products.forEach(product => {
        productMap.set(product.sku, product);
    });
    
    // Инициализируем статистику для каждого продавца
    sellers.forEach(seller => {
        sellerMap.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            top_products: new Map()
        });
    });
    
    // Обрабатываем каждую покупку
    purchase_records.forEach(purchase => {
        const seller = sellerMap.get(purchase.seller_id);
        
        if (seller) {
            // Обрабатываем каждый товар в покупке
            purchase.items.forEach(item => {
                const product = productMap.get(item.sku);
                
                if (product) {
                    // Расчет выручки
                    const revenue = calculateRevenue(item, product);
                    
                    // Расчет себестоимости (используем purchase_price вместо cost_price)
                    const cost = product.purchase_price * item.quantity;
                    
                    // Расчет прибыли
                    const profit = revenue - cost;
                    
                    // Обновляем статистику продавца
                    seller.revenue += revenue;
                    seller.profit += profit;
                    seller.sales_count += item.quantity;
                    
                    // Обновляем статистику по продуктам
                    if (seller.top_products.has(product.sku)) {
                        const productStats = seller.top_products.get(product.sku);
                        productStats.quantity += item.quantity;
                        productStats.revenue += revenue;
                    } else {
                        seller.top_products.set(product.sku, {
                            product_id: product.sku,
                            name: product.name,
                            quantity: item.quantity,
                            revenue: revenue
                        });
                    }
                }
            });
        }
    });
    
    // Преобразование Map в массив для сортировки
    const sellersArray = Array.from(sellerMap.values()).map(seller => ({
        ...seller,
        top_products: Array.from(seller.top_products.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10) // Топ-10 продукта
    }));
    
    // Сортировка продавцов по прибыли
    sellersArray.sort((a, b) => b.profit - a.profit);
    
    // Назначение премий на основе ранжирования
    const totalSellers = sellersArray.length;
    sellersArray.forEach((seller, index) => {
        const bonusPercentage = calculateBonus(index, totalSellers, seller);
        seller.bonus = seller.profit * bonusPercentage;
    });
    
    // Подготовка итоговой коллекции с нужными полями
    return sellersArray.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        bonus: Number(seller.bonus.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products.map(product => ({
            product_id: product.product_id,
            name: product.name,
            quantity: product.quantity,
            revenue: Number(product.revenue.toFixed(2))
        }))
    }));
}

// Вспомогательные функции для проверки данных
function checkData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Не найдены входные данные или данные не являются объектом!');
    }
    
    const { customers, products, sellers, purchase_records } = data;
    
    if (!customers || !products || !sellers || !purchase_records) {
        throw new Error('Некорректный формат данных!');
    }
    
    if (!Array.isArray(customers) || !Array.isArray(products) || 
        !Array.isArray(sellers) || !Array.isArray(purchase_records)) {
        throw new Error('Данные должны быть массивами!');
    }
}

function checkOptions(options) {
    if (!options || typeof options !== 'object') {
        throw new Error('Не найдены опции или опции не являются объектом!');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    
    if (calculateRevenue && typeof calculateRevenue !== 'function') {
        throw new Error('calculateRevenue должна быть функцией!');
    }
    
    if (calculateBonus && typeof calculateBonus !== 'function') {
        throw new Error('calculateBonus должна быть функцией!');
    }
}

// Пример использования
const options = {
    calculateRevenue: calculateSimpleRevenue,
    calculateBonus: calculateBonusByProfit
};

try {
    const result = analyzeSalesData(data, options);
    console.log(result);
} catch (error) {
    console.error('Ошибка:', error.message);
}