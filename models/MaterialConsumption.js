import mongoose from 'mongoose';

const materialConsumptionSchema = new mongoose.Schema({
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
  reason: {
    type: String,
    trim: true,
    required: [true, 'Motivo do consumo é obrigatório'],
    enum: ['uso_producao', 'perda_quebras', 'vencimento', 'teste_qualidade', 'outro'],
    default: 'uso_producao',
  },
  reasonDescription: {
    type: String,
    trim: true,
  },
  consumedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  consumptionDate: {
    type: Date,
    default: Date.now,
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
materialConsumptionSchema.index({ consumptionDate: -1 });
materialConsumptionSchema.index({ material: 1 });

export default mongoose.model('MaterialConsumption', materialConsumptionSchema);

