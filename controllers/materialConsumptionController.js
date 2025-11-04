import MaterialConsumption from '../models/MaterialConsumption.js';
import Material from '../models/Material.js';

// @desc    Listar todos os consumos de materiais
// @route   GET /api/material-consumptions
// @access  Private
export const getMaterialConsumptions = async (req, res) => {
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
      query.consumptionDate = {};
      if (startDate) query.consumptionDate.$gte = new Date(startDate);
      if (endDate) query.consumptionDate.$lte = new Date(endDate);
    }

    const consumptions = await MaterialConsumption.find(query)
      .populate('material', 'name category unit costPerUnit')
      .populate('consumedBy', 'name email')
      .skip(skip)
      .limit(limitNum)
      .sort({ consumptionDate: -1 });

    const total = await MaterialConsumption.countDocuments(query);

    res.json({
      success: true,
      data: {
        consumptions,
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
      message: 'Erro ao buscar consumos de materiais',
      error: error.message,
    });
  }
};

// @desc    Criar novo consumo de material
// @route   POST /api/material-consumptions
// @access  Private (Admin ou Vendedor)
export const createMaterialConsumption = async (req, res) => {
  try {
    const { material, quantity, reason, reasonDescription, notes } = req.body;

    const materialDoc = await Material.findById(material);

    if (!materialDoc) {
      return res.status(404).json({
        success: false,
        message: 'Material não encontrado',
      });
    }

    // Garantir precisão nos cálculos
    const quantityNum = parseFloat(quantity);
    
    // Se for unidade, garantir que seja inteiro
    if (materialDoc.unit === 'unidade') {
      const intQuantity = Math.floor(quantityNum);
      if (intQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Para unidades, a quantidade deve ser um número inteiro maior que zero',
        });
      }
    }

    // Validar estoque
    if (materialDoc.quantityInStock < quantityNum) {
      return res.status(400).json({
        success: false,
        message: `Estoque insuficiente. Disponível: ${materialDoc.quantityInStock} ${materialDoc.unit}, Solicitado: ${quantityNum} ${materialDoc.unit}`,
      });
    }

    // Criar registro de consumo
    const consumption = await MaterialConsumption.create({
      material,
      quantity: materialDoc.unit === 'unidade' ? Math.floor(quantityNum) : quantityNum,
      reason,
      reasonDescription,
      consumedBy: req.user.id,
      notes,
    });

    // Atualizar estoque do material (reduzir)
    materialDoc.quantityInStock = Math.round((materialDoc.quantityInStock - (materialDoc.unit === 'unidade' ? Math.floor(quantityNum) : quantityNum)) * 100) / 100;
    
    // Garantir que estoque não fique negativo
    if (materialDoc.quantityInStock < 0) {
      materialDoc.quantityInStock = 0;
    }
    
    await materialDoc.save();

    const populatedConsumption = await MaterialConsumption.findById(consumption._id)
      .populate('material', 'name category unit costPerUnit')
      .populate('consumedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Consumo de material registrado com sucesso',
      data: { consumption: populatedConsumption },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar consumo de material',
      error: error.message,
    });
  }
};

// @desc    Deletar consumo de material
// @route   DELETE /api/material-consumptions/:id
// @access  Private (Admin)
export const deleteMaterialConsumption = async (req, res) => {
  try {
    const { id } = req.params;

    const consumption = await MaterialConsumption.findById(id).populate('material');

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: 'Consumo não encontrado',
      });
    }

    const materialDoc = consumption.material;
    if (!materialDoc) {
      return res.status(404).json({
        success: false,
        message: 'Material não encontrado',
      });
    }

    // Reverter estoque (adicionar quantidade de volta)
    materialDoc.quantityInStock = Math.round((materialDoc.quantityInStock + consumption.quantity) * 100) / 100;
    await materialDoc.save();

    // Deletar registro de consumo
    await MaterialConsumption.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Consumo deletado com sucesso. Estoque foi restaurado.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar consumo de material',
      error: error.message,
    });
  }
};

