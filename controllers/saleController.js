import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Material from '../models/Material.js';

// @desc    Listar todas as vendas
// @route   GET /api/sales
// @access  Private
export const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) query.saleDate.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query)
      .populate('client', 'name email phone')
      .populate('seller', 'name email')
      .populate('items.product', 'name price')
      .skip(skip)
      .limit(limitNum)
      .sort({ saleDate: -1 });

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: {
        sales,
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
      message: 'Erro ao buscar vendas',
      error: error.message,
    });
  }
};

// @desc    Obter uma venda por ID
// @route   GET /api/sales/:id
// @access  Private
export const getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('client', 'name email phone address')
      .populate('seller', 'name email')
      .populate('items.product', 'name price costPrice');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada',
      });
    }

    res.json({
      success: true,
      data: { sale },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar venda',
      error: error.message,
    });
  }
};

// @desc    Criar nova venda
// @route   POST /api/sales
// @access  Private (Admin ou Vendedor)
export const createSale = async (req, res) => {
  try {
    const { client, items, paymentMethod, paymentStatus } = req.body;

    let totalAmount = 0;
    let totalCost = 0;
    let totalMaterialsCost = 0;

    // Determinar status de pagamento
    const finalPaymentStatus = paymentStatus || (paymentMethod === 'pendente' ? 'pendente' : 'pago');

    // Validar produtos e calcular totais
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Produto ${item.product} não encontrado`,
        });
      }

      // Sempre validar estoque, mesmo para vendas pendentes
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Estoque insuficiente para o produto ${product.name}. Disponível: ${product.stock}`,
        });
      }

      const unitPrice = item.unitPrice || product.price;
      const subtotal = unitPrice * item.quantity;
      const itemCost = product.costPrice * item.quantity;

      item.unitPrice = unitPrice;
      item.subtotal = subtotal;

      // Processar materiais utilizados neste item
      let itemMaterialsCost = 0;
      const materialsUsed = [];

      if (item.materialsUsed && Array.isArray(item.materialsUsed)) {
        for (const matItem of item.materialsUsed) {
          const material = await Material.findById(matItem.material);

          if (!material) {
            return res.status(404).json({
              success: false,
              message: `Material ${matItem.material} não encontrado`,
            });
          }

          const quantityNeeded = matItem.quantity * item.quantity; // Quantidade por item de venda

          // Validar estoque de material
          if (material.quantityInStock < quantityNeeded) {
            return res.status(400).json({
              success: false,
              message: `Estoque insuficiente do material ${material.name}. Disponível: ${material.quantityInStock} ${material.unit}, Necessário: ${quantityNeeded} ${material.unit}`,
            });
          }

          const materialCost = material.costPerUnit * quantityNeeded;
          itemMaterialsCost += materialCost;
          totalMaterialsCost += materialCost;

          materialsUsed.push({
            material: material._id,
            quantity: quantityNeeded,
            cost: materialCost,
          });

          // Atualizar estoque de material apenas se pagamento for pago
          if (finalPaymentStatus === 'pago') {
            material.quantityInStock -= quantityNeeded;
            await material.save();
          }
        }
      }

      item.materialsUsed = materialsUsed;
      totalAmount += subtotal;
      totalCost += itemCost + itemMaterialsCost;

      // Atualizar estoque de produto apenas se pagamento for pago
      if (finalPaymentStatus === 'pago') {
        product.stock -= item.quantity;
        await product.save();
      }
    }

    // Calcular lucros (incluindo custo de materiais)
    const grossProfit = totalAmount - totalCost;
    const tax = grossProfit * 0.15; // Imposto estimado (15%)
    const netProfit = grossProfit - tax;

    // Criar venda
    const sale = await Sale.create({
      client,
      items,
      totalAmount,
      totalCost,
      materialsCost: totalMaterialsCost,
      grossProfit,
      netProfit,
      seller: req.user.id,
      paymentMethod: paymentMethod || 'dinheiro',
      paymentStatus: finalPaymentStatus,
      paidAt: finalPaymentStatus === 'pago' ? new Date() : null,
      status: 'concluida',
    });

    const populatedSale = await Sale.findById(sale._id)
      .populate('client', 'name email phone')
      .populate('seller', 'name email')
      .populate('items.product', 'name price');

    res.status(201).json({
      success: true,
      message: 'Venda registrada com sucesso',
      data: { sale: populatedSale },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar venda',
      error: error.message,
    });
  }
};

// @desc    Atualizar status de pagamento de uma venda
// @route   PUT /api/sales/:id/payment
// @access  Private (Admin ou Vendedor)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venda não encontrada',
      });
    }

    // Se está marcando como pago e estava pendente, atualizar estoque
    if (paymentStatus === 'pago' && sale.paymentStatus === 'pendente') {
      for (const item of sale.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }

        // Atualizar estoque de materiais
        if (item.materialsUsed && Array.isArray(item.materialsUsed)) {
          for (const matItem of item.materialsUsed) {
            const material = await Material.findById(matItem.material);
            if (material) {
              material.quantityInStock -= matItem.quantity;
              await material.save();
            }
          }
        }
      }
    }

    // Se está marcando como pendente e estava pago, devolver estoque
    if (paymentStatus === 'pendente' && sale.paymentStatus === 'pago') {
      for (const item of sale.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }

        // Devolver estoque de materiais
        if (item.materialsUsed && Array.isArray(item.materialsUsed)) {
          for (const matItem of item.materialsUsed) {
            const material = await Material.findById(matItem.material);
            if (material) {
              material.quantityInStock += matItem.quantity;
              await material.save();
            }
          }
        }
      }
    }

    // Atualizar status de pagamento
    sale.paymentStatus = paymentStatus;
    if (paymentMethod) {
      sale.paymentMethod = paymentMethod;
    }
    if (paymentStatus === 'pago') {
      sale.paidAt = new Date();
    } else {
      sale.paidAt = null;
    }

    await sale.save();

    const populatedSale = await Sale.findById(sale._id)
      .populate('client', 'name email phone')
      .populate('seller', 'name email')
      .populate('items.product', 'name price');

    res.json({
      success: true,
      message: `Pagamento ${paymentStatus === 'pago' ? 'registrado' : 'marcado como pendente'} com sucesso`,
      data: { sale: populatedSale },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status de pagamento',
      error: error.message,
    });
  }
};

// @desc    Obter relatórios de vendas
// @route   GET /api/sales/reports/period
// @access  Private (Admin)
export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias',
      });
    }

    const sales = await Sale.find({
      saleDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      status: 'concluida',
      paymentStatus: 'pago', // Apenas vendas pagas no relatório
    }).populate('items.product', 'name');

    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = sales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalGrossProfit = sales.reduce((sum, sale) => sum + sale.grossProfit, 0);
    const totalNetProfit = sales.reduce((sum, sale) => sum + sale.netProfit, 0);

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
        },
        statistics: {
          totalSales,
          totalAmount,
          totalCost,
          totalGrossProfit,
          totalNetProfit,
        },
        sales,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message,
    });
  }
};
