import Client from '../models/Client.js';

// @desc    Listar todos os clientes
// @route   GET /api/clients
// @access  Private
export const getClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const clients = await Client.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: {
        clients,
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
      message: 'Erro ao buscar clientes',
      error: error.message,
    });
  }
};

// @desc    Obter um cliente por ID
// @route   GET /api/clients/:id
// @access  Private
export const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // Descriptografar CPF se necessário
    const clientData = client.toObject();
    if (clientData.cpf) {
      clientData.cpf = client.decryptCPF();
    }

    res.json({
      success: true,
      data: { client: clientData },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar cliente',
      error: error.message,
    });
  }
};

// @desc    Criar novo cliente
// @route   POST /api/clients
// @access  Private
export const createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data: { client },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email já cadastrado',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente',
      error: error.message,
    });
  }
};

// @desc    Atualizar cliente
// @route   PUT /api/clients/:id
// @access  Private
export const updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      data: { client },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar cliente',
      error: error.message,
    });
  }
};

// @desc    Deletar cliente
// @route   DELETE /api/clients/:id
// @access  Private (Admin)
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Cliente deletado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar cliente',
      error: error.message,
    });
  }
};

// @desc    Obter histórico de compras do cliente
// @route   GET /api/clients/:id/purchases
// @access  Private
export const getClientPurchases = async (req, res) => {
  try {
    const Sale = (await import('../models/Sale.js')).default;

    const sales = await Sale.find({ client: req.params.id })
      .populate('items.product', 'name price')
      .populate('seller', 'name email')
      .sort({ saleDate: -1 });

    res.json({
      success: true,
      data: { sales },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de compras',
      error: error.message,
    });
  }
};
