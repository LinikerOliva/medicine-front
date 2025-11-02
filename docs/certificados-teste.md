# Gerador de Certificados Digitais de Teste

Este documento explica como usar o gerador de certificados digitais auto-assinados para teste no sistema de medicina.

## 📋 Visão Geral

O gerador de certificados permite criar certificados digitais auto-assinados no formato PFX/P12 para uso em desenvolvimento e testes. Estes certificados **NÃO devem ser usados em produção**.

## 🔧 Pré-requisitos

### OpenSSL
O script requer o OpenSSL instalado no sistema:

**Windows:**
- Baixe e instale de: https://slproweb.com/products/Win32OpenSSL.html
- Ou use o Chocolatey: `choco install openssl`
- Ou use o Scoop: `scoop install openssl`

**Linux/Ubuntu:**
```bash
sudo apt-get install openssl
```

**macOS:**
```bash
brew install openssl
```

### Node.js
O script é executado com Node.js (já disponível no projeto).

## 🚀 Como Usar

### Comandos Disponíveis

```bash
# Mostrar ajuda
node scripts/gerar-certificado-teste.cjs ajuda

# Gerar certificado com configurações padrão
node scripts/gerar-certificado-teste.cjs gerar

# Gerar certificado personalizado
node scripts/gerar-certificado-teste.cjs gerar --nome "Dr. João Silva" --email "joao@clinica.com"

# Listar certificados existentes
node scripts/gerar-certificado-teste.cjs listar
```

### Opções Disponíveis

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `--nome` | Nome comum do certificado | "Certificado Teste" |
| `--email` | Email do certificado | "teste@medicina.com" |
| `--senha` | Senha do certificado | "teste123" |
| `--dias` | Dias de validade | 365 |
| `--organizacao` | Nome da organização | "Teste Medicina" |

### Exemplos Práticos

```bash
# Certificado para médico específico
node scripts/gerar-certificado-teste.cjs gerar \
  --nome "Dr. Maria Santos" \
  --email "maria.santos@clinica.com.br" \
  --organizacao "Clínica São Paulo"

# Certificado com validade de 30 dias
node scripts/gerar-certificado-teste.cjs gerar \
  --nome "Teste Curto" \
  --dias 30

# Certificado com senha personalizada
node scripts/gerar-certificado-teste.cjs gerar \
  --nome "Dr. Admin" \
  --senha "minhasenha123"
```

## 📁 Arquivos Gerados

O script cria os seguintes arquivos no diretório `certificados-teste/`:

### 1. Arquivo PFX/P12
- **Nome:** `certificado-teste-YYYY-MM-DDTHH-MM-SS.pfx`
- **Formato:** PKCS#12 (PFX/P12)
- **Conteúdo:** Certificado + chave privada
- **Uso:** Importação no sistema/navegador

### 2. Arquivo de Informações
- **Nome:** `certificado-teste-YYYY-MM-DDTHH-MM-SS-info.txt`
- **Conteúdo:** Instruções detalhadas e informações do certificado
- **Uso:** Referência e documentação

## 🔐 Como Importar o Certificado

### No Windows

1. **Duplo clique** no arquivo `.pfx`
2. Siga o **Assistente de Importação de Certificados**
3. Digite a senha (padrão: `teste123`)
4. Escolha **"Armazenamento Automático"** ou **"Pessoal"**
5. Clique em **"Concluir"**

### No Chrome/Edge

1. Vá para **Configurações**
2. **Privacidade e Segurança** → **Segurança**
3. **Gerenciar Certificados**
4. Aba **"Pessoal"** → **"Importar"**
5. Selecione o arquivo `.pfx`
6. Digite a senha

### No Firefox

1. Vá para **Configurações**
2. **Privacidade e Segurança** → **Certificados**
3. **Ver Certificados**
4. Aba **"Seus Certificados"** → **"Importar"**
5. Selecione o arquivo `.pfx`
6. Digite a senha

## 🧪 Testando o Certificado

### 1. Verificar Importação
Após importar, verifique se o certificado aparece na lista de certificados do navegador.

### 2. Testar Assinatura Digital
1. Acesse a funcionalidade de assinatura no sistema
2. Selecione o certificado importado
3. Digite a senha quando solicitado
4. Verifique se a assinatura é aplicada corretamente

### 3. Verificar Dados do Certificado
- **Nome:** Deve corresponder ao especificado
- **Email:** Deve corresponder ao especificado
- **Validade:** Verificar datas de início e fim
- **Emissor:** Deve ser auto-assinado

## ⚠️ Avisos Importantes

### 🚫 NÃO Use em Produção
- Estes certificados são **apenas para teste**
- Não possuem validação de autoridade certificadora
- Navegadores mostrarão avisos de segurança
- Para produção, use certificados de AC confiável

### 🔒 Segurança
- Mantenha as senhas seguras
- Não compartilhe certificados de teste
- Delete certificados antigos regularmente
- Use senhas fortes em produção

### 📝 Limitações
- Certificados auto-assinados
- Não reconhecidos por navegadores como confiáveis
- Apenas para desenvolvimento/teste
- Validade limitada (padrão: 1 ano)

## 🛠️ Solução de Problemas

### OpenSSL não encontrado
```
❌ OpenSSL não encontrado. Por favor, instale o OpenSSL primeiro.
```
**Solução:** Instale o OpenSSL conforme instruções nos pré-requisitos.

### Erro de permissão
```
Error: EACCES: permission denied
```
**Solução:** Execute o terminal como administrador ou ajuste permissões da pasta.

### Certificado não aparece no navegador
**Soluções:**
1. Verifique se importou na aba correta ("Pessoal")
2. Reinicie o navegador
3. Verifique se a senha está correta
4. Tente importar novamente

### Erro na assinatura digital
**Soluções:**
1. Verifique se o certificado está válido (não expirado)
2. Confirme se a senha está correta
3. Verifique se o certificado tem chave privada
4. Tente gerar um novo certificado

## 📞 Suporte

Para problemas relacionados ao gerador de certificados:

1. Verifique os logs de erro no terminal
2. Confirme se todos os pré-requisitos estão instalados
3. Teste com configurações padrão primeiro
4. Consulte a documentação do OpenSSL se necessário

## 🔄 Atualizações

Para manter o gerador atualizado:

1. Verifique se há novas versões do OpenSSL
2. Teste regularmente com diferentes navegadores
3. Mantenha a documentação atualizada
4. Considere feedback dos desenvolvedores

---

**Lembre-se:** Este é um utilitário para desenvolvimento. Para uso em produção, sempre utilize certificados de autoridades certificadoras confiáveis.