// Sistema de logging de segurança
// Logs apenas em produção, informações sensíveis são sanitizadas

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log de segurança - eventos críticos de segurança
 */
export const logSecurityEvent = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...details,
  };

  // Em produção, logar apenas eventos críticos
  if (isProduction) {
    // Em produção, você pode enviar para um serviço de logging (ex: Sentry, Loggly)
    console.log(`[SECURITY] ${timestamp} - ${event}`, sanitizeLogDetails(details));
  } else {
    // Em desenvolvimento, logar tudo
    console.log(`[SECURITY] ${timestamp} - ${event}`, details);
  }
};

/**
 * Sanitizar detalhes do log para não expor informações sensíveis
 */
const sanitizeLogDetails = (details) => {
  const sanitized = { ...details };
  
  // Remover campos sensíveis
  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie'];
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Log de tentativas de acesso não autorizado
 */
export const logUnauthorizedAccess = (req, reason) => {
  logSecurityEvent('UNAUTHORIZED_ACCESS', {
    ip: req.ip || req.connection.remoteAddress,
    path: req.path,
    method: req.method,
    reason,
    userAgent: req.get('user-agent'),
  });
};

/**
 * Log de tentativas de brute force
 */
export const logBruteForceAttempt = (req, action) => {
  logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
    ip: req.ip || req.connection.remoteAddress,
    action,
    userAgent: req.get('user-agent'),
  });
};

/**
 * Log de atividades suspeitas
 */
export const logSuspiciousActivity = (req, activity) => {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', {
    ip: req.ip || req.connection.remoteAddress,
    path: req.path,
    activity,
    userAgent: req.get('user-agent'),
  });
};

/**
 * Log condicional - apenas em desenvolvimento
 */
export const devLog = (...args) => {
  if (isDevelopment) {
    console.log('[DEV]', ...args);
  }
};

/**
 * Log de erro - sempre logar, mas sanitizar em produção
 */
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    ...context,
  };

  if (isProduction) {
    // Em produção, não expor stack traces completos
    console.error('[ERROR]', errorInfo.message, sanitizeLogDetails(context));
  } else {
    console.error('[ERROR]', errorInfo);
  }
};

