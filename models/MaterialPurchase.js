import mongoose from 'mongoose';

const materialPurchaseSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: [true, 'Material é obrigatório'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantidade é obrigatória'],
    min: [0.01, 'Quantidade deve ser maior que zero'],
    set: function(v) {
      // Garantir que quantidade seja sempre arredondada para 2 casas decimais
      return Math.round(parseFloat(v) * 100) / 100;
    },
  },
  unitPrice: {
    type: Number,
    required: [true, 'Preço unitário é obrigatório'],
    min: [0, 'Preço não pode ser negativo'],
    set: function(v) {
      // Garantir que preço seja sempre arredondado para 2 casas decimais
      return Math.round(parseFloat(v) * 100) / 100;
    },
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
    set: function(v) {
      // Garantir que total seja sempre arredondado para 2 casas decimais
      return Math.round(parseFloat(v) * 100) / 100;
    },
  },
  supplier: {
    type: String,
    trim: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Índices para melhor performance
materialPurchaseSchema.index({ purchaseDate: -1 });
materialPurchaseSchema.index({ material: 1 });

export default mongoose.model('MaterialPurchase', materialPurchaseSchema);
