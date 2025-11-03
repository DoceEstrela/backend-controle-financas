import mongoose from 'mongoose';
import crypto from 'crypto';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
  },
  phone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    trim: true,
  },
  cpf: {
    type: String,
    trim: true,
    // Criptografado antes de salvar
  },
  address: {
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
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

// Criptografar CPF antes de salvar
clientSchema.pre('save', function (next) {
  if (this.isModified('cpf') && this.cpf) {
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_KEY;
    
    // Em produção, ENCRYPTION_KEY é obrigatória (validada no server.js)
    if (!secretKey) {
      if (process.env.NODE_ENV === 'production') {
        return next(new Error('ENCRYPTION_KEY não configurada. Sistema não pode funcionar em produção.'));
      }
      // Em desenvolvimento, apenas logar aviso
      console.warn('⚠️  AVISO: ENCRYPTION_KEY não configurada. CPF não será criptografado.');
      this.updatedAt = Date.now();
      return next();
    }
    
    // Validar tamanho mínimo da chave
    if (secretKey.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        return next(new Error('ENCRYPTION_KEY deve ter no mínimo 32 caracteres em produção.'));
      }
      console.warn('⚠️  AVISO: ENCRYPTION_KEY muito curta. Use pelo menos 32 caracteres.');
    }
    
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(secretKey.substring(0, 32), 'utf8');
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(this.cpf, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    this.cpf = iv.toString('hex') + ':' + encrypted;
  }
  this.updatedAt = Date.now();
  next();
});

// Método para descriptografar CPF
clientSchema.methods.decryptCPF = function () {
  if (!this.cpf || !this.cpf.includes(':')) {
    return this.cpf;
  }
  
  try {
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_KEY;
    
    if (!secretKey) {
      console.warn('⚠️  ENCRYPTION_KEY não configurada. Não é possível descriptografar CPF.');
      return null;
    }
    
    const parts = this.cpf.split(':');
    if (parts.length !== 2) {
      return null; // Formato inválido
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(secretKey.substring(0, 32), 'utf8');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Em desenvolvimento, logar o erro; em produção, não expor detalhes
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao descriptografar CPF:', error.message);
    }
    return null;
  }
};

export default mongoose.model('Client', clientSchema);
