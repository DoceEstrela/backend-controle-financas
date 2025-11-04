# Guia para Evitar Emails na Pasta de Spam

Este documento explica como configurar o sistema para evitar que emails caiam na pasta de spam.

## 📋 Configurações Necessárias

### 1. Variáveis de Ambiente no Backend

Configure as seguintes variáveis no `.env` ou no Vercel:

```env
# Configuração SMTP básica
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-gmail

# Email do remetente (IMPORTANTE: use um email válido do mesmo domínio)
SMTP_FROM=noreply@seudominio.com
SMTP_FROM_NAME=Sistema de Vendas

# Email para respostas (opcional)
SMTP_REPLY_TO=suporte@seudominio.com
```

### 2. Configuração de Domínio (SPF, DKIM, DMARC)

Para melhorar a entregabilidade, configure os registros DNS do seu domínio:

#### **SPF (Sender Policy Framework)**

Adicione um registro TXT no DNS do seu domínio:

```
Tipo: TXT
Nome: @ (ou seu domínio)
Valor: v=spf1 include:_spf.google.com ~all
```

Se estiver usando Gmail, o valor acima permite que o Gmail envie emails em nome do seu domínio.

#### **DKIM (DomainKeys Identified Mail)**

O DKIM é gerado automaticamente pelo seu provedor de email (Gmail, SendGrid, etc.).

- **Gmail**: Ative nas configurações de segurança e copie a chave pública para o DNS
- **SendGrid**: Gera automaticamente e fornece instruções
- **Outros provedores**: Consulte a documentação

#### **DMARC (Domain-based Message Authentication)**

Adicione um registro TXT no DNS:

```
Tipo: TXT
Nome: _dmarc
Valor: v=DMARC1; p=quarantine; rua=mailto:seu-email@seudominio.com
```

**Níveis de política (`p`):**
- `none`: Apenas monitora (início)
- `quarantine`: Emails suspeitos vão para spam
- `reject`: Rejeita emails suspeitos (produção)

### 3. Recomendações por Provedor

#### **Gmail**

1. **Ative a verificação em duas etapas** na sua conta Google
2. **Gere uma "Senha de App"**:
   - Acesse: https://myaccount.google.com/apppasswords
   - Crie uma senha específica para o aplicativo
   - Use essa senha no `SMTP_PASS`

3. **Configure SPF** (se usar domínio próprio):
   ```
   v=spf1 include:_spf.google.com ~all
   ```

#### **SendGrid**

1. **Crie uma API Key** no painel do SendGrid
2. **Configure**:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=sua-api-key-aqui
   ```

3. **Verifique seu domínio** no SendGrid
4. **Configure SPF, DKIM e DMARC** conforme instruções do SendGrid

#### **Outros Provedores**

- **Amazon SES**: Requer verificação de domínio e IP
- **Mailgun**: Requer verificação de domínio
- **Brevo (ex-Sendinblue)**: Configuração similar ao SendGrid

### 4. Boas Práticas no Conteúdo do Email

O sistema já implementa:

✅ **Headers apropriados** (X-Priority, Importance)
✅ **List-Unsubscribe** (obrigatório em alguns países)
✅ **Conteúdo HTML bem formatado**
✅ **Versão texto** do email
✅ **From/Reply-To** configuráveis

### 5. Verificação de Entregabilidade

Use ferramentas para testar:

- **Mail-Tester**: https://www.mail-tester.com/
- **MXToolbox**: https://mxtoolbox.com/
- **Google Postmaster Tools**: https://postmaster.google.com/

### 6. Checklist de Configuração

- [ ] SMTP configurado com credenciais válidas
- [ ] `SMTP_FROM` usa um domínio válido (não `noreply@sistema-vendas.com`)
- [ ] SPF configurado no DNS
- [ ] DKIM configurado (se suportado pelo provedor)
- [ ] DMARC configurado (recomendado)
- [ ] Domínio verificado no provedor de email
- [ ] Testado com Mail-Tester (score > 8/10)

### 7. Problemas Comuns

#### **Email ainda cai no spam**

1. Verifique se o domínio do `SMTP_FROM` corresponde ao domínio configurado no DNS
2. Verifique se SPF/DKIM estão configurados corretamente
3. Aguarde 24-48h após configurar DNS (propagação)
4. Use um domínio próprio (não `@gmail.com` ou `@hotmail.com`)

#### **Erro de autenticação SMTP**

- Gmail: Use "Senha de App", não a senha normal
- Verifique se a porta está correta (587 para TLS, 465 para SSL)
- Verifique se `SMTP_SECURE` está correto

### 8. Melhorias Futuras

Para máxima entregabilidade, considere:

- Usar um serviço profissional (SendGrid, Mailgun, Amazon SES)
- Configurar domínio próprio com DNS completo
- Implementar warming de IP (para volumes altos)
- Monitorar métricas (bounce rate, spam complaints)

## 📞 Suporte

Se continuar tendo problemas, verifique:
1. Logs do servidor para erros SMTP
2. Status da verificação de domínio no provedor
3. Score no Mail-Tester

