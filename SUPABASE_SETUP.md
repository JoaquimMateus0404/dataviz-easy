# Configuração do Supabase para DataViz Easy

## 1. Criando um projeto Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha uma organização
5. Dê um nome ao projeto (ex: "dataviz-easy")
6. Defina uma senha segura para o banco de dados
7. Escolha uma região próxima
8. Clique em "Create new project"

## 2. Configurando as tabelas

1. Após o projeto ser criado, vá para a aba "SQL Editor"
2. Cole o conteúdo do arquivo `scripts/001_create_tables.sql`
3. Clique em "Run" para executar o script
4. Isso criará todas as tabelas necessárias com as políticas de segurança

## 3. Obtendo as credenciais

1. Vá para "Settings" > "API" no menu lateral
2. Copie a "Project URL" 
3. Copie a "anon public" key
4. Cole essas informações no arquivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_project_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## 4. Habilitando autenticação

1. Vá para "Authentication" > "Settings"
2. Habilite o provedor de email se ainda não estiver habilitado
3. Configure URLs de redirecionamento se necessário

## Status atual

✅ Credenciais configuradas no .env.local
❓ Tabelas podem não estar criadas ainda
❓ Teste de autenticação pendente

## Próximos passos

1. Execute o script SQL no Supabase
2. Teste o upload de arquivo para verificar se as tabelas funcionam
3. Se ainda houver erros, verifique os logs detalhados no terminal
