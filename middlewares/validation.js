import { body, validationResult } from 'express-validator';

// Middleware para tratar erros de validação
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erros de validação',
      errors: errors.array(),
    });
  }
  next();
};

// Validações para registro de usuário
export const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  handleValidationErrors,
];

// Validações para login
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  handleValidationErrors,
];

// Validações para produto
export const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do produto deve ter entre 2 e 100 caracteres'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Preço deve ser um número positivo'),
  body('costPrice')
    .isFloat({ min: 0 })
    .withMessage('Preço de custo deve ser um número positivo'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Estoque deve ser um número inteiro positivo'),
  handleValidationErrors,
];

// Validações para cliente
export const validateClient = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Telefone inválido'),
  handleValidationErrors,
];

// Validações para venda
export const validateSale = [
  body('client')
    .notEmpty()
    .withMessage('Cliente é obrigatório'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Venda deve ter pelo menos um item'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Produto é obrigatório em cada item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantidade deve ser um número inteiro positivo'),
  handleValidationErrors,
];

// Validações para material
export const validateMaterial = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do material deve ter entre 2 e 100 caracteres'),
  body('category')
    .isIn(['cone', 'cobertura', 'topping', 'embalagem', 'utensilio', 'outro'])
    .withMessage('Categoria inválida'),
  body('costPerUnit')
    .isFloat({ min: 0 })
    .withMessage('Custo por unidade deve ser um número positivo'),
  body('quantityInStock')
    .isFloat({ min: 0 })
    .withMessage('Quantidade em estoque deve ser um número positivo'),
  body('unit')
    .optional()
    .isIn(['unidade', 'kg', 'litro', 'pacote', 'caixa'])
    .withMessage('Unidade de medida inválida'),
  handleValidationErrors,
];

// Validações para criar usuário (admin)
export const validateCreateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('role')
    .optional()
    .isIn(['admin', 'vendedor', 'cliente'])
    .withMessage('Role inválida. Use: admin, vendedor ou cliente'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Telefone inválido'),
  handleValidationErrors,
];

// Validações para solicitar reset de senha
export const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  handleValidationErrors,
];

// Validações para resetar senha
export const validateResetPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  handleValidationErrors,
];