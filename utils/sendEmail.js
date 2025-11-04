import nodemailer from 'nodemailer';

// Criar transportador de email
const createTransporter = () => {
  // Se houver configuração SMTP nas variáveis de ambiente, usar
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Modo de desenvolvimento: usar Ethereal Email (gerador de emails de teste)
  // Em produção, configure SMTP real
  console.log('⚠️  SMTP não configurado. Usando modo de desenvolvimento (sem envio real).');
  console.log('📧 Configure SMTP_HOST, SMTP_USER e SMTP_PASS no .env para envio real.');
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user',
      pass: 'ethereal.pass',
    },
  });
};

// Enviar email de reset de senha
export const sendPasswordResetEmail = async (email, resetToken) => {
  // Determinar URL do frontend corretamente
  let frontendUrl = process.env.FRONTEND_URL;
  
  // Se não estiver configurada, tentar detectar do ambiente
  if (!frontendUrl || frontendUrl === 'http://localhost:5173') {
    // Em produção no Vercel, usar URL conhecida do Netlify
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
      frontendUrl = 'https://controls-finance-app-v001.netlify.app';
    } else {
      frontendUrl = 'http://localhost:5173';
    }
  }
  
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
  
  console.log('🔗 Link de reset gerado:', resetUrl);
  
  // Verificar se SMTP está configurado
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    // Modo desenvolvimento: apenas logar
    console.log('📧 [DEV] Email de reset de senha (não enviado - SMTP não configurado)');
    console.log(`📧 [DEV] Link de reset: ${resetUrl}`);
    console.log(`📧 [DEV] Para: ${email}`);
    return { success: true, devMode: true, resetUrl };
  }

  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sistema-vendas.com',
      to: email,
      subject: 'Redefinição de Senha - Sistema de Vendas',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 10px;
                border: 1px solid #ddd;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #3b7bff;
              }
              .content {
                background-color: #fff;
                padding: 25px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #3b7bff;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .button:hover {
                background-color: #2d5fd1;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 12px;
              }
              .token {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                font-family: monospace;
                word-break: break-all;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🔐 Sistema de Vendas</div>
              </div>
              
              <div class="content">
                <h2>Redefinição de Senha</h2>
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Redefinir Senha</a>
                </div>
                
                <p>Ou copie e cole o link abaixo no seu navegador:</p>
                <div class="token">${resetUrl}</div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                    <li>Este link expira em <strong>10 minutos</strong></li>
                    <li>Se você não solicitou esta redefinição, ignore este email</li>
                    <li>Nunca compartilhe este link com outras pessoas</li>
                  </ul>
                </div>
              </div>
              
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} Sistema de Vendas. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Redefinição de Senha - Sistema de Vendas
        
        Olá,
        
        Recebemos uma solicitação para redefinir a senha da sua conta.
        
        Acesse o link abaixo para criar uma nova senha:
        ${resetUrl}
        
        IMPORTANTE:
        - Este link expira em 10 minutos
        - Se você não solicitou esta redefinição, ignore este email
        - Nunca compartilhe este link com outras pessoas
        
        Este é um email automático, por favor não responda.
      `,
    };

    // Tentar enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de reset de senha enviado: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Se falhar por autenticação ou configuração SMTP, usar modo desenvolvimento
    if (error.code === 'EAUTH' || error.responseCode === 535 || error.message.includes('Authentication failed') || error.message.includes('Invalid login')) {
      console.error('❌ Erro de autenticação SMTP. Credenciais inválidas ou expiradas.');
      console.log('📧 [DEV] Usando modo desenvolvimento devido a erro de SMTP');
      console.log(`📧 [DEV] Link de reset: ${resetUrl}`);
      console.log(`📧 [DEV] Para: ${email}`);
      console.log('⚠️  Configure corretamente SMTP_USER e SMTP_PASS no .env para envio real');
      return { success: true, devMode: true, resetUrl, smtpError: true };
    }
    
    console.error('❌ Erro ao enviar email:', error.message);
    throw new Error('Erro ao enviar email de reset de senha');
  }
};

// Enviar email de verificação
export const sendVerificationEmail = async (email, verificationToken) => {
  // Determinar URL do frontend corretamente
  let frontendUrl = process.env.FRONTEND_URL;
  
  // Se não estiver configurada, tentar detectar do ambiente
  if (!frontendUrl || frontendUrl === 'http://localhost:5173') {
    // Em produção no Vercel, usar URL conhecida do Netlify
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
      frontendUrl = 'https://controls-finance-app-v001.netlify.app';
    } else {
      frontendUrl = 'http://localhost:5173';
    }
  }
  
  const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;
  
  console.log('🔗 Link de verificação gerado:', verificationUrl);
  
  // Verificar se SMTP está configurado
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    // Modo desenvolvimento: apenas logar
    console.log('📧 [DEV] Email de verificação (não enviado - SMTP não configurado)');
    console.log(`📧 [DEV] Link de verificação: ${verificationUrl}`);
    console.log(`📧 [DEV] Para: ${email}`);
    return { success: true, devMode: true, verificationUrl };
  }

  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sistema-vendas.com',
      to: email,
      subject: 'Verifique seu email - Sistema de Vendas',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 10px;
                border: 1px solid #ddd;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #3b7bff;
              }
              .content {
                background-color: #fff;
                padding: 25px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #3b7bff;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .button:hover {
                background-color: #2d5fd1;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 12px;
              }
              .token {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                font-family: monospace;
                word-break: break-all;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">✉️ Sistema de Vendas</div>
              </div>
              
              <div class="content">
                <h2>Verifique seu Email</h2>
                <p>Olá,</p>
                <p>Obrigado por se registrar no nosso sistema!</p>
                <p>Clique no botão abaixo para verificar seu endereço de email:</p>
                
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verificar Email</a>
                </div>
                
                <p>Ou copie e cole o link abaixo no seu navegador:</p>
                <div class="token">${verificationUrl}</div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                    <li>Este link expira em <strong>24 horas</strong></li>
                    <li>Se você não se registrou, ignore este email</li>
                    <li>Verifique seu email para continuar usando o sistema</li>
                  </ul>
                </div>
              </div>
              
              <div class="footer">
                <p>Este é um email automático, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} Sistema de Vendas. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Verifique seu Email - Sistema de Vendas
        
        Olá,
        
        Obrigado por se registrar no nosso sistema!
        
        Acesse o link abaixo para verificar seu endereço de email:
        ${verificationUrl}
        
        IMPORTANTE:
        - Este link expira em 24 horas
        - Se você não se registrou, ignore este email
        - Verifique seu email para continuar usando o sistema
        
        Este é um email automático, por favor não responda.
      `,
    };

    // Tentar enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de verificação enviado: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Se falhar por autenticação ou configuração SMTP, usar modo desenvolvimento
    if (error.code === 'EAUTH' || error.responseCode === 535 || error.message.includes('Authentication failed') || error.message.includes('Invalid login')) {
      console.error('❌ Erro de autenticação SMTP. Credenciais inválidas ou expiradas.');
      console.log('📧 [DEV] Usando modo desenvolvimento devido a erro de SMTP');
      console.log(`📧 [DEV] Link de verificação: ${verificationUrl}`);
      console.log(`📧 [DEV] Para: ${email}`);
      console.log('⚠️  Configure corretamente SMTP_USER e SMTP_PASS no .env para envio real');
      return { success: true, devMode: true, verificationUrl, smtpError: true };
    }
    
    console.error('❌ Erro ao enviar email:', error.message);
    throw new Error('Erro ao enviar email de verificação');
  }
};

