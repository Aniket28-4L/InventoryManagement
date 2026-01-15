import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import StockTransfer from '../models/StockTransfer.js';
import dayjs from 'dayjs';

export async function widgets(req, res, next) {
  try {
    // Total products - count of records in Product table
    const totalProducts = await Product.countDocuments();
    
    // Total warehouses - count of records in Warehouse table
    const totalWarehouses = await Warehouse.countDocuments();
    
    // Total stock items - sum of quantities from Stock table
    const stockAggregation = await Stock.aggregate([
      {
        $group: {
          _id: null,
          totalStockItems: { $sum: '$qty' }
        }
      }
    ]);
    const totalStockItems = stockAggregation[0]?.totalStockItems || 0;
    
    // Moves today - count of StockTransfer records for current date
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const movesToday = await StockTransfer.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    
    // Low stock items count
    const lowStock = await lowStockCount();
    
    // Movement data for last 7 days
    const last7 = await movementLast7Days();
    
    // Recent activity
    const recent = await StockMovement.find().sort({ createdAt: -1 }).limit(10).lean();
    
    res.json({ 
      success: true, 
      data: { 
        totalProducts, 
        totalWarehouses, 
        totalStockItems,
        movesToday,
        lowStock, 
        movement: last7, 
        recent 
      } 
    });
  } catch (e) { next(e); }
}

async function lowStockCount() {
  const products = await Product.find().lean();
  let count = 0;
  for (const p of products) {
    const agg = await Stock.aggregate([{ $match: { product: p._id } }, { $group: { _id: '$product', qty: { $sum: '$qty' } } }]);
    const qty = agg[0]?.qty || 0;
    if (qty <= (p.lowStockThreshold ?? 5)) count++;
  }
  return count;
}

async function movementLast7Days() {
  const arr = [];
  for (let i = 6; i >= 0; i--) {
    const start = dayjs().subtract(i, 'day').startOf('day').toDate();
    const end = dayjs().subtract(i, 'day').endOf('day').toDate();
    const count = await StockMovement.countDocuments({ createdAt: { $gte: start, $lte: end } });
    arr.push({ date: dayjs(start).format('ddd'), moves: count });
  }
  return arr;
}

