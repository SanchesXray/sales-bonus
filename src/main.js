/**
 * Функция для расчета выручки от продажи товара
 * @param {Object} purchase - запись о покупке товара из чека
 * @param {number} purchase.discount - процент скидки на товар
 * @param {number} purchase.sale_price - цена продажи товара
 * @param {number} purchase.quantity - количество проданного товара
 * @param {Object} _product - карточка товара (не используется в данной реализации)
 * @returns {number} выручка от продажи товара с учетом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет выручки от операции
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  const discountAmount = sale_price * (discount / 100);
  const finalPrice = sale_price - discountAmount;
  return finalPrice * quantity;
}

/**
 * Функция для расчета бонусов продавца на основе позиции в рейтинге
 * @param {number} index - порядковый номер продавца в отсортированном массиве (0 - первый)
 * @param {number} total - общее число продавцов
 * @param {Object} seller - карточка продавца с рассчитанной прибылью
 * @param {number} seller.profit - прибыль продавца
 * @returns {number} сумма бонуса продавца
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  if (index === 0) {
    return profit * 0.15; // 15% бонус для первого места
  } else if (index === 1 || index === 2) {
    return profit * 0.1; // 10% бонус для второго и третьего места
  } else if (index === total - 1) {
    return 0; // 0% бонус для последнего места
  } else {
    return profit * 0.05; // 5% бонус для всех остальных
  }
}

/**
 * Основная функция для анализа данных продаж и расчета показателей эффективности продавцов
 * @param {Object} data - входные данные для анализа
 * @param {Array} data.sellers - массив продавцов
 * @param {Array} data.products - массив товаров
 * @param {Array} data.purchase_records - массив записей о покупках
 * @param {Object} options - опции для расчета показателей
 * @param {Function} options.calculateRevenue - функция расчета выручки
 * @param {Function} options.calculateBonus - функция расчета бонусов
 * @returns {Array} массив объектов с результатами анализа для каждого продавца:
 *   - seller_id: идентификатор продавца
 *   - name: полное имя продавца
 *   - revenue: общая выручка продавца
 *   - profit: общая прибыль продавца
 *   - sales_count: количество совершенных продаж (чеков)
 *   - top_products: топ-10 самых продаваемых товаров по количеству
 *   - bonus: сумма бонуса продавца
 * @throws {Error} если входные данные некорректны или не переданы обязательные функции
 */
function analyzeSalesData(data, options) {
  // Проверка наличия и корректности входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records)||
    data.purchase_records.length === 0 
  ) {
    throw new Error("Некорректные входные данные");
  }

  // Проверка наличия обязательных функций для расчетов
  if (
    typeof options?.calculateRevenue !== "function" ||
    typeof options?.calculateBonus !== "function"
  ) {
    throw new Error("Не переданы обязательные функции для расчетов");
  }

  // Инициализация структуры для сбора статистики по продавцам
  const sellersStats = {};
  data.sellers.forEach((seller) => {
    sellersStats[seller.id] = {
      seller_id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,          // Общая выручка
      profit: 0,           // Общая прибыль
      sales_count: 0,      // Количество чеков (продаж)
      products_sold: {},   // Статистика по проданным товарам (sku: quantity)
    };
  });

  // Создание индексов для быстрого доступа к данным
  const sellerIndex = {};
  data.sellers.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });
  
  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // Обработка всех записей о покупках
  data.purchase_records.forEach((record) => {
    const sellerStat = sellersStats[record.seller_id];
    
    // Увеличиваем счетчик чеков и добавляем общую сумму чека к выручке
    sellerStat.sales_count += 1;
    sellerStat.revenue += record.total_amount;

    // Обрабатываем каждый товар в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; 
      
      // Расчет себестоимости проданного товара
      const itemCost = product.purchase_price * item.quantity;
      
      // Расчет выручки от товара с помощью переданной функции
      const itemRevenue = options.calculateRevenue(item, product);
      
      // Расчет прибыли от товара
      const itemProfit = itemRevenue - itemCost;
      
      // Добавление прибыли к общей прибыли продавца
      sellerStat.profit += itemProfit;
      
      // Обновление статистики по проданным товарам
      if (!sellerStat.products_sold[item.sku]) {
        sellerStat.products_sold[item.sku] = 0;
      }
      sellerStat.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортировка продавцов по прибыли (по убыванию)
  const sortedSellers = Object.values(sellersStats).sort(
    (a, b) => b.profit - a.profit
  );
  const totalSellers = sortedSellers.length;

  // Расчет бонусов и формирование топ-товаров для каждого продавца
  sortedSellers.forEach((seller, index) => {
    // Расчет бонуса с помощью переданной функции
    seller.bonus = options.calculateBonus(index, totalSellers, seller);
    
    // Формирование топ-10 товаров по количеству продаж
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity) // Сортировка по убыванию количества
      .slice(0, 10); // Берем первые 10 позиций
  });

  // Форматирование и возврат результата
  return sortedSellers.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),        // Округление до 2 знаков
    profit: +seller.profit.toFixed(2),          // Округление до 2 знаков
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),            // Округление до 2 знаков
  }));
}