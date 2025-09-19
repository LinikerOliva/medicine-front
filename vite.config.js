// filepath: vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiBasePath = env.VITE_API_BASE_PATH || '/api';
  const enableMockReceita = String(env.VITE_MOCK_RECEITA ?? 'true').toLowerCase() !== 'false';
  const enableMockMedicoCert = String(env.VITE_MOCK_MEDICO_CERTIFICADO ?? 'true').toLowerCase() !== 'false';

  // Plugin para mockar endpoints de geração de receita em desenvolvimento
  const mockReceitaPlugin = () => ({
    name: 'mock-receita-endpoints',
    apply: 'serve',
    configureServer(server) {
      const text = (res, status, body, headers = {}) => {
        res.statusCode = status;
        Object.entries({ 'Content-Type': 'text/plain; charset=utf-8', ...headers }).forEach(([k, v]) => res.setHeader(k, v));
        res.end(body);
      };

      const readJsonBody = async (req) => {
        return new Promise((resolve) => {
          const chunks = [];
          req.on('data', (c) => chunks.push(Buffer.from(c)));
          req.on('end', () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf-8');
              const obj = raw ? JSON.parse(raw) : {};
              resolve(obj || {});
            } catch {
              resolve({});
            }
          });
          req.on('error', () => resolve({}));
        });
      };

      server.middlewares.use(async (req, res, next) => {
        try {
          const method = (req.method || 'GET').toUpperCase();
          const url = req.url || '/';
          const pathname = url.split('?')[0];

          const matchList = new Set([
            `${apiBasePath.replace(/\/?$/, '/') }receitas/gerar-documento/`,
            `${apiBasePath.replace(/\/?$/, '/') }receitas/gerar/`,
            `${apiBasePath.replace(/\/?$/, '/') }receitas/pdf/`,
          ]);

          if (!matchList.has(pathname)) return next();

          if (!['POST', 'GET'].includes(method)) {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST');
            return res.end('Method Not Allowed');
          }

          // Coletar dados do request (JSON no body ou query string)
          let data = {};
          if (method === 'POST') {
            data = await readJsonBody(req);
          } else {
            try {
              const u = new URL(url, 'http://localhost');
              data = Object.fromEntries(u.searchParams.entries());
            } catch { data = {}; }
          }

          // Geração de PDF simples com pdf-lib
          const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595.28, 841.89]); // A4 em pontos
          const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

          const draw = (textVal, x, y, size = 12) => {
            if (!textVal && textVal !== 0) return;
            page.drawText(String(textVal), { x, y, size, font, color: rgb(0, 0, 0) });
          };

          const title = 'Prescrição Médica';
          draw(title, 200, 800, 18);

          const nome = data.nome_paciente || 'Paciente';
          const idade = data.idade ? `${data.idade} anos` : '';
          const rg = data.rg || '';
          const nasc = data.data_nascimento || '';
          const meds = data.medicamento || data.medicamentos || '';
          const posologia = data.posologia || '';
          const validade = data.validade_receita || data.validade || '';
          const medico = data.medico || 'Dr(a).';
          const crm = data.crm || '';
          const obs = data.observacoes || '';

          let y = 760;
          draw(`Nome: ${nome}`, 50, y); y -= 18;
          draw(`Idade: ${idade}`, 50, y); y -= 18;
          draw(`RG: ${rg}`, 50, y); y -= 18;
          draw(`Nascimento: ${nasc}`, 50, y); y -= 28;
          draw('Prescrição:', 50, y); y -= 18;
          draw(meds, 60, y); y -= 18;
          if (posologia) { draw(`Posologia: ${posologia}`, 60, y); y -= 18; }
          y -= 10;
          draw(`Validade: ${validade}`, 50, y); y -= 28;
          if (obs) { draw(`Observações: ${obs}`, 50, y); y -= 28; }
          draw(`Emitido por: ${medico} • CRM ${crm}`, 50, y); y -= 18;
          draw('Assinado digitalmente (mock dev)', 50, y, 10);

          const pdfBytes = await pdfDoc.save();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/pdf');
          // inline para permitir pré-visualização/impressão
          res.setHeader('Content-Disposition', 'inline; filename="Receita_Medica.pdf"');
          return res.end(Buffer.from(pdfBytes));
        } catch (e) {
          // Em caso de erro inesperado, não bloquear o proxy
          try { console.error('[mock-receita] erro:', e); } catch {}
          return text(res, 500, 'Erro ao gerar PDF mock');
        }
      });
    },
  });

  // Plugin para mockar endpoints de Certificado Digital do Médico em desenvolvimento
  const mockMedicoCertificadoPlugin = () => ({
    name: 'mock-medico-certificado',
    apply: 'serve',
    configureServer(server) {
      // Estado em memória do certificado atual (apenas para DEV)
      let currentCert = null;

      const json = (res, status, obj) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(obj));
      };

      const readRawBody = async (req) => new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(Buffer.from(c)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', () => resolve(Buffer.alloc(0)));
      });

      server.middlewares.use(async (req, res, next) => {
        try {
          const method = (req.method || 'GET').toUpperCase();
          const url = req.url || '/';
          const pathname = url.split('?')[0];

          const base = apiBasePath.replace(/\/?$/, '/');

          // MOCK: Endpoints de Certificado do Médico
          const certTargets = new Set([
            `${base}medicos/me/certificado/`,
            `${base}medicos/certificado/`,
            `${base}certificados/`,
            '/medicos/me/certificado/',
            '/medicos/certificado/',
            '/certificados/',
          ]);
          const idCertRegexes = [
            new RegExp(`^${base.replace(/\/$/, '')}/?medicos/[^/]+/(certificado|assinatura)/$`),
            /^\/medicos\/[^/]+\/(certificado|assinatura)\/$/,
          ];

          const isCertPath = certTargets.has(pathname) || idCertRegexes.some((r) => r.test(pathname));
          if (isCertPath) {
            if (method === 'GET') {
              const info = currentCert
                ? currentCert
                : { exists: false, message: 'Nenhum certificado cadastrado (MOCK DEV)'};
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(info));
              return;
            }

            if (['POST','PUT','PATCH'].includes(method)) {
              // Aceita qualquer multipart/form-data; não precisamos parsear o arquivo para o mock
              const now = Date.now();
              const addDays = (n) => new Date(now + n*24*60*60*1000).toISOString();
              currentCert = {
                id: 'mock-cert',
                exists: true,
                subject_name: 'Dr. Mock',
                issuer_name: 'Autoridade Certificadora Mock',
                valid_from: addDays(-180),
                valid_to: addDays(180),
                uploaded_at: new Date(now).toISOString(),
              };
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(currentCert));
              return;
            }

            if (method === 'DELETE') {
              currentCert = null;
              res.statusCode = 204;
              res.end();
              return;
            }

            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
            res.end('Method Not Allowed');
            return;
          }

          // Endpoints de ASSINATURA (mock)
          const signTargets = new Set([
            `${base}medicos/me/assinar/`,
            `${base}medicos/assinar/`,
            `${base}assinatura/assinar/`,
            '/medicos/me/assinar/',
            '/medicos/assinar/',
            '/assinatura/assinar/',
            '/medico/assinar/',
          ]);

          if (!signTargets.has(pathname)) return next();
          if (!['POST','PUT'].includes(method)) {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST, PUT');
            return res.end('Method Not Allowed');
          }

          // Coleta corpo bruto (multipart)
          const chunks = [];
          req.on('data', (c) => chunks.push(Buffer.from(c)));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks);
              // Detecta PDF dentro do multipart de forma simples
              const start = body.indexOf(Buffer.from('%PDF'));
              const end = body.lastIndexOf(Buffer.from('%%EOF'));
              let pdfBuf;
              if (start !== -1 && end !== -1) {
                pdfBuf = body.subarray(start, end + 5);
              } else {
                const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
                const pdfDoc = await PDFDocument.create();
                const page = pdfDoc.addPage([595.28, 841.89]);
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                page.drawText('Documento gerado (mock)', { x: 50, y: 800, size: 14, font, color: rgb(0,0,0) });
                pdfBuf = Buffer.from(await pdfDoc.save());
              }

              const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
              const pdfDoc = await PDFDocument.load(pdfBuf);
              const pages = pdfDoc.getPages();
              const page = pages[pages.length - 1];
              const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
              const stamp = `Assinado digitalmente (MOCK)\nTitular: Dr. Mock\nAlgoritmo: SHA256-RSA\nData: ${new Date().toLocaleString()}`;
              page.drawRectangle({ x: 40, y: 40, width: 515, height: 70, color: rgb(0.95,0.95,0.95) });
              page.drawText(stamp, { x: 50, y: 80, size: 10, font, color: rgb(0,0,0) });
              page.drawText('Carimbo de assinatura mock', { x: 50, y: 60, size: 8, font, color: rgb(0.3,0.3,0.3) });

              const out = await pdfDoc.save();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="documento_assinado_mock.pdf"');
              res.end(Buffer.from(out));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
            }
          });
        } catch (e) {
          try { console.error('[mock-medico-certificado] erro:', e); } catch {}
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok:false, error: 'Falha no mock de certificado/assinatura' }));
        }
      });
    },
  });

  return {
    plugins: [
      react(),
      ...(enableMockReceita ? [mockReceitaPlugin()] : []),
      ...(enableMockMedicoCert ? [mockMedicoCertificadoPlugin()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: true, // permite acesso via IP (ex.: http://192.168.x.x:5174)
      port: 5174,
      proxy: {
        [apiBasePath]: {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // Importante para autenticação baseada em cookie durante o desenvolvimento
          // Regrava domínio e caminho dos cookies para o host do Vite (localhost:5173)
          cookieDomainRewrite: {
            // qualquer domínio -> localhost
            '*': 'localhost',
          },
          cookiePathRewrite: {
            '*': '/',
          },
          // Reescreve cabeçalho Location de redireções absolutas do backend (ex.: 302 http://127.0.0.1:8000/..)
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const loc = proxyRes.headers['location']
              if (loc) {
                try {
                  // Troca a origem do backend pelo caminho base do proxy
                  const newLoc = loc.replace(apiTarget, apiBasePath)
                  proxyRes.headers['location'] = newLoc
                } catch {}
              }
            })
          },
        },
      },
    },
  };
});
