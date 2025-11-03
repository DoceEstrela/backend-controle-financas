import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verificar token JWT
export const protect = async (req, res, next) => {
  let token;

  // Prioridade: header Authorization, depois cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // Log de tentativa de acesso não autorizado
    try {
      const { logUnauthorizedAccess } = await import('../utils/securityLogger.js');
      logUnauthorizedAccess(req, 'Token não fornecido');
    } catch (error) {
      // Se falhar o log, continuar normalmente
    }

    return res.status(401).json({
      success: false,
      message: 'Não autorizado. Token não fornecido.',
    });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuário
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      // Log de tentativa de acesso com usuário não encontrado
      try {
        const { logUnauthorizedAccess } = await import('../utils/securityLogger.js');
        logUnauthorizedAccess(req, 'Usuário não encontrado');
      } catch (error) {
        // Se falhar o log, continuar normalmente
      }

      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.',
      });
    }

    next();
  } catch (error) {
    // Log de tentativa de acesso com token inválido
    try {
      const { logUnauthorizedAccess } = await import('../utils/securityLogger.js');
      logUnauthorizedAccess(req, `Token inválido: ${error.name}`);
    } catch (logError) {
      // Se falhar o log, continuar normalmente
    }
    
    // Não expor detalhes do erro em produção
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Token inválido ou expirado.';
    
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado.',
    });
  }
};

// Verificar se o usuário é admin
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores.',
    });
  }
};

// Verificar se o usuário é admin ou vendedor
export const isAdminOrVendedor = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'vendedor')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores ou vendedores.',
    });
  }
};
