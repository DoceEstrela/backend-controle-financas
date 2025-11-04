# Correção da URL do Frontend

## Problema
O email está sendo enviado com a URL antiga: `https://controls-finance-app-v001.netlify.app`

## Solução
A variável `FRONTEND_URL` no Vercel precisa ser atualizada.

## Como Corrigir

### 1. Acesse o Vercel Dashboard
- Vá em: https://vercel.com/dashboard
- Selecione seu projeto: `backend-controle-financas`

### 2. Configure a Variável de Ambiente
1. Vá em **Settings** → **Environment Variables**
2. Procure por `FRONTEND_URL`
3. **Atualize** o valor para: `https://guileless-jalebi-f1c07b.netlify.app`
4. Marque **todos os ambientes**: Production, Preview, Development
5. Clique em **Save**

### 3. Faça um Novo Deploy
Após atualizar a variável:
- Vá em **Deployments**
- Clique em **Redeploy** no último deploy, OU
- Faça um novo commit/push para trigger automático

## Verificação
Após o deploy, verifique os logs do Vercel:
- Deve aparecer: `🔗 Link de verificação gerado: https://guileless-jalebi-f1c07b.netlify.app/verify-email/...`

## Nota Importante
O código já tem um fallback para usar `https://guileless-jalebi-f1c07b.netlify.app` se `FRONTEND_URL` não estiver configurada, MAS se `FRONTEND_URL` estiver configurada com a URL antiga, ela terá precedência.

**Por isso é importante atualizar a variável no Vercel!**

