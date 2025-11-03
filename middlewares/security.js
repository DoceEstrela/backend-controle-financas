import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Configurar Helmet para segurança de headers HTTP
// crossOriginResourcePolicy e crossOriginEmbedderPolicy desabilitados 
// pois gerenciamos CORS manualmente com o pacote cors
export const setupHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false, // Permite que o CORS seja gerenciado pelo pacote cors
});

// Rate limiting para login
export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // máximo 5 tentativas
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting geral para API (mais flexível)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Em desenvolvimento: mais requisições
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não aplicar rate limiting em rotas de health check e auth/me
    const path = req.path || req.url;
    return path === '/health' || path === '/auth/me' || path.includes('/health') || path.includes('/auth/me');
  },
});

// Rate limiting mais flexível para autenticação
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 50 : 500, // Mais flexível em desenvolvimento
  message: {
    success: false,
    message: 'Muitas requisições de autenticação. Tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para reset de senha (mais restritivo)
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // máximo 3 tentativas por 15 minutos
  message: {
    success: false,
    message: 'Muitas tentativas de reset de senha. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sanitizar entrada de dados (prevenir NoSQL Injection e XSS)
export const sanitizeInput = (req, res, next) => {
  const dangerousChars = /[\$<>\"'`{}[\]\\]/g;
  const dangerousOperators = {
    '$gt': '',
    '$gte': '',
    '$lt': '',
    '$lte': '',
    '$ne': '',
    '$in': '',
    '$nin': '',
    '$or': '',
    '$and': '',
    '$regex': '',
    '$exists': '',
    '$type': '',
    '$mod': '',
    '$where': '',
    '$all': '',
    '$size': '',
    '$elemMatch': '',
  };

  const sanitize = (obj, isKey = false) => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Se for um objeto, iterar sobre as chaves
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const sanitized = {};
      for (const key in obj) {
        // Remover chaves perigosas (operadores NoSQL)
        if (dangerousOperators.hasOwnProperty(key.toLowerCase())) {
          continue; // Ignorar chaves perigosas
        }

        // Sanitizar a chave
        const sanitizedKey = key.replace(dangerousChars, '');
        
        // Se a chave foi modificada, não incluir no objeto
        if (sanitizedKey !== key && sanitizedKey.length === 0) {
          continue;
        }

        // Sanitizar o valor
        sanitized[sanitizedKey] = sanitize(obj[key], false);
      }
      return sanitized;
    }

    // Se for array, sanitizar cada elemento
    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item, false));
    }

    // Se for string, remover caracteres perigosos
    if (typeof obj === 'string') {
      // Remover caracteres perigosos, mas manter estrutura básica
      return obj.replace(dangerousChars, '').trim();
    }

    return obj;
  };

  try {
    // Campos que NÃO devem ser sanitizados agressivamente (preservar caracteres especiais)
    const preserveFields = ['email', 'password', 'resetToken', 'verificationToken'];
    
    if (req.body && typeof req.body === 'object') {
      const originalBody = { ...req.body };
      req.body = sanitize(req.body);
      
      // Restaurar campos preservados (email, password, etc)
      preserveFields.forEach(field => {
        if (originalBody[field] !== undefined) {
          req.body[field] = originalBody[field];
        }
      });
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitize(req.query);
    }
    // Params geralmente são strings simples, mas vamos sanitizar
    if (req.params && typeof req.params === 'object') {
      for (const key in req.params) {
        if (typeof req.params[key] === 'string') {
          // Preservar tokens em params
          if (key.includes('token') || key.includes('Token')) {
            continue; // Não sanitizar tokens
          }
          req.params[key] = req.params[key].replace(dangerousChars, '');
        }
      }
    }
  } catch (error) {
    // Se falhar a sanitização, logar mas não bloquear
    console.error('❌ Erro ao sanitizar entrada:', error.message);
    if (process.env.VERCEL === '1') {
      console.error('Stack:', error.stack);
    }
  }

  next();
};
