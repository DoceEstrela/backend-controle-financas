import Product from '../models/Product.js';

// @desc    Listar todos os produtos
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
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

    const products = await Product.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
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
      message: 'Erro ao buscar produtos',
      error: error.message,
    });
  }
};

// @desc    Obter um produto por ID
// @route   GET /api/products/:id
// @access  Private
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado',
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produto',
      error: error.message,
    });
  }
};

// @desc    Criar novo produto
// @route   POST /api/products
// @access  Private (Admin ou Vendedor)
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso',
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar produto',
      error: error.message,
    });
  }
};

// @desc    Atualizar produto
// @route   PUT /api/products/:id
// @access  Private (Admin ou Vendedor)
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Produto atualizado com sucesso',
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar produto',
      error: error.message,
    });
  }
};

// @desc    Deletar produto
// @route   DELETE /api/products/:id
// @access  Private (Admin)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Produto deletado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar produto',
      error: error.message,
    });
  }
};
