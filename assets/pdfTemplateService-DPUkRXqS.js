import{D as m,l as u,a as h,E as v,h as $}from"./index-BKG-q-SI.js";class b{constructor(){this.defaultConfig=m}loadMedicoTemplate(t){if(!t)return this.defaultConfig;try{return u(t)||this.defaultConfig}catch(o){return console.warn("Erro ao carregar template do médico:",o),this.defaultConfig}}loadMedicoLogo(t){if(!t)return null;try{return h(t)}catch(o){return console.warn("Erro ao carregar logo do médico:",o),null}}generateReceitaHTML(t,o,e,i){const n=this.loadMedicoTemplate(i),s=this.loadMedicoLogo(i),r=this.generateStyles(n),l=this.generateHeader(n,o,s),c=this.generateContent(t,e,n),a=this.generateFooter(n,o);return`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Receita Médica</title>
          <style>${r}</style>
        </head>
        <body>
          <div class="receita-container">
            ${l}
            ${c}
            ${a}
          </div>
        </body>
      </html>
    `}generateStyles(t){const{layout:o,content:e,branding:i}=t;return`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${e.fontFamily};
        font-size: ${e.fontSize.body}pt;
        color: ${e.colors.primary};
        line-height: 1.6;
        background: white;
      }
      
      .receita-container {
        width: 100%;
        max-width: ${o.pageSize==="A4"?"210mm":"8.5in"};
        margin: 0 auto;
        padding: ${o.margins.top}px ${o.margins.right}px ${o.margins.bottom}px ${o.margins.left}px;
        min-height: ${o.pageSize==="A4"?"297mm":"11in"};
        position: relative;
      }
      
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid ${e.colors.accent};
      }
      
      .header-logo {
        max-height: 80px;
        max-width: 150px;
        object-fit: contain;
      }
      
      .header-info {
        text-align: right;
        flex: 1;
        margin-left: 20px;
      }
      
      .clinic-name {
        font-size: ${e.fontSize.title}pt;
        font-weight: bold;
        color: ${e.colors.primary};
        margin-bottom: 5px;
      }
      
      .clinic-details {
        font-size: ${e.fontSize.small}pt;
        color: ${e.colors.secondary};
        line-height: 1.4;
      }
      
      .doctor-info {
        margin-bottom: 30px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid ${e.colors.accent};
      }
      
      .doctor-name {
        font-size: ${e.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${e.colors.primary};
        margin-bottom: 5px;
      }
      
      .doctor-details {
        font-size: ${e.fontSize.small}pt;
        color: ${e.colors.secondary};
      }
      
      .patient-info {
        margin-bottom: 30px;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }
      
      .patient-name {
        font-size: ${e.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${e.colors.primary};
        margin-bottom: 10px;
      }
      
      .patient-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        font-size: ${e.fontSize.small}pt;
        color: ${e.colors.secondary};
      }
      
      .prescription-title {
        font-size: ${e.fontSize.title}pt;
        font-weight: bold;
        color: ${e.colors.primary};
        text-align: center;
        margin-bottom: 30px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .medications {
        margin-bottom: 40px;
      }
      
      .medication-item {
        margin-bottom: 20px;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background-color: #fafafa;
      }
      
      .medication-name {
        font-size: ${e.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${e.colors.primary};
        margin-bottom: 8px;
      }
      
      .medication-details {
        font-size: ${e.fontSize.body}pt;
        color: ${e.colors.secondary};
        margin-bottom: 5px;
      }
      
      .medication-instructions {
        font-size: ${e.fontSize.body}pt;
        color: ${e.colors.primary};
        font-style: italic;
        margin-top: 10px;
        padding: 10px;
        background-color: #f0f8ff;
        border-radius: 4px;
        border-left: 3px solid ${e.colors.accent};
      }
      
      .observations {
        margin-bottom: 40px;
        padding: 20px;
        background-color: #fff9e6;
        border-radius: 8px;
        border: 1px solid #ffd700;
      }
      
      .observations-title {
        font-size: ${e.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${e.colors.primary};
        margin-bottom: 10px;
      }
      
      .observations-text {
        font-size: ${e.fontSize.body}pt;
        color: ${e.colors.secondary};
        line-height: 1.6;
      }
      
      .footer {
        position: absolute;
        bottom: ${o.margins.bottom}px;
        left: ${o.margins.left}px;
        right: ${o.margins.right}px;
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }
      
      .signature-area {
        margin-top: 40px;
        text-align: center;
      }
      
      .signature-line {
        width: 300px;
        height: 1px;
        background-color: ${e.colors.secondary};
        margin: 40px auto 10px;
      }
      
      .signature-text {
        font-size: ${e.fontSize.small}pt;
        color: ${e.colors.secondary};
      }
      
      .date-location {
        margin-top: 30px;
        font-size: ${e.fontSize.small}pt;
        color: ${e.colors.secondary};
      }
      
      @media print {
        .receita-container {
          margin: 0;
          padding: 20px;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `}generateHeader(t,o,e){const{header:i,branding:n}=t;if(!i.showLogo&&!i.showDoctorInfo)return"";let s="";i.showLogo&&(e!=null&&e.data)&&(s=`<img src="${e.data}" alt="Logo" class="header-logo" />`);let r="";return i.showDoctorInfo&&(r=`
        <div class="header-info">
          <div class="clinic-name">${n.clinicName||(o==null?void 0:o.nome)||"Clínica Médica"}</div>
          <div class="clinic-details">
            ${n.clinicAddress?`<div>${n.clinicAddress}</div>`:""}
            ${n.clinicPhone?`<div>Tel: ${n.clinicPhone}</div>`:""}
            ${n.clinicEmail?`<div>Email: ${n.clinicEmail}</div>`:""}
          </div>
        </div>
      `),`
      <div class="header">
        ${s}
        ${r}
      </div>
    `}generateContent(t,o,e){const i=this.generateDoctorInfo(t.medico,e),n=this.generatePatientInfo(o,e),s=this.generateMedications(t.itens||[],e),r=this.generateObservations(t.observacoes,e);return`
      ${i}
      ${n}
      <div class="prescription-title">Receita Médica</div>
      ${s}
      ${r}
    `}generateDoctorInfo(t,o){var e,i;return t?`
      <div class="doctor-info">
        <div class="doctor-name">Dr(a). ${t.nome||((e=t.user)==null?void 0:e.first_name)+" "+((i=t.user)==null?void 0:i.last_name)}</div>
        <div class="doctor-details">
          ${t.crm?`CRM: ${t.crm}`:""}
          ${t.especialidade?` | ${t.especialidade}`:""}
        </div>
      </div>
    `:""}generatePatientInfo(t,o){var i,n;if(!t)return"";const e=this.calculateAge(t.data_nascimento);return`
      <div class="patient-info">
        <div class="patient-name">Paciente: ${t.nome||((i=t.user)==null?void 0:i.first_name)+" "+((n=t.user)==null?void 0:n.last_name)}</div>
        <div class="patient-details">
          ${e?`<div>Idade: ${e} anos</div>`:""}
          ${t.cpf?`<div>CPF: ${t.cpf}</div>`:""}
          ${t.telefone?`<div>Telefone: ${t.telefone}</div>`:""}
          ${t.endereco?`<div>Endereço: ${t.endereco}</div>`:""}
        </div>
      </div>
    `}generateMedications(t,o){return!t||t.length===0?'<div class="medications"><p>Nenhum medicamento prescrito.</p></div>':`<div class="medications">${t.map((i,n)=>`
      <div class="medication-item">
        <div class="medication-name">${n+1}. ${i.medicamento||i.nome}</div>
        ${i.dosagem?`<div class="medication-details">Dosagem: ${i.dosagem}</div>`:""}
        ${i.frequencia?`<div class="medication-details">Frequência: ${i.frequencia}</div>`:""}
        ${i.duracao?`<div class="medication-details">Duração: ${i.duracao}</div>`:""}
        ${i.instrucoes?`<div class="medication-instructions">${i.instrucoes}</div>`:""}
      </div>
    `).join("")}</div>`}generateObservations(t,o){return t?`
      <div class="observations">
        <div class="observations-title">Observações:</div>
        <div class="observations-text">${t}</div>
      </div>
    `:""}generateFooter(t,o){var s,r;const{footer:e}=t;if(!e.showSignature&&!e.showDate)return"";let i="";e.showSignature&&(i=`
        <div class="signature-area">
          <div class="signature-line"></div>
          <div class="signature-text">
            Dr(a). ${(o==null?void 0:o.nome)||((s=o==null?void 0:o.user)==null?void 0:s.first_name)+" "+((r=o==null?void 0:o.user)==null?void 0:r.last_name)}
            ${o!=null&&o.crm?`<br>CRM: ${o.crm}`:""}
          </div>
        </div>
      `);let n="";return e.showDate&&(n=`<div class="date-location">Data: ${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div>`),`
      <div class="footer">
        ${i}
        ${n}
      </div>
    `}calculateAge(t){if(!t)return null;const o=new Date(t),e=new Date;let i=e.getFullYear()-o.getFullYear();const n=e.getMonth()-o.getMonth();return(n<0||n===0&&e.getDate()<o.getDate())&&i--,i}async generatePDF(t,o,e,i){try{const n=this.loadMedicoTemplate(i),s=this.generateReceitaHTML(t,o,e,i),r=document.createElement("div");r.innerHTML=s,r.style.position="absolute",r.style.left="-9999px",r.style.top="-9999px",document.body.appendChild(r);const l=n.layout.orientation==="landscape"?"l":"p",c=n.layout.pageSize.toLowerCase(),a=new v({orientation:l,unit:"mm",format:c}),d=await $(r.querySelector(".receita-container"),{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff"}),p=d.toDataURL("image/png"),g=a.internal.pageSize.getWidth(),f=d.height*g/d.width;return a.addImage(p,"PNG",0,0,g,f),document.body.removeChild(r),a.output("blob")}catch(n){throw console.error("Erro ao gerar PDF:",n),new Error("Falha na geração do PDF: "+n.message)}}savePDF(t,o="receita-medica.pdf"){const e=URL.createObjectURL(t),i=document.createElement("a");i.href=e,i.download=o,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(e)}previewPDF(t){const o=URL.createObjectURL(t);window.open(o,"_blank")}}const w=new b;export{b as PdfTemplateService,w as default,w as pdfTemplateService};
