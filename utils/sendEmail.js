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
      // Configurações para melhorar entregabilidade
      tls: {
        // Não rejeitar certificados não autorizados (apenas se necessário)
        // Em produção, mantenha como true se possível
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
      // Pool de conexões para melhor performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
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
  // Usar FRONTEND_URL se configurada, senão usar fallback baseado no ambiente
  const frontendUrl = process.env.FRONTEND_URL || 
    (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' 
      ? 'https://guileless-jalebi-f1c07b.netlify.app' 
      : 'http://localhost:5173');
  
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
    
    // Configurar nome do remetente de forma mais profissional
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@financial-control.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Financial control';
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: process.env.SMTP_REPLY_TO || fromEmail,
      to: email,
      subject: 'Redefinição de Senha - Financial control',
      priority: 'high',
      // Headers para melhorar entregabilidade e evitar spam
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': process.env.FRONTEND_URL || 'https://guileless-jalebi-f1c07b.netlify.app',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #FFFFFF;
                margin: 0;
                padding: 20px;
                background-color: #2F3136;
              }
              .container {
                max-width: 600px;
                width: 100%;
                margin: 0 auto;
                background-color: #2F3136;
                padding: 30px;
                border-radius: 4px;
                border: 1px solid #36393F;
                box-sizing: border-box;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #FFFFFF;
                text-align: center;
              }
              .content {
                background-color: #202225;
                padding: 25px;
                border-radius: 4px;
                margin-bottom: 20px;
                border: 1px solid #36393F;
              }
              .content h2 {
                color: #FFFFFF;
                text-align: center;
                margin-top: 0;
                margin-bottom: 20px;
              }
              .content p {
                color: #FFFFFF;
                margin: 15px 0;
                text-align: left;
              }
              .button-container {
                text-align: center;
                margin: 25px 0;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #1E4FA1;
                color: #FFFFFF !important;
                text-decoration: none;
                border-radius: 4px;
                font-weight: 600;
                border: 1px solid #36393F;
                text-align: center;
                cursor: pointer;
              }
              .button:hover {
                background-color: #1a3d8a;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .warning strong {
                color: #856404;
              }
              .warning ul {
                color: #856404;
                margin: 10px 0;
                padding-left: 20px;
              }
              .warning li {
                margin: 5px 0;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #36393F;
                color: #FFFFFF;
                opacity: 0.7;
                font-size: 12px;
              }
              .token {
                background-color: #36393F;
                padding: 12px;
                border-radius: 4px;
                font-family: monospace;
                word-break: break-all;
                margin: 15px 0;
                color: #FFFFFF !important;
                border: 1px solid #36393F;
                text-align: center;
                font-size: 12px;
                line-height: 1.5;
              }
              .token a {
                color: #FFFFFF !important;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Financial control</div>
              </div>
              
              <div class="content">
                <h2>Redefinição de Senha</h2>
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                
                <div class="button-container">
                  <a href="${resetUrl}" class="button" style="color: #FFFFFF !important;">Redefinir Senha</a>
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
                <p>&copy; ${new Date().getFullYear()} Financial control. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Redefinição de Senha - Financial control
        
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
  // Usar FRONTEND_URL se configurada, senão usar fallback baseado no ambiente
  const frontendUrl = process.env.FRONTEND_URL || 
    (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' 
      ? 'https://guileless-jalebi-f1c07b.netlify.app' 
      : 'http://localhost:5173');
  
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
    
    // Configurar nome do remetente de forma mais profissional
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@financial-control.com';
    const fromName = process.env.SMTP_FROM_NAME || 'Financial control';
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: process.env.SMTP_REPLY_TO || fromEmail,
      to: email,
      subject: 'Verifique seu email - Financial control',
      priority: 'high',
      // Headers para melhorar entregabilidade e evitar spam
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': process.env.FRONTEND_URL || 'https://guileless-jalebi-f1c07b.netlify.app',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #FFFFFF;
                margin: 0;
                padding: 20px;
                background-color: #2F3136;
              }
              .container {
                max-width: 600px;
                width: 100%;
                margin: 0 auto;
                background-color: #2F3136;
                padding: 30px;
                border-radius: 4px;
                border: 1px solid #36393F;
                box-sizing: border-box;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #FFFFFF;
                text-align: center;
              }
              .content {
                background-color: #202225;
                padding: 25px;
                border-radius: 4px;
                margin-bottom: 20px;
                border: 1px solid #36393F;
              }
              .content h2 {
                color: #FFFFFF;
                text-align: center;
                margin-top: 0;
                margin-bottom: 20px;
              }
              .content p {
                color: #FFFFFF;
                margin: 15px 0;
                text-align: left;
              }
              .button-container {
                text-align: center;
                margin: 25px 0;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #1E4FA1;
                color: #FFFFFF !important;
                text-decoration: none;
                border-radius: 4px;
                font-weight: 600;
                border: 1px solid #36393F;
                text-align: center;
                cursor: pointer;
              }
              .button:hover {
                background-color: #1a3d8a;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .warning strong {
                color: #856404;
              }
              .warning ul {
                color: #856404;
                margin: 10px 0;
                padding-left: 20px;
              }
              .warning li {
                margin: 5px 0;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #36393F;
                color: #FFFFFF;
                opacity: 0.7;
                font-size: 12px;
              }
              .token {
                background-color: #36393F;
                padding: 12px;
                border-radius: 4px;
                font-family: monospace;
                word-break: break-all;
                margin: 15px 0;
                color: #FFFFFF !important;
                border: 1px solid #36393F;
                text-align: center;
                font-size: 12px;
                line-height: 1.5;
              }
              .token a {
                color: #FFFFFF !important;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Financial control</div>
              </div>
              
              <div class="content">
                <h2>Verifique seu Email</h2>
                <p>Olá,</p>
                <p>Obrigado por se registrar no nosso sistema!</p>
                <p>Clique no botão abaixo para verificar seu endereço de email:</p>
                
                <div class="button-container">
                  <a href="${verificationUrl}" class="button" style="color: #FFFFFF !important;">Verificar Email</a>
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
                <p>&copy; ${new Date().getFullYear()} Financial control. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Verifique seu Email - Financial control
        
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

