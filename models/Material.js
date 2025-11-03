import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do material é obrigatório'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['cone', 'cobertura', 'topping', 'embalagem', 'utensilio', 'outro'],
    required: [true, 'Categoria é obrigatória'],
  },
  unit: {
    type: String,
    enum: ['unidade', 'kg', 'litro', 'pacote', 'caixa'],
    required: [true, 'Unidade de medida é obrigatória'],
    default: 'unidade',
  },
  costPerUnit: {
    type: Number,
    required: [true, 'Custo por unidade é obrigatório'],
    min: [0, 'Custo não pode ser negativo'],
  },
  quantityInStock: {
    type: Number,
    required: [true, 'Quantidade em estoque é obrigatória'],
    min: [0, 'Quantidade não pode ser negativa'],
    default: 0,
  },
  minimumStock: {
    type: Number,
    min: 0,
    default: 0,
  },
  supplier: {
    type: String,
    trim: true,
  },
  supplierPhone: {
    type: String,
    trim: true,
  },
  notes: {
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
materialSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Índice para melhor performance
materialSchema.index({ category: 1 });
materialSchema.index({ name: 1 });

export default mongoose.model('Material', materialSchema);
