// filepath: vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://127.0.0.1:8000';
  const apiBasePath = env.VITE_API_BASE_PATH || '/api';
  const enableMockReceita = String(env.VITE_MOCK_RECEITA ?? 'true').toLowerCase() !== 'false';

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

  return {
    plugins: [react(), ...(enableMockReceita ? [mockReceitaPlugin()] : [])],
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
