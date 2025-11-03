import Material from '../models/Material.js';

// @desc    Listar todos os materiais
// @route   GET /api/materials
// @access  Private
export const getMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (category) {
      query.category = category;
    }

    const materials = await Material.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Material.countDocuments(query);

    res.json({
      success: true,
      data: {
        materials,
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
      message: 'Erro ao buscar materiais',
      error: error.message,
    });
  }
};

// @desc    Obter um material por ID
// @route   GET /api/materials/:id
// @access  Private
export const getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material não encontrado',
      });
    }

    res.json({
      success: true,
      data: { material },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar material',
      error: error.message,
    });
  }
};

// @desc    Criar novo material
// @route   POST /api/materials
// @access  Private (Admin ou Vendedor)
export const createMaterial = async (req, res) => {
  try {
    const { initialPurchase, ...materialData } = req.body;
    
    // Se houver quantidade inicial e não for zero, considera que já foi comprado
    const quantityInStock = parseFloat(materialData.quantityInStock) || 0;
    
    const material = await Material.create(materialData);

    // Se houver quantidade inicial, criar registro de compra automaticamente
    if (quantityInStock > 0 && initialPurchase) {
      const MaterialPurchase = (await import('../models/MaterialPurchase.js')).default;
      
      await MaterialPurchase.create({
        material: material._id,
        quantity: quantityInStock,
        unitPrice: materialData.costPerUnit || 0,
        totalCost: (materialData.costPerUnit || 0) * quantityInStock,
        supplier: materialData.supplier || '',
        purchasedBy: req.user.id,
        notes: 'Cadastro inicial',
      });
    }

    res.status(201).json({
      success: true,
      message: quantityInStock > 0 
        ? 'Material criado e estoque inicial registrado com sucesso'
        : 'Material criado com sucesso',
      data: { material },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar material',
      error: error.message,
    });
  }
};

// @desc    Atualizar material
// @route   PUT /api/materials/:id
// @access  Private (Admin ou Vendedor)
export const updateMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Material atualizado com sucesso',
      data: { material },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar material',
      error: error.message,
    });
  }
};

// @desc    Deletar material
// @route   DELETE /api/materials/:id
// @access  Private (Admin)
export const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Material deletado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar material',
      error: error.message,
    });
  }
};

// @desc    Obter estatísticas de materiais
// @route   GET /api/materials/stats
// @access  Private
export const getMaterialStats = async (req, res) => {
  try {
    const materials = await Material.find();
    
    const totalMaterials = materials.length;
    const totalStockValue = materials.reduce((sum, mat) => {
      return sum + (mat.costPerUnit * mat.quantityInStock);
    }, 0);
    
    const lowStockMaterials = materials.filter(
      (mat) => mat.minimumStock > 0 && mat.quantityInStock <= mat.minimumStock
    );
    
    const byCategory = {};
    materials.forEach((mat) => {
      if (!byCategory[mat.category]) {
        byCategory[mat.category] = {
          count: 0,
          totalValue: 0,
        };
      }
      byCategory[mat.category].count++;
      byCategory[mat.category].totalValue += mat.costPerUnit * mat.quantityInStock;
    });

    res.json({
      success: true,
      data: {
        totalMaterials,
        totalStockValue,
        lowStockCount: lowStockMaterials.length,
        lowStockMaterials,
        byCategory,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message,
    });
  }
};
