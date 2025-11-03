import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  materialsUsed: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
    },
    quantity: {
      type: Number,
      default: 1,
    },
    cost: {
      type: Number,
      default: 0,
    },
  }],
});

const saleSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Cliente é obrigatório'],
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  materialsCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  grossProfit: {
    type: Number,
    required: true,
  },
  netProfit: {
    type: Number,
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'boleto', 'pendente'],
    default: 'dinheiro',
  },
  paymentStatus: {
    type: String,
    enum: ['pago', 'pendente'],
    default: 'pago',
  },
  paidAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['pendente', 'concluida', 'cancelada'],
    default: 'concluida',
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Índices para melhor performance em consultas
saleSchema.index({ saleDate: -1 });
saleSchema.index({ client: 1 });
saleSchema.index({ seller: 1 });
saleSchema.index({ paymentStatus: 1 }); // Para filtrar vendas pendentes

export default mongoose.model('Sale', saleSchema);
