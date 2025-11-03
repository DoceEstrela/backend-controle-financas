# Correção do Erro de CORS

## Problema

O erro de CORS ocorria porque o backend estava configurado para aceitar apenas `http://localhost:5173`, mas em produção o frontend está hospedado no Netlify em `https://controls-finance-app-v001.netlify.app`.

## Solução Implementada

### 1. CORS Configurado para Múltiplas Origens

O código agora aceita:
- `http://localhost:5173` (desenvolvimento local)
- `http://localhost:3000` (alternativa de desenvolvimento)
- URL configurada em `FRONTEND_URL` (produção)

### 2. Configuração Necessária no Vercel

**IMPORTANTE**: Você precisa configurar a variável de ambiente `FRONTEND_URL` no Vercel:

1. Acesse o painel do Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione ou edite a variável:
   - **Nome**: `FRONTEND_URL`
   - **Valor**: `https://controls-finance-app-v001.netlify.app`
   - **Environment**: Marque **Production**, **Preview**, e **Development**

### 3. Como Funciona Agora

- **Desenvolvimento local**: Permite `localhost:5173` e `localhost:3000` automaticamente
- **Produção**: Verifica se a origem da requisição está na lista permitida:
  - Se estiver, permite
  - Se não estiver e estiver em desenvolvimento, permite (para debug)
  - Se não estiver e estiver em produção, bloqueia

## Após Configurar

1. Faça deploy novamente no Vercel (ou aguarde o redeploy automático)
2. O erro de CORS deve ser resolvido

## Verificação

Após configurar, você pode testar fazendo uma requisição do frontend. O erro de CORS não deve mais aparecer.

