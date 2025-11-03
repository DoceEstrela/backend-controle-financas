import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do produto é obrigatório'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Preço é obrigatório'],
    min: [0, 'Preço não pode ser negativo'],
  },
  costPrice: {
    type: Number,
    required: [true, 'Preço de custo é obrigatório'],
    min: [0, 'Preço de custo não pode ser negativo'],
  },
  stock: {
    type: Number,
    required: [true, 'Estoque é obrigatório'],
    min: [0, 'Estoque não pode ser negativo'],
    default: 0,
  },
  category: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Atualizar updatedAt antes de salvar
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Product', productSchema);
