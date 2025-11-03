import MaterialPurchase from '../models/MaterialPurchase.js';
import Material from '../models/Material.js';

// @desc    Listar todas as compras de materiais
// @route   GET /api/material-purchases
// @access  Private
export const getMaterialPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, material } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    
    if (material) {
      query.material = material;
    }
    
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await MaterialPurchase.find(query)
      .populate('material', 'name category unit')
      .populate('purchasedBy', 'name email')
      .skip(skip)
      .limit(limitNum)
      .sort({ purchaseDate: -1 });

    const total = await MaterialPurchase.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar compras de materiais',
      error: error.message,
    });
  }
};

// @desc    Criar nova compra de material
// @route   POST /api/material-purchases
// @access  Private (Admin ou Vendedor)
export const createMaterialPurchase = async (req, res) => {
  try {
    const { material, quantity, unitPrice, supplier, notes } = req.body;

    const materialDoc = await Material.findById(material);

    if (!materialDoc) {
      return res.status(404).json({
        success: false,
        message: 'Material não encontrado',
      });
    }

    const totalCost = unitPrice * quantity;

    // Criar registro de compra
    const purchase = await MaterialPurchase.create({
      material,
      quantity,
      unitPrice,
      totalCost,
      supplier: supplier || materialDoc.supplier,
      purchasedBy: req.user.id,
      notes,
    });

    // Atualizar estoque do material
    materialDoc.quantityInStock += quantity;
    // Atualizar custo por unidade se o novo preço for diferente
    if (unitPrice !== materialDoc.costPerUnit) {
      // Pode calcular média ponderada ou simplesmente atualizar
      // Por simplicidade, vamos atualizar o custo
      materialDoc.costPerUnit = unitPrice;
    }
    await materialDoc.save();

    const populatedPurchase = await MaterialPurchase.findById(purchase._id)
      .populate('material', 'name category unit')
      .populate('purchasedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Compra de material registrada com sucesso',
      data: { purchase: populatedPurchase },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar compra de material',
      error: error.message,
    });
  }
};

// @desc    Obter relatório de consumo de materiais
// @route   GET /api/materials/consumption-report
// @access  Private
export const getMaterialConsumptionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias',
      });
    }

    // Buscar todas as vendas no período
    const Sale = (await import('../models/Sale.js')).default;
    const sales = await Sale.find({
      saleDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      status: 'concluida',
      paymentStatus: 'pago', // Apenas vendas pagas
    }).populate('items.materialsUsed.material', 'name category unit costPerUnit');

    // Agregar consumo por material
    const consumptionMap = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.materialsUsed && Array.isArray(item.materialsUsed)) {
          item.materialsUsed.forEach((matUsed) => {
            const materialId = matUsed.material?._id?.toString() || matUsed.material?.toString();
            
            if (!consumptionMap[materialId]) {
              consumptionMap[materialId] = {
                material: matUsed.material,
                totalQuantity: 0,
                totalCost: 0,
                salesCount: 0,
              };
            }

            consumptionMap[materialId].totalQuantity += matUsed.quantity;
            consumptionMap[materialId].totalCost += matUsed.cost;
            consumptionMap[materialId].salesCount += 1;
          });
        }
      });
    });

    const consumption = Object.values(consumptionMap);
    const totalCost = consumption.reduce((sum, item) => sum + item.totalCost, 0);

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
        },
        statistics: {
          totalMaterialsUsed: consumption.length,
          totalCost,
        },
        consumption,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de consumo',
      error: error.message,
    });
  }
};
