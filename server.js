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

// CORS DEVE SER O PRIMEIRO MIDDLEWARE - antes de qualquer outro
// Permite múltiplas origens para desenvolvimento e produção
const allowedOrigins = [
  'http://localhost:5173', // Desenvolvimento local
  'http://localhost:3000', // Alternativa local
  process.env.FRONTEND_URL, // URL de produção do Netlify
].filter(Boolean); // Remove valores undefined/null

// Função para verificar se é um domínio Netlify
const isNetlifyDomain = (origin) => {
  if (!origin) return false;
  // Aceita qualquer subdomínio .netlify.app (deploys, previews, etc)
  return origin.endsWith('.netlify.app') || origin === 'https://controls-finance-app-v001.netlify.app';
};

// Log das origens permitidas (apenas em produção para debug)
if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
  console.log('🌐 CORS configurado. Origens permitidas:', allowedOrigins);
  if (!process.env.FRONTEND_URL) {
    console.warn('⚠️ AVISO: FRONTEND_URL não está configurada. Configure no Vercel para produção!');
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Aceita qualquer domínio Netlify (deploys, previews, produção)
    if (isNetlifyDomain(origin)) {
      return callback(null, true);
    }
    
    // Verifica se a origem está na lista permitida
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Em desenvolvimento, permite qualquer origem (apenas para debug)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Em produção, bloqueia origens não permitidas
    console.warn(`⚠️ CORS bloqueado: Origem "${origin}" não está na lista permitida. Origens permitidas:`, allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200, // Para navegadores antigos
  preflightContinue: false,
};

// Handler MUITO EXPLÍCITO para OPTIONS ANTES de tudo
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    // Função para verificar se é domínio Netlify (qualquer subdomínio .netlify.app)
    const isNetlifyDomain = (origin) => {
      if (!origin) return false;
      return typeof origin === 'string' && origin.includes('.netlify.app');
    };
    
    // Sempre permitir se:
    // 1. É desenvolvimento OU
    // 2. É domínio Netlify OU
    // 3. Está na lista de origens permitidas OU
    // 4. Não tem origin (alguns clientes não enviam)
    const shouldAllow = 
      process.env.NODE_ENV === 'development' ||
      !origin ||
      isNetlifyDomain(origin) ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000' ||
      origin === process.env.FRONTEND_URL;
    
    if (shouldAllow) {
      // Se tem origin, usar ele. Se não tem, usar * (mas não funciona com credentials)
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
      console.log(`✅ OPTIONS permitido para: ${origin || 'sem origin'}`);
      return res.status(200).end();
    } else {
      console.warn(`⚠️ OPTIONS bloqueado para: ${origin}`);
    }
  }
  next();
});

app.use(cors(corsOptions));

// Handler explícito para OPTIONS (preflight) - garante que sempre retorne CORS
app.options('*', cors(corsOptions));

// Log de requisições CORS para debug (apenas em produção no Vercel)
app.use((req, res, next) => {
  if (process.env.VERCEL === '1' && req.method === 'OPTIONS') {
    console.log(`🔍 Preflight OPTIONS: ${req.headers.origin} → ${req.path}`);
  }
  next();
});


// Middlewares de segurança (após CORS)
app.use(setupHelmet);
app.use(sanitizeInput);

// Proteção contra DoS - Limitar tamanho de payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Middleware de debug (remover em produção final)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL === '1') {
    console.log(`📥 ${req.method} ${req.path} - Query:`, req.query);
  }
  next();
});

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

// Rota raiz para verificar se está funcionando
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Backend - Sistema de Controle de Finanças',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      clients: '/api/clients',
      sales: '/api/sales',
      materials: '/api/materials',
      materialPurchases: '/api/material-purchases',
    },
    timestamp: new Date().toISOString(),
  });
});

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
  // Aplicar CORS no erro também
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean);
  
  // Função para verificar se é domínio Netlify
  const isNetlifyDomain = (origin) => {
    if (!origin) return false;
    return origin.endsWith('.netlify.app') || origin === 'https://controls-finance-app-v001.netlify.app';
  };
  
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development' || isNetlifyDomain(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Log detalhado do erro
  console.error('❌ ERRO:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    message: err.message,
    status: err.status || 500,
    stack: process.env.VERCEL === '1' ? err.stack : undefined, // Log stack no Vercel para debug
  });
  
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
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL === '1') {
      console.error('Erro completo:', err);
    }
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Rota 404 - IMPORTANTE: Garantir que 404 sempre tenha CORS
app.use((req, res) => {
  console.log(`❌ Rota não encontrada: ${req.method} ${req.path}`);
  
  // Aplicar CORS manualmente na resposta 404
  const origin = req.headers.origin;
  const isNetlifyDomain = (origin) => {
    if (!origin) return false;
    return typeof origin === 'string' && origin.includes('.netlify.app');
  };
  
  if (origin && (
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:3000' ||
    origin === process.env.FRONTEND_URL ||
    process.env.NODE_ENV === 'development' ||
    isNetlifyDomain(origin)
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/products',
      'GET /api/clients',
      'GET /api/sales',
      'GET /api/materials',
      'GET /api/material-purchases',
    ],
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
