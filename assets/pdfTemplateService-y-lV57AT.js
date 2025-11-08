import{D as m,l as u,a as $,E as v,h}from"./index-BhAdXL4T.js";class b{constructor(){this.defaultConfig=m}loadMedicoTemplate(t){const i=[t,typeof window<"u"?localStorage.getItem("medico_id"):null,"default"].filter(Boolean);for(const e of i)try{const o=u(e);if(o)return o}catch(o){console.warn("Erro ao carregar template do médico:",o)}return this.defaultConfig}loadMedicoLogo(t){const i=[t,typeof window<"u"?localStorage.getItem("medico_id"):null].filter(Boolean);for(const e of i)try{const o=$(e);if(o)return o}catch(o){console.warn("Erro ao carregar logo do médico:",o)}return null}generateReceitaHTML(t,i,e,o){const n=this.loadMedicoTemplate(o),a=this.loadMedicoLogo(o),r=this.generateStyles(n),l=this.generateHeader(n,i,a),d=this.generateContent(t,e,n),s=this.generateFooter(n,i);return`
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
            ${d}
            ${s}
          </div>
        </body>
      </html>
    `}generateStyles(t){const{layout:i,content:e,branding:o}=t;return`
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
        max-width: ${i.pageSize==="A4"?"210mm":"8.5in"};
        margin: 0 auto;
        padding: ${i.margins.top}px ${i.margins.right}px ${i.margins.bottom}px ${i.margins.left}px;
        min-height: ${i.pageSize==="A4"?"297mm":"11in"};
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
        bottom: ${i.margins.bottom}px;
        left: ${i.margins.left}px;
        right: ${i.margins.right}px;
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
    `}generateHeader(t,i,e){const{header:o,branding:n}=t;if(!o.showLogo&&!o.showDoctorInfo)return"";let a="";o.showLogo&&(e!=null&&e.data)&&(a=`<img src="${e.data}" alt="Logo" class="header-logo" />`);let r="";return o.showDoctorInfo&&(r=`
        <div class="header-info">
          <div class="clinic-name">${n.clinicName||(i==null?void 0:i.nome)||"Clínica Médica"}</div>
          <div class="clinic-details">
            ${n.clinicAddress?`<div>${n.clinicAddress}</div>`:""}
            ${n.clinicPhone?`<div>Tel: ${n.clinicPhone}</div>`:""}
            ${n.clinicEmail?`<div>Email: ${n.clinicEmail}</div>`:""}
          </div>
        </div>
      `),`
      <div class="header">
        ${a}
        ${r}
      </div>
    `}generateContent(t,i,e){const o=this.generateDoctorInfo(t.medico,e),n=this.generatePatientInfo(i,e),a=this.generateMedications(t.itens||[],e),r=this.generateObservations(t.observacoes,e);return`
      ${o}
      ${n}
      <div class="prescription-title">Receita Médica</div>
      ${a}
      ${r}
    `}generateDoctorInfo(t,i){var e,o;return t?`
      <div class="doctor-info">
        <div class="doctor-name">Dr(a). ${t.nome||((e=t.user)==null?void 0:e.first_name)+" "+((o=t.user)==null?void 0:o.last_name)}</div>
        <div class="doctor-details">
          ${t.crm?`CRM: ${t.crm}`:""}
          ${t.especialidade?` | ${t.especialidade}`:""}
        </div>
      </div>
    `:""}generatePatientInfo(t,i){var o,n;if(!t)return"";const e=this.calculateAge(t.data_nascimento);return`
      <div class="patient-info">
        <div class="patient-name">Paciente: ${t.nome||((o=t.user)==null?void 0:o.first_name)+" "+((n=t.user)==null?void 0:n.last_name)}</div>
        <div class="patient-details">
          ${e?`<div>Idade: ${e} anos</div>`:""}
          ${t.cpf?`<div>CPF: ${t.cpf}</div>`:""}
          ${t.telefone?`<div>Telefone: ${t.telefone}</div>`:""}
          ${t.endereco?`<div>Endereço: ${t.endereco}</div>`:""}
        </div>
      </div>
    `}generateMedications(t,i){return!t||t.length===0?'<div class="medications"><p>Nenhum medicamento prescrito.</p></div>':`<div class="medications">${t.map((o,n)=>`
      <div class="medication-item">
        <div class="medication-name">${n+1}. ${o.medicamento||o.nome}</div>
        ${o.dosagem?`<div class="medication-details">Dosagem: ${o.dosagem}</div>`:""}
        ${o.frequencia?`<div class="medication-details">Frequência: ${o.frequencia}</div>`:""}
        ${o.duracao?`<div class="medication-details">Duração: ${o.duracao}</div>`:""}
        ${o.instrucoes?`<div class="medication-instructions">${o.instrucoes}</div>`:""}
      </div>
    `).join("")}</div>`}generateObservations(t,i){return t?`
      <div class="observations">
        <div class="observations-title">Observações:</div>
        <div class="observations-text">${t}</div>
      </div>
    `:""}generateFooter(t,i){var a,r;const{footer:e}=t;if(!e.showSignature&&!e.showDate)return"";let o="";e.showSignature&&(o=`
        <div class="signature-area">
          <div class="signature-line"></div>
          <div class="signature-text">
            Dr(a). ${(i==null?void 0:i.nome)||((a=i==null?void 0:i.user)==null?void 0:a.first_name)+" "+((r=i==null?void 0:i.user)==null?void 0:r.last_name)}
            ${i!=null&&i.crm?`<br>CRM: ${i.crm}`:""}
          </div>
        </div>
      `);let n="";return e.showDate&&(n=`<div class="date-location">Data: ${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div>`),`
      <div class="footer">
        ${o}
        ${n}
      </div>
    `}calculateAge(t){if(!t)return null;const i=new Date(t),e=new Date;let o=e.getFullYear()-i.getFullYear();const n=e.getMonth()-i.getMonth();return(n<0||n===0&&e.getDate()<i.getDate())&&o--,o}async generatePDF(t,i,e,o){try{const n=this.loadMedicoTemplate(o),a=this.generateReceitaHTML(t,i,e,o),r=document.createElement("div");r.innerHTML=a,r.style.position="absolute",r.style.left="-9999px",r.style.top="-9999px",document.body.appendChild(r);const l=n.layout.orientation==="landscape"?"l":"p",d=n.layout.pageSize.toLowerCase(),s=new v({orientation:l,unit:"mm",format:d}),c=await h(r.querySelector(".receita-container"),{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff"}),f=c.toDataURL("image/png"),g=s.internal.pageSize.getWidth(),p=c.height*g/c.width;return s.addImage(f,"PNG",0,0,g,p),document.body.removeChild(r),s.output("blob")}catch(n){throw console.error("Erro ao gerar PDF:",n),new Error("Falha na geração do PDF: "+n.message)}}savePDF(t,i="receita-medica.pdf"){const e=URL.createObjectURL(t),o=document.createElement("a");o.href=e,o.download=i,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(e)}previewPDF(t){const i=URL.createObjectURL(t);window.open(i,"_blank")}}const w=new b;export{b as PdfTemplateService,w as default,w as pdfTemplateService};
