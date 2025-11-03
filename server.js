import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import {
  setupHelmet,
  apiLimiter,
  authLimiter,
  sanitizeInput,
} from './middlewares/security.js';

// Importar rotas
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import materialPurchaseRoutes from './routes/materialPurchaseRoutes.js';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se estamos no Vercel
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production' || isVercel;

// Validar variáveis de ambiente críticas ANTES de iniciar
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];

if (isProduction) {
  requiredEnvVars.push('ENCRYPTION_KEY');
}

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não configuradas:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n⚠️  O servidor não será iniciado sem essas variáveis.\n');
  // No Vercel, não usar process.exit() pois crasha a função serverless
  if (!isVercel) {
    process.exit(1);
  }
}

// Validar força do JWT_SECRET
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('⚠️  AVISO DE SEGURANÇA: JWT_SECRET deve ter no mínimo 32 caracteres para produção');
  if (isProduction) {
    console.error('❌ Servidor não será iniciado em produção com JWT_SECRET fraco');
    if (!isVercel) {
      process.exit(1);
    }
  }
}

// Validar força do ENCRYPTION_KEY em produção
if (isProduction && process.env.ENCRYPTION_KEY) {
  if (process.env.ENCRYPTION_KEY.length < 32) {
    console.error('❌ ERRO: ENCRYPTION_KEY deve ter no mínimo 32 caracteres em produção');
    if (!isVercel) {
      process.exit(1);
    }
  }
}

// Conectar ao banco de dados (async - não bloquear)
connectDB().catch(err => {
  console.error('❌ Erro ao conectar MongoDB:', err.message);
  // No Vercel, não fazer process.exit(), apenas logar o erro
  if (!isVercel) {
    process.exit(1);
  }
});

// Inicializar Express
const app = express();

// Middlewares de segurança
app.use(setupHelmet);
app.use(sanitizeInput);

// CORS configurado
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Proteção contra DoS - Limitar tamanho de payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting - aplicar antes das rotas específicas
// Rotas de autenticação terão rate limiting mais flexível
app.use('/api/auth/me', authLimiter);

// Rate limiting geral para outras rotas (exclui /api/auth/me)
app.use('/api', apiLimiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/material-purchases', materialPurchaseRoutes);

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
  });
});

// Middleware de erro global
app.use(async (err, req, res, next) => {
  // Log seguro de erros
  try {
    const { logError } = await import('./utils/securityLogger.js');
    logError(err, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } catch (logError) {
    // Se falhar o log, apenas logar erro básico
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro:', err);
    }
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
  });
});

// Exportar app para Vercel (serverless)
export default app;

// Iniciar servidor apenas se não estiver em ambiente serverless
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}
