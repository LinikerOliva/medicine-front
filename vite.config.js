// filepath: vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'https://tcc-back-ktwy.onrender.com';
  const apiBasePath = env.VITE_API_BASE_PATH || '/api';
  const enableMockReceita = String(env.VITE_MOCK_RECEITA ?? 'true').toLowerCase() !== 'false';
  // Alterado: por padrão NÃO mockar certificado/assinatura. Só ativa se VITE_MOCK_MEDICO_CERTIFICADO=true
  const enableMockMedicoCert = String(env.VITE_MOCK_MEDICO_CERTIFICADO ?? 'false').toLowerCase() === 'true';
  const enableMockNotifications = String(env.VITE_MOCK_NOTIFICATIONS ?? 'true').toLowerCase() !== 'false';
  
  // Definindo porta específica
  const serverPort = 5174;

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
      // Adiciona helper JSON
      const json = (res, status, obj) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(obj));
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

      // Estado em memória (apenas DEV)
      const __mockDb = {
        receitas: [],
        prontuarios: [],
        solicitacoes: [],
        nextId: 1,
      };

      server.middlewares.use(async (req, res, next) => {
        try {
          const method = (req.method || 'GET').toUpperCase();
          const url = req.url || '/';
          const pathname = url.split('?')[0];

          const base = apiBasePath.replace(/\/?$/, '/');

          // IMPORTANTE: deixe criação/listagem de receitas e prontuários irem AO BACKEND REAL
          const reBaseNoSlash = base.replace(/\/$/, '');
          const isReceitasCRUD = (
            pathname === `${base}receitas/` ||
            pathname === '/receitas/' ||
            pathname === `${base}receita/` ||
            pathname === '/receita/' ||
            new RegExp(`^${reBaseNoSlash}/consultas/[^/]+/receitas/?$`).test(pathname) ||
            new RegExp(`^${reBaseNoSlash}/pacientes/[^/]+/receitas/?$`).test(pathname)
          );
          const isProntuariosCRUD = (
            pathname === `${base}prontuarios/` || pathname === `${base}prontuario/` ||
            pathname === '/prontuarios/' || pathname === '/prontuario/'
          );
          if (isReceitasCRUD || isProntuariosCRUD) {
            return next();
          }

      // 1) Mock: criação/listagem de RECEITAS (CRUD mínimo)
          if (pathname === `${base}receitas/` || pathname === '/receitas/') {
            if (method === 'GET') {
              // Suporta retorno paginado ou lista direta
              return json(res, 200, { count: __mockDb.receitas.length, results: [...__mockDb.receitas].reverse() });
            }
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
              const data = await readJsonBody(req);
              const id = String(__mockDb.nextId++);
              const now = new Date().toISOString();
              const rec = {
                id,
                paciente: data.paciente || data.paciente_id || data.pacienteUuid || null,
                consulta: data.consulta || data.consulta_id || null,
                medicamentos: data.medicamentos || data.medicamento || '',
                validade: data.validade || data.validade_receita || '',
                created_at: now,
                updated_at: now,
                ...data,
              };
              __mockDb.receitas.push(rec);
              return json(res, 200, rec);
            }
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST, PUT, PATCH');
            return res.end('Method Not Allowed');
          }

          // 1.1) Mock: criação/listagem/atualização de CONSULTAS (DEV)
          if (pathname === `${base}consultas/` || pathname === '/consultas/') {
            if (method === 'GET') {
              // filtros: medico, data
              let list = [...(__mockDb.consultas || [])]
              try {
                const u = new URL(url, 'http://localhost')
                const medico = u.searchParams.get('medico') || u.searchParams.get('medico_id')
                const date = u.searchParams.get('date') || u.searchParams.get('data') || u.searchParams.get('dia') || u.searchParams.get('data__date')
                if (medico) list = list.filter((c) => String(c.medico_id) === String(medico))
                if (date) list = list.filter((c) => (c.data || '').startsWith(date))
              } catch {}
              return json(res, 200, { count: list.length, results: list })
            }
            if (['POST','PUT','PATCH'].includes(method)) {
              const data = await readJsonBody(req)
              if (!__mockDb.consultas) __mockDb.consultas = []
              const id = String(__mockDb.nextId++)
              const now = new Date().toISOString()
              const c = {
                id,
                medico_id: data.medico || data.medico_id || null,
                paciente: data.paciente || data.paciente_id || null,
                tipo: data.tipo || 'rotina',
                modalidade: data.modalidade || 'presencial',
                motivo: data.motivo || '',
                observacoes: data.observacoes || '',
                status: (data.status || data.situacao || 'pendente').toLowerCase(),
                data: data.data || now.slice(0,10),
                horario: data.hora || data.horario || null,
                created_at: now,
                updated_at: now,
              }
              __mockDb.consultas.push(c)
              return json(res, 200, c)
            }
            res.statusCode = 405
            res.setHeader('Allow', 'GET, POST, PUT, PATCH')
            return res.end('Method Not Allowed')
          }

          // Ações: /consultas/:id/confirmar|cancelar
          const mConsAction = pathname.match(new RegExp(`^${reBaseNoSlash}/consultas/([^/]+)/(confirmar|cancelar)/?$`))
          if (mConsAction) {
            const id = mConsAction[1]
            const action = mConsAction[2]
            if (!__mockDb.consultas) __mockDb.consultas = []
            const item = __mockDb.consultas.find((c) => String(c.id) === String(id))
            if (!item) { return json(res, 404, { detail: 'Consulta não encontrada' }) }
            if (action === 'confirmar') item.status = 'confirmada'
            else if (action === 'cancelar') item.status = 'cancelada'
            item.updated_at = new Date().toISOString()
            return json(res, 200, item)
          }

          // PATCH /consultas/:id/
          const mConsPatch = pathname.match(new RegExp(`^${reBaseNoSlash}/consultas/([^/]+)/?$`))
          if (mConsPatch && method === 'PATCH') {
            const id = mConsPatch[1]
            const data = await readJsonBody(req)
            if (!__mockDb.consultas) __mockDb.consultas = []
            const item = __mockDb.consultas.find((c) => String(c.id) === String(id))
            if (!item) { return json(res, 404, { detail: 'Consulta não encontrada' }) }
            Object.assign(item, {
              status: (data.status || data.situacao || item.status || 'pendente').toLowerCase(),
              data: data.data || item.data,
              horario: data.hora || data.horario || item.horario,
              updated_at: new Date().toISOString(),
            })
            return json(res, 200, item)
          }

          if (pathname === `${base}receita/` || pathname === '/receita/') {
            if (!['POST', 'PUT', 'PATCH'].includes(method)) {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST, PUT, PATCH');
              return res.end('Method Not Allowed');
            }
            const data = await readJsonBody(req);
            const id = String(__mockDb.nextId++);
            const now = new Date().toISOString();
            const rec = {
              id,
              paciente: data.paciente || data.paciente_id || null,
              consulta: data.consulta || data.consulta_id || null,
              medicamentos: data.medicamentos || data.medicamento || '',
              validade: data.validade || data.validade_receita || '',
              created_at: now,
              updated_at: now,
              ...data,
            };
            __mockDb.receitas.push(rec);
            return json(res, 200, rec);
          }

          // 0) Mock: fluxo de SOLICITAÇÕES de consultas (DEV)
          const isSolicPath = pathname.startsWith(`${base}solicitacoes/`) || pathname.startsWith('/solicitacoes/')
          if (isSolicPath) {
            const m = pathname.match(/\/(solicitacoes)\/(\d+)\/(aceitar|recusar|cancelar)\/?$/)
            if (m) {
              const id = m[2]
              const action = m[3]
              const item = __mockDb.solicitacoes.find((s) => String(s.id) === String(id))
              if (!item) { res.statusCode = 404; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ detail: 'Solicitação não encontrada' })) }
              if (action === 'aceitar') { item.status = 'confirmado' }
              else if (action === 'recusar') { item.status = 'rejeitado' }
              else if (action === 'cancelar') { item.status = 'cancelado' }
              item.updated_at = new Date().toISOString()
              return json(res, 200, item)
            }

            if (method === 'GET') {
              let list = [...__mockDb.solicitacoes]
              try {
                const u = new URL(url, 'http://localhost')
                const medico = u.searchParams.get('medico') || u.searchParams.get('medico_id')
                const date = u.searchParams.get('date') || u.searchParams.get('data') || u.searchParams.get('dia') || u.searchParams.get('data__date')
                if (medico) list = list.filter((s) => String(s.medico_id) === String(medico))
                if (date) list = list.filter((s) => (s.data || '').startsWith(date))
              } catch {}
              return json(res, 200, { count: list.length, results: list })
            }
            if (['POST','PUT','PATCH'].includes(method)) {
              const data = await readJsonBody(req)
              const id = String(__mockDb.nextId++)
              const now = new Date().toISOString()
              const s = {
                id,
                medico_id: data.medico || data.medico_id || null,
                paciente_id: data.paciente || data.paciente_id || null,
                tipo: data.tipo || 'inicial',
                modalidade: data.modalidade || 'presencial',
                motivo: data.motivo || '',
                observacoes: data.observacoes || '',
                status: (data.status || data.situacao || 'pendente').toLowerCase(),
                data: data.data || now.slice(0,10),
                horario: data.hora || data.horario || null,
                created_at: now,
                updated_at: now,
              }
              __mockDb.solicitacoes.push(s)
              return json(res, 200, s)
            }
            res.statusCode = 405
            res.setHeader('Allow', 'GET, POST, PUT, PATCH')
            return res.end('Method Not Allowed')
          }

          // POST em /consultas/:id/receitas/ ou /pacientes/:id/receitas/
          // const reBaseNoSlash = base.replace(/\/$/, ''); // removido: já declarado acima
          const mConsRec = pathname.match(new RegExp(`^${reBaseNoSlash}/consultas/([^/]+)/receitas/?$`));
          if (mConsRec) {
            if (!['POST', 'PUT', 'PATCH'].includes(method)) {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST, PUT, PATCH');
              return res.end('Method Not Allowed');
            }
            const data = await readJsonBody(req);
            const id = String(__mockDb.nextId++);
            const now = new Date().toISOString();
            const rec = {
              id,
              consulta: mConsRec[1],
              paciente: data.paciente || data.paciente_id || null,
              medicamentos: data.medicamentos || data.medicamento || '',
              validade: data.validade || data.validade_receita || '',
              created_at: now,
              updated_at: now,
              ...data,
            };
            __mockDb.receitas.push(rec);
            return json(res, 200, rec);
          }

          const mPacRec = pathname.match(new RegExp(`^${reBaseNoSlash}/pacientes/([^/]+)/receitas/?$`));
          if (mPacRec) {
            if (!['POST', 'PUT', 'PATCH'].includes(method)) {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST, PUT, PATCH');
              return res.end('Method Not Allowed');
            }
            const data = await readJsonBody(req);
            const id = String(__mockDb.nextId++);
            const now = new Date().toISOString();
            const rec = {
              id,
              paciente: mPacRec[1],
              consulta: data.consulta || data.consulta_id || null,
              medicamentos: data.medicamentos || data.medicamento || '',
              validade: data.validade || data.validade_receita || '',
              created_at: now,
              updated_at: now,
              ...data,
            };
            __mockDb.receitas.push(rec);
            return json(res, 200, rec);
          }

          // 2) Mock: ENVIAR RECEITA (suporta GET/POST/PUT e várias rotas)
          const sendActionRegex = /(enviar|enviar-email|enviar_email|email|send-email|send)\/?$/i;
          const isReceitaSend = (pathname.startsWith(`${base}receitas/`) || pathname.startsWith('/receitas/')) && sendActionRegex.test(pathname);
          const isPacienteReceitaSend = (pathname.includes('/pacientes/') && pathname.includes('/receitas/') && sendActionRegex.test(pathname));
          if (isReceitaSend || isPacienteReceitaSend) {
            // Aceita métodos comuns
            if (!['GET', 'POST', 'PUT'].includes(method)) {
              res.statusCode = 405;
              res.setHeader('Allow', 'GET, POST, PUT');
              return res.end('Method Not Allowed');
            }
            let email = null;
            let receitaId = null;
            try {
              if (method === 'GET') {
                const u = new URL(url, 'http://localhost');
                email = u.searchParams.get('email') || u.searchParams.get('to') || u.searchParams.get('destinatario') || u.searchParams.get('paciente_email');
                receitaId = u.searchParams.get('id') || u.searchParams.get('receita') || u.searchParams.get('receita_id');
              } else {
                const body = await readJsonBody(req);
                email = body.email || body.to || body.destinatario || body.paciente_email || null;
                receitaId = body.id || body.receita || body.receita_id || null;
              }
            } catch {}
            return json(res, 200, { ok: true, sent: true, email, receitaId });
          }

          // 3) Mock: criação de PRONTUÁRIOS (POST/PUT/PATCH)
          if (
            pathname === `${base}prontuarios/` || pathname === `${base}prontuario/` ||
            pathname === '/prontuarios/' || pathname === '/prontuario/'
          ) {
            if (!['POST', 'PUT', 'PATCH'].includes(method)) {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST, PUT, PATCH');
              return res.end('Method Not Allowed');
            }
            const data = await readJsonBody(req);
            const id = String(__mockDb.nextId++);
            const now = new Date().toISOString();
            const pront = { id, created_at: now, updated_at: now, ...data };
            __mockDb.prontuarios.push(pront);
            return json(res, 200, pront);
          }

          // 4) Mock: geração de PDF de receita (aceita /gerar-documento, /gerar e /pdf)
          const targets = [
            `${base}receitas/gerar-documento/`,
            `${base}receitas/gerar/`,
            `${base}receitas/pdf/`,
          ];
          const isReceitaGenPath = targets.some((t) => pathname === t || pathname.startsWith(t));
          if (!isReceitaGenPath) return next();

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
          const rg = data.rg || data.cpf || data.documento || data.doc || "";
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
          draw(`CPF: ${rg}`, 50, y); y -= 18;
          draw(`Nascimento: ${nasc}`, 50, y); y -= 28;
          draw('Prescrição:', 50, y); y -= 18;
          draw(meds, 60, y); y -= 18;
          if (posologia) { draw(`Posologia: ${posologia}`, 60, y); y -= 18; }
          y -= 10;
          draw(`Validade: ${validade}`, 50, y); y -= 28;
          if (obs) { draw(`Observações: ${obs}`, 50, y); y -= 28; }
          draw(`Emitido por: ${medico} • CRM ${crm}`, 50, y); y -= 18;
          // Evitar confusão: não afirmar assinatura aqui; assinatura real será feita no backend
          draw('Documento gerado (DEV - pré-assinatura)', 50, y, 10);

          const pdfBytes = await PDFDocument.create().then(async () => await pdfDoc.save());
          const buf = Buffer.from(pdfBytes);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/pdf');
          // Ajuste: attachment para download correto + filename padronizado
          res.setHeader('Content-Disposition', 'attachment; filename="receita.pdf"');
          res.setHeader('Content-Length', String(buf.length));
          return res.end(buf);
        } catch (e) {
          // Em caso de erro inesperado, não bloquear o proxy de recursos estáticos
          try { console.error('[mock-receita] erro:', e); } catch {}
          try {
            const url = req.url || '/';
            const pathname = url.split('?')[0];
            const base = apiBasePath.replace(/\/?$/, '/');
            const isApi = pathname.startsWith(base) || pathname.startsWith('/receitas/') || pathname.startsWith('/prontuarios/');
            if (!isApi) return next();
          } catch {}
          return text(res, 500, 'Erro ao gerar PDF mock');
        }
      });
    },
  });

  // Plugin para mockar endpoints de Notificações em desenvolvimento
  const mockNotificationsPlugin = () => ({
    name: 'mock-notifications',
    apply: 'serve',
    configureServer(server) {
      const json = (res, status, obj) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(obj));
      };

      const readJsonBody = async (req) => {
        return new Promise((resolve) => {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              resolve(JSON.parse(body));
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
          const base = apiBasePath.replace(/\/?$/, '/');

          // Mock endpoints de notificações
          const notificationEndpoints = [
            `${base}notificacoes/`,
            `${base}notifications/`,
            `${base}notificacoes/enviar/`,
            `${base}notifications/enviar/`,
            `${base}notificacoes/enviar-email/`,
            `${base}notifications/enviar-email/`,
            `${base}notificacoes/enviar-sms/`,
            `${base}notifications/enviar-sms/`,
            `${base}sms/enviar/`,
            `${base}comunicacao/sms/`,
            `${base}receitas/sms/`
          ];

          const isNotificationEndpoint = notificationEndpoints.some(endpoint => 
            pathname === endpoint || pathname.startsWith(endpoint)
          );

          if (isNotificationEndpoint) {
            if (method === 'POST') {
              // Envio real de e-mail quando caminho terminar com enviar-email/
              const endsWith = (p) => pathname.endsWith(p) || pathname.startsWith(p);
              const isEmail = endsWith(`${base}notificacoes/enviar-email/`) || endsWith(`${base}notifications/enviar-email/`);
              if (isEmail) {
                try {
                  const { default: Busboy } = await import('busboy');
                  const fields = {};
                  let fileBuf = null;
                  let fileName = null;
                  await new Promise((resolve, reject) => {
                    try {
                      const bb = new Busboy({ headers: req.headers });
                      bb.on('field', (name, val) => { fields[name] = val });
                      bb.on('file', (name, file, filename, encoding, mimetype) => {
                        const chunks = [];
                        file.on('data', (d) => chunks.push(d));
                        file.on('end', () => { fileBuf = Buffer.concat(chunks); fileName = filename || 'receita.pdf'; });
                      });
                      bb.on('finish', resolve);
                      bb.on('error', reject);
                      req.pipe(bb);
                    } catch (e) { reject(e) }
                  });
                  const smtpHost = env.VITE_SMTP_HOST || 'smtp.gmail.com';
                  const smtpPort = Number(env.VITE_SMTP_PORT || 587);
                  const smtpSecure = String(env.VITE_SMTP_SECURE || 'false').toLowerCase() === 'true';
                  const smtpUser = env.VITE_SMTP_USER || env.EMAIL_HOST_USER || '';
                  const smtpPass = env.VITE_SMTP_PASS || env.EMAIL_HOST_PASSWORD || '';
                  const fromAddr = env.VITE_SMTP_FROM || env.DEFAULT_FROM_EMAIL || smtpUser || 'no-reply@localhost';
                  const toAddr = fields.email || fields.to || '';
                  if (!smtpUser || !smtpPass) {
                    return json(res, 422, { ok: false, detail: 'SMTP não configurado (VITE_SMTP_USER/VITE_SMTP_PASS ou EMAIL_HOST_USER/EMAIL_HOST_PASSWORD)' });
                  }
                  if (!toAddr) {
                    return json(res, 400, { ok: false, detail: 'Destino (email) é obrigatório' });
                  }
                  const { default: nodemailer } = await import('nodemailer');
                  const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpSecure, auth: { user: smtpUser, pass: smtpPass } });
                  const subject = fields.assunto || 'Nova receita médica';
                  const textMsg = fields.mensagem || (fields.link_download ? `Sua receita está disponível: ${fields.link_download}` : 'Receita em anexo.');
                  const attachments = fileBuf ? [{ filename: fileName || 'receita.pdf', content: fileBuf }] : [];
                  await transporter.sendMail({ from: fromAddr, to: toAddr, subject, text: textMsg, attachments });
                  return json(res, 200, { success: true, message: 'E-mail enviado', to: toAddr, subject, has_attachment: !!fileBuf });
                } catch (e) {
                  return json(res, 500, { ok: false, error: String(e?.message || e) });
                }
              }

              const body = await readJsonBody(req);
              const mockResponse = {
                success: true,
                id: `mock-${Date.now()}`,
                message: 'Notificação enviada com sucesso (MOCK)',
                timestamp: new Date().toISOString(),
                ...body
              };
              return json(res, 200, mockResponse);
            }

            if (method === 'GET') {
              // Mock para listar notificações
              const mockNotifications = {
                results: [],
                count: 0,
                next: null,
                previous: null
              };
              return json(res, 200, mockNotifications);
            }

            // Outros métodos
            return json(res, 200, { success: true, message: 'Mock endpoint' });
          }

          return next();
        } catch (error) {
          console.error('[mock-notifications] erro:', error);
          return next();
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
              // Regras simples de validação: se houver PFX, exigir senha presente
              try {
                const bodyStr = body.toString('utf-8');
                const hasPfx = /(name="(pfx|certificado|pkcs12)")/i.test(bodyStr);
                const hasPw = /(name="(senha|pfx_password|password)")/i.test(bodyStr);
                if (hasPfx && !hasPw) {
                  res.statusCode = 422;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ ok: false, detail: 'Senha do certificado PFX é obrigatória (MOCK).' }));
                }
              } catch {}
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
              const outBuf = Buffer.from(out);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="documento_assinado_mock.pdf"');
              res.setHeader('Content-Length', String(outBuf.length));
              res.end(outBuf);
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
            }
          });
        } catch (e) {
          try { console.error('[mock-medico-certificado] erro:', e); } catch {}
          // Não bloquear recursos estáticos em caso de erro inesperado
          try {
            const url = req.url || '/';
            const pathname = url.split('?')[0];
            const base = apiBasePath.replace(/\/?$/, '/');
            const isApi = pathname.startsWith(base) || pathname.startsWith('/medicos/') || pathname.startsWith('/assinatura/') || pathname.startsWith('/certificados/');
            if (!isApi) return next();
          } catch {}
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok:false, error: 'Falha no mock de certificado/assinatura' }));
        }
      });
    },
  });

  // Servir arquivos de /logo/ diretamente do diretório raiz "logo" (apenas DEV)
  const serveLogoStaticPlugin = () => ({
    name: 'serve-logo-static',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          const method = (req.method || 'GET').toUpperCase()
          if (method !== 'GET') return next()
          const url = req.url || '/'
          const pathname = url.split('?')[0]
          if (!pathname.startsWith('/logo/')) return next()
          const file = pathname.replace('/logo/', '')
          const abs = path.resolve(process.cwd(), 'logo', file)
          if (!fs.existsSync(abs)) return next()
          const ext = path.extname(abs).toLowerCase()
          const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'
          const buf = fs.readFileSync(abs)
          res.statusCode = 200
          res.setHeader('Content-Type', type)
          res.setHeader('Cache-Control', 'public, max-age=3600')
          return res.end(buf)
        } catch (_) { return next() }
      })
    }
  })

  return {
    plugins: [
      react(),
      serveLogoStaticPlugin()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: true, // permite acesso via IP (ex.: http://192.168.x.x:5174)
      port: 5174,
      cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      },
      // proxy removido: usamos conexão direta via CORS com Render
      // Security headers (dev-friendly) para mitigar avisos do auditor
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
        // CSP relaxada para ambiente de desenvolvimento (HMR precisa de unsafe-eval/inline)
        'Content-Security-Policy': "default-src 'self'; connect-src 'self' ws: http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; style-src 'self' 'unsafe-inline' http: https: https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' http: https: https://fonts.googleapis.com; font-src 'self' data: http: https: https://fonts.gstatic.com; img-src 'self' data: blob: http: https:; frame-ancestors 'none';",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Ajuste: permitir microfone/câmera em DEV para habilitar Web Speech / getUserMedia
        'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=(self)'
      },
    },
  };
});
