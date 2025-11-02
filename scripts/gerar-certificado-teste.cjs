#!/usr/bin/env node

/**
 * Script para gerar certificados digitais auto-assinados para teste
 * Utiliza OpenSSL para criar certificados no formato PFX/P12
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configurações padrão
const CONFIG = {
  keySize: 2048,
  validityDays: 365,
  country: 'BR',
  state: 'SP',
  city: 'São Paulo',
  organization: 'Teste Medicina',
  organizationalUnit: 'TI',
  commonName: 'Certificado Teste',
  email: 'teste@medicina.com',
  password: 'teste123'
};

class CertificateGenerator {
  constructor(outputDir = './certificados-teste') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  checkOpenSSL() {
    try {
      execSync('openssl version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error('❌ OpenSSL não encontrado. Por favor, instale o OpenSSL primeiro.');
      console.error('Windows: Baixe de https://slproweb.com/products/Win32OpenSSL.html');
      console.error('Linux/Mac: sudo apt-get install openssl ou brew install openssl');
      return false;
    }
  }

  generateCertificate(options = {}) {
    const config = { ...CONFIG, ...options };
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = `certificado-teste-${timestamp}`;
    
    const keyFile = path.join(this.outputDir, `${baseName}.key`);
    const crtFile = path.join(this.outputDir, `${baseName}.crt`);
    const pfxFile = path.join(this.outputDir, `${baseName}.pfx`);
    const infoFile = path.join(this.outputDir, `${baseName}-info.txt`);

    console.log('🔐 Gerando certificado digital de teste...');
    console.log(`📁 Diretório de saída: ${this.outputDir}`);

    try {
      // 1. Gerar chave privada
      console.log('1️⃣ Gerando chave privada...');
      const keyCommand = `openssl genrsa -out "${keyFile}" ${config.keySize}`;
      execSync(keyCommand, { stdio: 'pipe' });

      // 2. Gerar certificado auto-assinado
      console.log('2️⃣ Gerando certificado auto-assinado...');
      const subject = `/C=${config.country}/ST=${config.state}/L=${config.city}/O=${config.organization}/OU=${config.organizationalUnit}/CN=${config.commonName}/emailAddress=${config.email}`;
      
      const certCommand = `openssl req -new -x509 -key "${keyFile}" -out "${crtFile}" -days ${config.validityDays} -subj "${subject}"`;
      execSync(certCommand, { stdio: 'pipe' });

      // 3. Gerar arquivo PFX/P12
      console.log('3️⃣ Gerando arquivo PFX/P12...');
      const pfxCommand = `openssl pkcs12 -export -out "${pfxFile}" -inkey "${keyFile}" -in "${crtFile}" -passout pass:${config.password}`;
      execSync(pfxCommand, { stdio: 'pipe' });

      // 4. Gerar arquivo de informações
      console.log('4️⃣ Gerando arquivo de informações...');
      this.generateInfoFile(infoFile, config, {
        keyFile: path.basename(keyFile),
        crtFile: path.basename(crtFile),
        pfxFile: path.basename(pfxFile)
      });

      // 5. Limpar arquivos temporários (manter apenas o PFX e info)
      fs.unlinkSync(keyFile);
      fs.unlinkSync(crtFile);

      console.log('✅ Certificado gerado com sucesso!');
      console.log(`📄 Arquivo PFX: ${pfxFile}`);
      console.log(`📋 Informações: ${infoFile}`);
      console.log(`🔑 Senha: ${config.password}`);

      return {
        pfxFile,
        infoFile,
        password: config.password,
        config
      };

    } catch (error) {
      console.error('❌ Erro ao gerar certificado:', error.message);
      throw error;
    }
  }

  generateInfoFile(infoFile, config, files) {
    const info = `
CERTIFICADO DIGITAL DE TESTE
============================

📅 Data de Geração: ${new Date().toLocaleString('pt-BR')}
🔐 Tipo: Certificado Auto-Assinado para Teste
⏰ Validade: ${config.validityDays} dias

ARQUIVOS GERADOS:
================
📄 Certificado PFX/P12: ${files.pfxFile}
🔑 Senha do Certificado: ${config.password}

DADOS DO CERTIFICADO:
====================
🌍 País: ${config.country}
🏛️ Estado: ${config.state}
🏙️ Cidade: ${config.city}
🏢 Organização: ${config.organization}
🏬 Unidade Organizacional: ${config.organizationalUnit}
👤 Nome Comum: ${config.commonName}
📧 Email: ${config.email}

COMO USAR:
==========
1. Use o arquivo ${files.pfxFile} para importar o certificado
2. A senha para importação é: ${config.password}
3. Este certificado é apenas para TESTE - não use em produção
4. Para usar no sistema, importe o arquivo PFX no navegador ou aplicação

IMPORTAÇÃO NO WINDOWS:
=====================
1. Clique duas vezes no arquivo ${files.pfxFile}
2. Siga o assistente de importação
3. Digite a senha: ${config.password}
4. Escolha "Armazenamento Automático" ou "Pessoal"

IMPORTAÇÃO NO NAVEGADOR:
=======================
Chrome/Edge:
- Configurações > Privacidade e Segurança > Segurança > Gerenciar Certificados
- Pessoal > Importar > Selecione o arquivo PFX

Firefox:
- Configurações > Privacidade e Segurança > Certificados > Ver Certificados
- Seus Certificados > Importar

⚠️  AVISO IMPORTANTE:
Este é um certificado de TESTE auto-assinado. Não deve ser usado em ambiente de produção.
Para uso em produção, obtenha um certificado de uma Autoridade Certificadora confiável.
`;

    fs.writeFileSync(infoFile, info, 'utf8');
  }

  listCertificates() {
    const files = fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.pfx'))
      .map(file => {
        const fullPath = path.join(this.outputDir, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          path: fullPath,
          created: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created - a.created);

    if (files.length === 0) {
      console.log('📭 Nenhum certificado encontrado.');
      return [];
    }

    console.log('📋 Certificados disponíveis:');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   📅 Criado: ${file.created.toLocaleString('pt-BR')}`);
      console.log(`   📏 Tamanho: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`   📁 Caminho: ${file.path}`);
      console.log('');
    });

    return files;
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const generator = new CertificateGenerator();

  if (!generator.checkOpenSSL()) {
    process.exit(1);
  }

  switch (command) {
    case 'gerar':
    case 'generate':
      const options = {};
      
      // Parse argumentos opcionais
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        
        switch (key) {
          case '--nome':
          case '--name':
            options.commonName = value;
            break;
          case '--email':
            options.email = value;
            break;
          case '--senha':
          case '--password':
            options.password = value;
            break;
          case '--dias':
          case '--days':
            options.validityDays = parseInt(value);
            break;
          case '--organizacao':
          case '--organization':
            options.organization = value;
            break;
        }
      }

      generator.generateCertificate(options);
      break;

    case 'listar':
    case 'list':
      generator.listCertificates();
      break;

    case 'ajuda':
    case 'help':
    case '--help':
    case '-h':
    default:
      console.log(`
🔐 GERADOR DE CERTIFICADOS DIGITAIS DE TESTE
===========================================

USO:
  node gerar-certificado-teste.js <comando> [opções]

COMANDOS:
  gerar, generate     Gera um novo certificado de teste
  listar, list        Lista certificados existentes
  ajuda, help         Mostra esta ajuda

OPÇÕES PARA GERAR:
  --nome <nome>           Nome comum do certificado (padrão: "Certificado Teste")
  --email <email>         Email do certificado (padrão: "teste@medicina.com")
  --senha <senha>         Senha do certificado (padrão: "teste123")
  --dias <dias>           Dias de validade (padrão: 365)
  --organizacao <org>     Nome da organização (padrão: "Teste Medicina")

EXEMPLOS:
  node gerar-certificado-teste.js gerar
  node gerar-certificado-teste.js gerar --nome "Dr. João Silva" --email "joao@clinica.com"
  node gerar-certificado-teste.js listar

ARQUIVOS GERADOS:
  📄 certificado-teste-YYYY-MM-DD.pfx  - Certificado no formato PFX/P12
  📋 certificado-teste-YYYY-MM-DD-info.txt - Informações e instruções

⚠️  IMPORTANTE: Estes certificados são apenas para TESTE!
`);
      break;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = CertificateGenerator;