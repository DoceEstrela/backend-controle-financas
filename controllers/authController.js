import User from '../models/User.js';
import { generateToken, setTokenCookie } from '../utils/generateToken.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/sendEmail.js';
import crypto from 'crypto';

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Verificar se usuário já existe (case-insensitive)
    const userExists = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este email',
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'cliente',
      phone,
    });

    // Gerar token de verificação de email
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Enviar email de verificação
    try {
      const emailResult = await sendVerificationEmail(user.email, verificationToken);
      
      // NÃO gerar token - usuário precisa verificar email primeiro
      // Não fazer login automático até verificar email

      res.status(201).json({
        success: true,
        message: emailResult.devMode 
          ? 'Usuário registrado! Verifique o console do servidor para o link de verificação.'
          : 'Usuário registrado! Verifique seu email para confirmar sua conta e fazer login.',
        requiresVerification: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
          },
          verificationUrl: emailResult.devMode ? emailResult.verificationUrl : undefined,
        },
      });
    } catch (error) {
      // Se falhar ao enviar email, limpar tokens mas ainda permitir registro
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Erro ao enviar email de verificação:', error);
      
      // Mesmo se falhar, não fazer login automático
      res.status(201).json({
        success: true,
        message: 'Usuário registrado, mas não foi possível enviar email de verificação. Entre em contato com o suporte ou tente fazer login depois.',
        requiresVerification: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
          },
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message,
    });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar se usuário existe e buscar senha (case-insensitive)
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).select('+password');

    if (!user) {
      // Log de tentativa de login com email não encontrado
      try {
        const { logBruteForceAttempt } = await import('../utils/securityLogger.js');
        logBruteForceAttempt(req, 'LOGIN_FAILED_USER_NOT_FOUND');
      } catch (logError) {
        // Se falhar o log, continuar normalmente
      }

      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos',
      });
    }

    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Log de tentativa de login com senha incorreta
      try {
        const { logBruteForceAttempt } = await import('../utils/securityLogger.js');
        logBruteForceAttempt(req, 'LOGIN_FAILED_WRONG_PASSWORD');
      } catch (logError) {
        // Se falhar o log, continuar normalmente
      }

      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos',
      });
    }

    // Verificar se email foi verificado
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada ou solicite um novo email de verificação.',
        requiresVerification: true,
        email: user.email,
      });
    }

    // Gerar token
    const token = generateToken(user._id);

    // Definir cookie
    setTokenCookie(res, token);

    // Log de login bem-sucedido (sem informações sensíveis)
    try {
      const { logSecurityEvent } = await import('../utils/securityLogger.js');
      logSecurityEvent('LOGIN_SUCCESS', {
        userId: user._id.toString(),
        role: user.role,
      });
    } catch (logError) {
      // Se falhar o log, continuar normalmente
    }

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message,
    });
  }
};

// @desc    Logout de usuário
// @route   POST /api/auth/logout
// @access  Private
export const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({
    success: true,
    message: 'Logout realizado com sucesso',
  });
};

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário',
      error: error.message,
    });
  }
};

// @desc    Criar primeiro admin (público - apenas se não existir nenhum admin)
// @route   POST /api/auth/create-first-admin
// @access  Public
export const createFirstAdmin = async (req, res) => {
  try {
    // Verificar se já existe algum admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um administrador no sistema. Use o login para acessar.',
      });
    }

    const { name, email, password, phone } = req.body;

    // Validar campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios',
      });
    }

    // Verificar se usuário já existe (case-insensitive)
    const userExists = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este email',
      });
    }

    // Verificar se precisa verificar email para admin
    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION_FOR_ADMIN === 'true' || 
                                 (process.env.NODE_ENV === 'production' && process.env.REQUIRE_EMAIL_VERIFICATION_FOR_ADMIN !== 'false');

    // Criar administrador
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      phone,
      emailVerified: !requireVerification, // Se não requer verificação, já vem verificado
    });

    // Se precisar verificar email, enviar email de verificação
    if (requireVerification) {
      // Gerar token de verificação de email
      const verificationToken = admin.getEmailVerificationToken();
      await admin.save({ validateBeforeSave: false });

      try {
        const emailResult = await sendVerificationEmail(admin.email, verificationToken);

        res.status(201).json({
          success: true,
          message: emailResult.devMode
            ? 'Administrador criado! Verifique o console do servidor para o link de verificação.'
            : 'Administrador criado! Verifique seu email para confirmar sua conta e fazer login.',
          requiresVerification: true,
          data: {
            user: {
              id: admin._id,
              name: admin.name,
              email: admin.email,
              role: admin.role,
              emailVerified: admin.emailVerified,
            },
            verificationUrl: emailResult.devMode ? emailResult.verificationUrl : undefined,
          },
        });
        return;
      } catch (error) {
        // Se falhar ao enviar email, limpar tokens
        admin.emailVerificationToken = undefined;
        admin.emailVerificationExpire = undefined;
        await admin.save({ validateBeforeSave: false });

        console.error('Erro ao enviar email de verificação:', error);
        
        // Mesmo com erro, não fazer login automático se requer verificação
        res.status(201).json({
          success: true,
          message: 'Administrador criado, mas não foi possível enviar email de verificação. Entre em contato com o suporte.',
          requiresVerification: true,
          data: {
            user: {
              id: admin._id,
              name: admin.name,
              email: admin.email,
              role: admin.role,
              emailVerified: admin.emailVerified,
            },
          },
        });
        return;
      }
    }

    // Se não requer verificação, fazer login automático
    const token = generateToken(admin._id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Administrador criado com sucesso! Você será redirecionado.',
      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          emailVerified: admin.emailVerified,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar administrador',
      error: error.message,
    });
  }
};

// @desc    Listar todos os usuários (apenas admin)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    
    // Filtro por busca
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtro por role
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuários',
      error: error.message,
    });
  }
};

// @desc    Criar usuário (apenas admin)
// @route   POST /api/auth/create-user
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validar campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios',
      });
    }

    // Validar role
    const validRoles = ['admin', 'vendedor', 'cliente'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role inválida. Use: admin, vendedor ou cliente',
      });
    }

    // Verificar se usuário já existe (case-insensitive)
    const userExists = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este email',
      });
    }

    // Criar usuário
    // Usuários criados por admin são automaticamente verificados
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'cliente',
      phone,
      emailVerified: true, // Admin criou, então email já é considerado verificado
    });

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: error.message,
    });
  }
};

// @desc    Solicitar reset de senha
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuário (case-insensitive)
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    // Por segurança, não revelar se o email existe ou não
    if (!user) {
      return res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
    }

    // Gerar token de reset
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    try {
      // Enviar email
      const emailResult = await sendPasswordResetEmail(user.email, resetToken);

      // Se estiver em modo desenvolvimento ou SMTP falhou, ainda retorna sucesso mas com mensagem diferente
      if (emailResult.devMode) {
        res.json({
          success: true,
          message: emailResult.smtpError 
            ? 'SMTP não configurado corretamente. Verifique o console do servidor para o link de reset.'
            : 'Link de reset gerado. Verifique o console do servidor para o link (modo desenvolvimento).',
          devMode: true,
          resetUrl: emailResult.resetUrl, // Apenas em desenvolvimento
        });
      } else {
        res.json({
          success: true,
          message: 'Email de reset de senha enviado com sucesso',
        });
      }
    } catch (error) {
      // Se falhar ao enviar email, limpar os tokens
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Erro ao enviar email:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email. Verifique a configuração SMTP ou consulte o console do servidor.',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação de reset de senha',
      error: error.message,
    });
  }
};

// @desc    Resetar senha
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    // Hash do token para buscar no banco
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Buscar usuário com token válido e não expirado
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite um novo reset de senha.',
      });
    }

    // Validar nova senha
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Senha deve ter no mínimo 6 caracteres',
      });
    }

    // Atualizar senha e INVALIDAR token (prevenir reutilização)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Log de reset de senha bem-sucedido
    try {
      const { logSecurityEvent } = await import('../utils/securityLogger.js');
      logSecurityEvent('PASSWORD_RESET_SUCCESS', {
        userId: user._id.toString(),
        email: user.email,
      });
    } catch (logError) {
      // Se falhar o log, continuar normalmente
    }

    // Gerar token para login automático
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso. Você será redirecionado.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha',
      error: error.message,
    });
  }
};

// @desc    Verificar email do usuário
// @route   GET /api/auth/verify-email/:verificationToken
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { verificationToken } = req.params;

    // Hash do token para buscar no banco
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Buscar usuário com token válido e não expirado
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite um novo email de verificação.',
      });
    }

    // Verificar email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Gerar token para login automático
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Email verificado com sucesso! Você será redirecionado.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar email',
      error: error.message,
    });
  }
};

// @desc    Reenviar email de verificação
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuário
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).select('+emailVerificationToken +emailVerificationExpire');

    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      return res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de verificação.',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email já foi verificado.',
      });
    }

    // Gerar novo token de verificação
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      // Enviar email
      const emailResult = await sendVerificationEmail(user.email, verificationToken);

      res.json({
        success: true,
        message: emailResult.devMode 
          ? 'Link de verificação gerado. Verifique o console do servidor.'
          : 'Email de verificação enviado com sucesso',
        verificationUrl: emailResult.devMode ? emailResult.verificationUrl : undefined,
      });
    } catch (error) {
      // Se falhar ao enviar email, limpar os tokens
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Erro ao enviar email:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email. Tente novamente mais tarde.',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação de reenvio',
      error: error.message,
    });
  }
};
