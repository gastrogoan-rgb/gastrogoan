/* ============================================================
   GESTIÓN ECONÓMICA — Gastos, P&L, punto de equilibrio,
   CAPEX, resultado y tesorería (7 pestañas)
   ============================================================ */
const GE = (function(){
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const TABS = ['fijos','variables','cdr','resultado','tesoreria','pe','capex'];
  const GF_PERSONAL = ['RETRIBUCIÓN EMPRESARIO','SS AUTÓNOMOS','SUELDO BRUTO PERSONAL','SS EMPRESA'];
  const GF_FIJOS = ['ALQUILER','SEGURO DEL LOCAL','TASAS MUNICIPALES','ELECTRICIDAD','GAS','AGUA','INTERNET/TELEFONÍA','GESTORÍA','SOFTWARE/TPV','COMISIONES BANCARIAS','PRÉSTAMOS','MANTENIMIENTO','PUBLICIDAD','OTROS GASTOS FIJOS'];
  const VARIABLE_CATEGORIES = ['MATERIA PRIMA','BEBIDAS','CAFÉ/INFUSIONES','PACKAGING','CONSUMIBLES','LIMPIEZA','COMISIONES VENTA','MANO DE OBRA EXTRA','OTROS'];
  let activeMonth = new Date().getMonth(), editingGF = null, editingCX = null;
  let cdrYear = new Date().getFullYear();
  let distPctLoaded = false;
  let platosPeriod = 'mes', platosFrom = '', platosTo = '';
  const currentYear = new Date().getFullYear();

  function ge(){ return DB.ge; }
  function fijos(){ return ge().fijos; }
  function variables(){ return ge().variables; }
  function capex(){ return ge().capex; }
  function config(){ return ge().config; }

  function proveedores(){ return [...new Set(DB.ingredients.map(i=>i.supplier).filter(Boolean))]; }

  function init(){ tab('fijos'); }
  function tab(t){
    document.querySelectorAll('#ge-tabs-row .ge-tab').forEach((b,i)=>b.classList.toggle('active', TABS[i]===t));
    document.querySelectorAll('#view-economia .ge-tab-panel').forEach(el=>el.classList.remove('active'));
    document.getElementById('ge-'+t).classList.add('active');
    if(t==='fijos') renderFijos();
    if(t==='variables') renderVariables();
    if(t==='cdr') renderCDR();
    if(t==='pe') renderPE();
    if(t==='capex') renderCapex();
    if(t==='resultado') renderResultado();
    if(t==='tesoreria') renderTesoreria();
  }

  /* -- Helpers -- */
  function totalFijos(){ return fijos().reduce((s,g)=>s+gfMonthlyImporte(g),0); }
  function totalPersonal(){ return fijos().filter(g=>g.categoria==='PERSONAL').reduce((s,g)=>s+gfMonthlyImporte(g),0); }
  function totalGF(){ return fijos().filter(g=>g.categoria==='FIJOS').reduce((s,g)=>s+gfMonthlyImporte(g),0); }
  function variablesMes(mes, año=currentYear){ return variables().filter(v=>parseInt(v.mes)===mes && parseInt(v.año)===año); }
  function totalVariablesMes(mes, año=currentYear){ return variablesMes(mes,año).reduce((s,v)=>s+parseFloat(v.importe||0),0); }
  function facturacionMes(mes, año=currentYear){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    return DB.sales.filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v)=>s+parseFloat(v.total||0),0);
  }
  // % de IVA incluido en los precios de venta (configurado en Ajustes > Facturación, por defecto 10%)
  function ivaVentasPct(){
    return (DB.business.ticket && DB.business.ticket.ivaPct!=null) ? parseFloat(DB.business.ticket.ivaPct) : 10;
  }
  // Facturación sin IVA: el IVA cobrado no es ingreso del negocio, hay que reservarlo para Hacienda.
  function facturacionNetaMes(mes, año=currentYear){
    return facturacionMes(mes,año) / (1 + ivaVentasPct()/100);
  }
  function ivaVentasMes(mes, año=currentYear){
    return facturacionMes(mes,año) - facturacionNetaMes(mes,año);
  }
  // % de IVA incluido en lo que pagas a tus proveedores (compras de Gastos Variables), configurable, por defecto 10%
  function ivaComprasPct(){
    return config().ivaComprasPct!=null ? parseFloat(config().ivaComprasPct) : 10;
  }
  // Coste de compras sin IVA: el IVA pagado a proveedores es deducible (no es coste real).
  function totalVariablesNetoMes(mes, año=currentYear){
    return totalVariablesMes(mes,año) / (1 + ivaComprasPct()/100);
  }
  function ivaSoportadoComprasMes(mes, año=currentYear){
    return totalVariablesMes(mes,año) - totalVariablesNetoMes(mes,año);
  }
  // IVA soportado en inversiones CAPEX compradas ese mes (deducible en el periodo de la compra).
  function ivaSoportadoCapexMes(mes, año=currentYear){
    return capex().filter(c=>c.fecha).reduce((s,c)=>{
      const [fy,fm] = c.fecha.split('-').map(Number);
      if(fy===año && (fm-1)===mes) return s + parseFloat(c.importe||0)*(parseFloat(c.iva||0)/100);
      return s;
    }, 0);
  }
  // IVA neto a liquidar con Hacienda (modelo 303): repercutido en ventas menos soportado en compras e inversiones.
  // Si es negativo, Hacienda te lo debe a ti (a tu favor).
  function ivaLiquidarMes(mes, año=currentYear){
    return ivaVentasMes(mes,año) - ivaSoportadoComprasMes(mes,año) - ivaSoportadoCapexMes(mes,año);
  }
  // Comisiones de apps de delivery (Glovo, Uber Eats...) calculadas automáticamente
  // sobre las ventas del mes que llegaron por esas plataformas.
  function comisionesMes(mes, año=currentYear){
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    return DB.sales.filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v)=>s+parseFloat(v.comisionPlataforma||0),0);
  }
  // Cuota mensual de inversiones CAPEX financiadas a plazos, mientras dure el pago.
  function capexCuotaMes(mes, año=currentYear){
    return capex().filter(c=>c.financiado && c.cuotaMensual && c.fecha).reduce((s,c)=>{
      const [fy,fm] = c.fecha.split('-').map(Number);
      const elapsed = (año*12+mes) - (fy*12+(fm-1));
      const cuotas = parseInt(c.cuotas)||0;
      return s + (elapsed>=0 && elapsed<cuotas ? parseFloat(c.cuotaMensual||0) : 0);
    }, 0);
  }
  // Resultado antes de impuestos: facturación neta de IVA menos todos los gastos (compras sin IVA, ya que ese IVA es deducible).
  function resultadoAntesImpMes(mes, año=currentYear){
    return facturacionNetaMes(mes,año) - totalVariablesNetoMes(mes,año) - totalFijos() - comisionesMes(mes,año) - capexCuotaMes(mes,año);
  }
  // Resultado Neto: lo que realmente te llevas, después de IVA e impuesto sobre beneficios.
  function resultadoMes(mes, año=currentYear){
    const r = resultadoAntesImpMes(mes,año);
    const pctImp = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;
    return r>0 ? r*(1-pctImp) : r;
  }

  /* -- GASTOS FIJOS -- */
  function renderFijos(){
    const personal = fijos().filter(g=>g.categoria==='PERSONAL');
    const generales = fijos().filter(g=>g.categoria==='FIJOS');
    const tp = totalPersonal(), tg = totalGF(), tot = tp+tg;
    document.getElementById('gf-kpis').innerHTML = `
      <div class="ge-kpi"><div class="lbl">Personal mensual</div><div class="val">${fmtMoney(tp)}</div></div>
      <div class="ge-kpi"><div class="lbl">Gastos fijos generales</div><div class="val">${fmtMoney(tg)}</div></div>
      <div class="ge-kpi"><div class="lbl">Total mensual</div><div class="val" style="color:var(--teal)">${fmtMoney(tot)}</div></div>`;
    renderGFList('gf-personal', personal);
    const gfNames = new Set(personal.map(g => g.nombre.trim().toLowerCase()));
    const empSuggestions = DB.employees.filter(e => !gfNames.has(e.name.trim().toLowerCase()));
    const sugBox = document.getElementById('gf-personal');
    if(empSuggestions.length){
      sugBox.insertAdjacentHTML('beforeend', `
        <div style="padding:8px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <span style="font-size:12px;color:var(--muted)"><i class="ti ti-users"></i> Empleados sin coste asignado:</span>
          ${empSuggestions.map(e => `<button class="btn btn-sm" onclick="GE.newGFFromEmployee('${escapeJsAttr(e.name)}')" style="font-weight:600"><i class="ti ti-plus"></i> ${escapeHtml(e.name)}</button>`).join('')}
        </div>`);
    }
    renderGFList('gf-fijos', generales);
    document.getElementById('gf-total-val').textContent = fmtMoney(tot);

    const fac12 = MESES.map((_,i)=>facturacionMes(i)).reduce((s,v)=>s+v,0)/12;
    const visEl = document.getElementById('gf-dist-visual');
    const visContent = document.getElementById('gf-visual-content');
    if(fac12 > 0){
      visEl.style.display = 'block';
      const items = [
        {lbl:'Personal', v:tp, pct:tp/fac12*100, color:'var(--blue)'},
        {lbl:'Gastos Fijos', v:tg, pct:tg/fac12*100, color:'var(--purple)'},
      ];
      visContent.innerHTML = items.map(it=>`
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:600">${it.lbl}</span>
            <span style="font-family:monospace">${fmtMoney(it.v)} · <span style="color:${it.pct>35?'var(--red)':'var(--teal-d)'}">${it.pct.toFixed(1)}% ventas</span></span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.min(it.pct/50*100,100)}%;background:${it.color};border-radius:4px;transition:width .4s"></div>
          </div>
        </div>`).join('');
    }else{
      visEl.style.display = 'none';
    }
  }
  const GF_PERIODOS = [
    {v:1, lbl:'Mensual'}, {v:2, lbl:'Cada 2 meses (bimestral)'}, {v:3, lbl:'Cada 3 meses (trimestral)'},
    {v:4, lbl:'Cada 4 meses (cuatrimestral)'}, {v:6, lbl:'Cada 6 meses (semestral)'}, {v:12, lbl:'Cada 12 meses (anual)'}
  ];
  function renderGFList(elId, items){
    document.getElementById(elId).innerHTML = items.length ? items.map(g=>{
      const periodoMeses = parseInt(g.periodicidadMeses)||1;
      const mensual = gfMonthlyImporte(g);
      const detalles = [];
      if(g.diaPago) detalles.push(`día ${g.diaPago}`);
      if(periodoMeses>1) detalles.push(`cada ${periodoMeses} meses · ${fmtMoney(parseFloat(g.importe||0))}/pago`);
      if(g.autoCalc) detalles.push(`Neto ${fmtMoney(parseFloat(g.sueldoNeto||0))} + retenciones = Bruto ${fmtMoney(g.sueldoBruto||0)} + SS Empresa ${fmtMoney(g.ssEmpresa||0)}`);
      return `
      <div class="ge-item" style="flex-wrap:wrap">
        <span style="flex:1;font-size:14px;font-weight:500;min-width:140px">${escapeHtml(g.nombre)}</span>
        <span style="font-family:monospace;font-weight:700;font-size:14px;min-width:80px;text-align:right">${fmtMoney(mensual)}${periodoMeses>1?'<span style="font-size:10px;color:var(--muted);font-weight:400">/mes</span>':''}</span>
        <button class="btn btn-sm btn-icon" onclick="GE.editGF(${g.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteGF(${g.id})"><i class="ti ti-trash"></i></button>
        ${detalles.length || g.notas ? `<div style="flex-basis:100%;font-size:11.5px;color:var(--muted)">${detalles.join(' · ')}${g.notas?`${detalles.length?' · ':''}<i class="ti ti-note"></i> ${escapeHtml(g.notas)}`:''}</div>` : ''}
      </div>`;
    }).join('')
    : `<div class="empty" style="padding:12px 16px">Sin gastos. Añade el primero.</div>`;
  }
  function newGF(cat){
    editingGF = null;
    openGFModal(cat==='PERSONAL'?'Personal (nómina/SS)':'Gasto fijo', {nombre:'',importe:'',diaPago:'',categoria:cat, periodicidadMeses:1});
  }
  function newGFFromEmployee(name){
    editingGF = null;
    openGFModal('Personal (nómina/SS)', {nombre:name,importe:'',diaPago:'',categoria:'PERSONAL', periodicidadMeses:1});
  }
  function editGF(id){
    const g = fijos().find(x=>x.id===id); if(!g) return;
    editingGF = id;
    openGFModal('Editar gasto', g);
  }
  function openGFModal(title, g){
    const sugerencias = (g.categoria==='PERSONAL'?GF_PERSONAL:GF_FIJOS).map(s=>`<option value="${s}">`).join('');
    const autoCalc = !!g.autoCalc;
    openModal(`
      <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="field">
        <label>Concepto</label>
        <input type="text" id="gf-f-nombre" list="gf-sugerencias" value="${escapeHtml(g.nombre)}">
        <datalist id="gf-sugerencias">${sugerencias}</datalist>
      </div>
      ${g.categoria==='PERSONAL' ? `
      <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:10px;cursor:pointer">
        <input type="checkbox" id="gf-f-autocalc" ${autoCalc?'checked':''} onchange="GE.toggleGFAutoCalc()" style="width:auto">
        Calcular el coste total a partir del sueldo neto (incluye Seguridad Social a cargo de la empresa)
      </label>
      <div id="gf-autocalc-fields" style="display:${autoCalc?'block':'none'}">
        <div class="field-row">
          <div class="field"><label>Sueldo neto mensual (€)</label><input type="number" id="gf-f-neto" min="0" step="0.01" value="${g.sueldoNeto||''}" oninput="GE.recalcGFAuto()"></div>
          <div class="field"><label>% Retenciones (IRPF + SS trabajador)</label><input type="number" id="gf-f-retpct" min="0" max="99" step="0.1" value="${g.retPct!=null?g.retPct:15}" oninput="GE.recalcGFAuto()"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>% Seguridad Social empresa (sobre el bruto)</label><input type="number" id="gf-f-sspct" min="0" max="100" step="0.1" value="${g.ssPct!=null?g.ssPct:30}" oninput="GE.recalcGFAuto()"></div>
        </div>
        <div class="ge-kpi-grid" style="margin-bottom:10px">
          <div class="ge-kpi"><div class="lbl">Sueldo bruto</div><div class="val" id="gf-auto-bruto">0,00 €</div></div>
          <div class="ge-kpi"><div class="lbl">SS Empresa</div><div class="val" id="gf-auto-ss">0,00 €</div></div>
          <div class="ge-kpi"><div class="lbl">Coste total empresa</div><div class="val" id="gf-auto-total" style="color:var(--teal)">0,00 €</div></div>
        </div>
      </div>
      ` : ''}
      <div class="field-row">
        <div class="field"><label>Importe (€) ${autoCalc?'<span class="ge-auto">AUTO</span>':''}</label><input type="number" id="gf-f-importe" min="0" step="0.01" value="${g.importe}" ${autoCalc?'readonly':''}></div>
        <div class="field"><label>Día de pago</label><input type="number" id="gf-f-dia" min="1" max="31" placeholder="25" value="${g.diaPago||''}"></div>
      </div>
      <div class="field">
        <label>Periodicidad del pago</label>
        <select id="gf-f-periodo">
          ${GF_PERIODOS.map(p=>`<option value="${p.v}" ${(parseInt(g.periodicidadMeses)||1)===p.v?'selected':''}>${p.lbl}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Comentario (opcional)</label>
        <textarea id="gf-f-notas" rows="2" placeholder="Notas internas sobre este gasto...">${escapeHtml(g.notas||'')}</textarea>
      </div>
      <input type="hidden" id="gf-f-cat" value="${g.categoria}">
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="GE.saveGF()">Guardar</button>
      </div>
    `);
    if(autoCalc) recalcGFAuto();
  }
  function toggleGFAutoCalc(){
    const on = document.getElementById('gf-f-autocalc').checked;
    document.getElementById('gf-autocalc-fields').style.display = on ? 'block' : 'none';
    const importeInput = document.getElementById('gf-f-importe');
    importeInput.readOnly = on;
    if(on) recalcGFAuto();
  }
  // Sueldo bruto = neto / (1 - retenciones%); SS empresa = bruto * ss%; coste total = bruto + SS empresa.
  function recalcGFAuto(){
    const neto = parseFloat(document.getElementById('gf-f-neto').value) || 0;
    const retPct = parseFloat(document.getElementById('gf-f-retpct').value) || 0;
    const ssPct = parseFloat(document.getElementById('gf-f-sspct').value) || 0;
    const bruto = retPct < 100 ? neto / (1 - retPct/100) : 0;
    const ssEmpresa = bruto * ssPct/100;
    const total = bruto + ssEmpresa;
    document.getElementById('gf-auto-bruto').textContent = fmtMoney(bruto);
    document.getElementById('gf-auto-ss').textContent = fmtMoney(ssEmpresa);
    document.getElementById('gf-auto-total').textContent = fmtMoney(total);
    document.getElementById('gf-f-importe').value = total.toFixed(2);
  }
  function saveGF(){
    const nombre = document.getElementById('gf-f-nombre').value.trim();
    const importe = parseFloat(document.getElementById('gf-f-importe').value);
    if(!nombre){ showToast(t('msg.conceptRequired')); return; }
    if(isNaN(importe) || importe<0){ showToast(t('msg.enterAmount')); return; }
    const data = {
      nombre:nombre.toUpperCase(), importe, diaPago:parseInt(document.getElementById('gf-f-dia').value)||null,
      categoria:document.getElementById('gf-f-cat').value,
      periodicidadMeses: parseInt(document.getElementById('gf-f-periodo').value)||1,
      notas: document.getElementById('gf-f-notas').value.trim()
    };
    const autocalcEl = document.getElementById('gf-f-autocalc');
    if(autocalcEl && autocalcEl.checked){
      const neto = parseFloat(document.getElementById('gf-f-neto').value) || 0;
      const retPct = parseFloat(document.getElementById('gf-f-retpct').value) || 0;
      const ssPct = parseFloat(document.getElementById('gf-f-sspct').value) || 0;
      const bruto = retPct < 100 ? neto / (1 - retPct/100) : 0;
      data.autoCalc = true;
      data.sueldoNeto = neto;
      data.retPct = retPct;
      data.ssPct = ssPct;
      data.sueldoBruto = bruto;
      data.ssEmpresa = bruto * ssPct/100;
    }else{
      data.autoCalc = false;
      delete data.sueldoNeto; delete data.retPct; delete data.ssPct; delete data.sueldoBruto; delete data.ssEmpresa;
    }
    if(editingGF){
      const existing = fijos().find(x=>x.id===editingGF);
      Object.keys(existing).forEach(k=>delete existing[k]);
      Object.assign(existing, {id:editingGF}, data);
    }else{
      fijos().push({id:genId(), ...data});
    }
    saveDB();
    closeModal();
    renderFijos();
    showToast(t('msg.expenseSaved'));
  }
  function deleteGF(id){
    if(!confirm(t('msg.confirmDeleteGeneric'))) return;
    ge().fijos = fijos().filter(g=>g.id!==id);
    saveDB();
    renderFijos();
  }

  /* -- GASTOS VARIABLES -- */
  function renderVariables(){
    document.getElementById('gv-months').innerHTML = MESES.map((m,i)=>`
      <div class="month-pill${i===activeMonth?' active':''}" onclick="GE.setMonth(${i})">${m}</div>`).join('');
    const mes = activeMonth, tvMes = totalVariablesMes(mes), fac = facturacionMes(mes);
    const fcPct = fac>0 ? (tvMes/fac*100) : 0;
    document.getElementById('gv-sec-title').textContent = `Compras — ${MESES[mes]} ${currentYear}`;
    document.getElementById('gv-kpis').innerHTML = `
      <div class="ge-kpi"><div class="lbl">Total compras mes</div><div class="val">${fmtMoney(tvMes)}</div></div>
      <div class="ge-kpi"><div class="lbl">Facturación mes <span class="ge-auto">TPV</span></div><div class="val">${fmtMoney(fac)}</div></div>
      <div class="ge-kpi"><div class="lbl">Food cost real</div><div class="val" style="color:${fcPct>(config().foodCostObj||35)?'var(--red)':fcPct>0?'var(--green)':'var(--muted)'}">${fac>0?fcPct.toFixed(1)+'%':'—'}</div><div class="sub">Objetivo: ${config().foodCostObj||35}%</div></div>`;
    const items = variablesMes(mes);
    const list = document.getElementById('gv-list');
    const empty = document.getElementById('gv-empty');
    if(!items.length){ list.innerHTML=''; empty.style.display='block'; }
    else{
      empty.style.display='none';
      const bycat = {};
      items.forEach(v=>{ (bycat[v.categoria] = bycat[v.categoria]||[]).push(v); });
      list.innerHTML = Object.entries(bycat).map(([cat,its])=>{
        const autoItems = its.filter(v=>v.auto);
        const manualItems = its.filter(v=>!v.auto);
        const byProv = {};
        autoItems.forEach(v=>{ (byProv[v.proveedor||'—'] = byProv[v.proveedor||'—']||[]).push(v); });
        const autoHtml = Object.entries(byProv).map(([prov,vs])=>{
          const total = vs.reduce((s,v)=>s+parseFloat(v.importe||0),0);
          const ids = vs.map(v=>v.id).join(',');
          return `<div class="ge-item">
            <span style="flex:1;font-size:14px">${escapeHtml(prov)} <span class="badge badge-gray" style="font-size:10px;font-weight:400"><i class="ti ti-truck-delivery"></i> Pedidos recibidos</span></span>
            <span style="font-family:monospace;font-weight:700">${fmtMoney(total)}</span>
            <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteGVGroup('${ids}')"><i class="ti ti-trash"></i></button>
          </div>`;
        }).join('');
        const manualHtml = manualItems.map(v=>`<div class="ge-item">
          <span style="flex:1;font-size:14px">${escapeHtml(v.proveedor||'—')}</span>
          <span style="font-size:12px;color:var(--muted);margin-right:8px">${escapeHtml(v.fecha||'')}</span>
          <span style="font-family:monospace;font-weight:700">${fmtMoney(parseFloat(v.importe||0))}</span>
          <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteGV(${v.id})"><i class="ti ti-trash"></i></button>
        </div>`).join('');
        return `<div style="padding:8px 16px;background:var(--bg);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);border-bottom:1px solid var(--border)">${escapeHtml(cat)}</div>${autoHtml}${manualHtml}`;
      }).join('');
    }
    document.getElementById('gv-total-lbl').textContent = `TOTAL VARIABLES ${MESES[mes].toUpperCase()}`;
    document.getElementById('gv-total-val').textContent = fmtMoney(tvMes);
  }
  function setMonth(m){ activeMonth = m; renderVariables(); }
  function newGV(){
    const provs = proveedores().map(p=>`<option value="${escapeHtml(p)}">`).join('');
    const fecha = `${currentYear}-${String(activeMonth+1).padStart(2,'0')}-01`;
    openModal(`
      <div class="modal-header"><h3>Añadir compra</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="field">
        <label>Categoría</label>
        <select id="gv-f-cat">${VARIABLE_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>Proveedor</label>
        <input type="text" id="gv-f-prov" list="gv-prov-list">
        <datalist id="gv-prov-list">${provs}</datalist>
      </div>
      <div class="field-row">
        <div class="field"><label>Importe (€)</label><input type="number" id="gv-f-imp" min="0" step="0.01"></div>
        <div class="field"><label>Fecha</label><input type="date" id="gv-f-fecha" value="${fecha}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
        <button class="btn btn-primary" onclick="GE.saveGV()">${t("common.save")}</button>
      </div>
    `);
  }
  function saveGV(){
    const imp = parseFloat(document.getElementById('gv-f-imp').value);
    if(isNaN(imp) || imp<=0){ showToast(t('msg.enterAmount')); return; }
    variables().push({
      id: genId(), mes: activeMonth, año: currentYear,
      categoria: document.getElementById('gv-f-cat').value,
      proveedor: document.getElementById('gv-f-prov').value.trim().toUpperCase() || 'SIN PROVEEDOR',
      importe: imp,
      fecha: document.getElementById('gv-f-fecha').value
    });
    saveDB();
    closeModal();
    renderVariables();
    showToast(t('msg.purchaseSaved'));
  }
  function deleteGV(id){
    if(!confirm(t('msg.confirmDeleteGeneric'))) return;
    ge().variables = variables().filter(v=>v.id!==id);
    saveDB();
    renderVariables();
  }
  function deleteGVGroup(idsStr){
    if(!confirm(t('msg.confirmDeletePurchases'))) return;
    const ids = idsStr.split(',').map(s=>parseInt(s));
    ge().variables = variables().filter(v=>!ids.includes(v.id));
    saveDB();
    renderVariables();
  }

  /* -- CUENTA DE RESULTADOS -- */
  function setCDRYear(delta){ cdrYear += delta; renderCDR(); }
  function renderCDR(){
    const yearSel = document.getElementById('cdr-year');
    if(yearSel) yearSel.textContent = cdrYear;
    const tf = totalFijos();
    const ivaPct = ivaVentasPct();
    const pctImp = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;
    const rows = [
      {lbl:'Facturación (TPV, IVA incl.)', vals:MESES.map((_,i)=>facturacionMes(i,cdrYear)), auto:true, bold:true},
      {lbl:`IVA repercutido (ventas, ${ivaPct}%)`, vals:MESES.map((_,i)=>-ivaVentasMes(i,cdrYear)), auto:true},
      {lbl:'Facturación neta', vals:MESES.map((_,i)=>facturacionNetaMes(i,cdrYear)), auto:true, highlight:true, bold:true},
      {lbl:`Gastos Variables (sin IVA, ${ivaComprasPct()}%)`, vals:MESES.map((_,i)=>-totalVariablesNetoMes(i,cdrYear)), auto:true},
      {lbl:'Gastos Fijos', vals:MESES.map(()=>-tf), auto:true},
      {lbl:'Comisiones Apps Delivery', vals:MESES.map((_,i)=>-comisionesMes(i,cdrYear)), auto:true},
      {lbl:'Cuotas inversión financiada', vals:MESES.map((_,i)=>-capexCuotaMes(i,cdrYear)), auto:true},
      {lbl:'Resultado Antes de Impuestos', vals:MESES.map((_,i)=>resultadoAntesImpMes(i,cdrYear)), highlight:true, isResult:true},
      {lbl:`Impuesto sobre beneficios (${(pctImp*100).toFixed(0)}%)`, vals:MESES.map((_,i)=>{ const r=resultadoAntesImpMes(i,cdrYear); return r>0?-(r*pctImp):0; }), auto:true},
      {lbl:'Resultado Neto', vals:MESES.map((_,i)=>resultadoMes(i,cdrYear)), auto:true, highlight:true, isResult:true},
      {lbl:'IVA a liquidar con Hacienda (modelo 303)', vals:MESES.map((_,i)=>ivaLiquidarMes(i,cdrYear)), auto:true, ivaRow:true},
    ];
    const quarters = ['T1','T2','T3','T4'];
    let html = `<thead><tr><th>Concepto</th>${MESES.map(m=>`<th>${m}</th>`).join('')}${quarters.map(q=>`<th style="background:var(--dark);color:#fff">${q}</th>`).join('')}<th style="background:var(--dark);color:#fff">AÑO</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      const total = r.vals.reduce((s,v)=>s+v,0);
      const q = [0,1,2,3].map(qi=>r.vals.slice(qi*3,qi*3+3).reduce((s,v)=>s+v,0));
      const cls = r.highlight ? (r.isResult?'total':'highlight') : '';
      html += `<tr class="${cls}"><td>${r.lbl}${r.auto?'<span class="ge-auto">AUTO</span>':''}</td>`;
      if(r.ivaRow){
        r.vals.forEach(v=>{
          const c = v>0?'neg':(v<0?'pos':'');
          const suf = v>0?' a pagar':(v<0?' a tu favor':'');
          html += `<td class="${c}">${v!==0?fmtMoney(Math.abs(v))+suf:'—'}</td>`;
        });
        q.forEach(v=>{ const c = v>0?'neg':(v<0?'pos':''); const suf = v>0?' a pagar':(v<0?' a tu favor':''); html += `<td style="background:rgba(0,0,0,.05)" class="${c}">${v!==0?fmtMoney(Math.abs(v))+suf:'—'}</td>`; });
        const c = total>0?'neg':(total<0?'pos':''); const suf = total>0?' a pagar':(total<0?' a tu favor':'');
        html += `<td style="background:rgba(0,0,0,.1)" class="${c}">${total!==0?fmtMoney(Math.abs(total))+suf:'—'}</td></tr>`;
      } else {
        r.vals.forEach(v=>{
          const c = r.isResult ? (v>=0?'pos':'neg') : '';
          const sign = r.isResult && v<0 ? '-' : '';
          html += `<td class="${c}">${v!==0?sign+fmtMoney(Math.abs(v)):'—'}</td>`;
        });
        q.forEach(v=>{ html += `<td style="background:rgba(0,0,0,.05)">${v!==0?(r.isResult&&v<0?'-':'')+fmtMoney(Math.abs(v)):'—'}</td>`; });
        html += `<td style="background:rgba(0,0,0,.1)">${total!==0?(r.isResult&&total<0?'-':'')+fmtMoney(Math.abs(total)):'—'}</td></tr>`;
      }
    });
    html += '</tbody>';
    document.getElementById('cdr-table').innerHTML = html;
    document.getElementById('cdr-chart').innerHTML = barChartHTML(MESES.map((m,i)=>({lbl:m, v:resultadoMes(i,cdrYear)})));
  }

  /* -- PUNTO DE EQUILIBRIO -- */
  function renderPE(){
    const tf = totalFijos();
    document.getElementById('pe-fijos').value = tf.toFixed(2);
    document.getElementById('pe-ticket').value = config().ticketMedio || '';
    document.getElementById('pe-cubiertos').value = config().cubiertosActuales || '';
    document.getElementById('pe-dias').value = config().diasApertura || '';
    document.getElementById('pe-fc').value = config().foodCostObj || 35;
    calcPE();
  }
  function calcPE(){
    const fij = parseFloat(document.getElementById('pe-fijos').value) || 0;
    const tick = parseFloat(document.getElementById('pe-ticket').value) || 0;
    const cub = parseFloat(document.getElementById('pe-cubiertos').value) || 0;
    const dias = parseFloat(document.getElementById('pe-dias').value) || 0;
    const fc = parseFloat(document.getElementById('pe-fc').value) || 35;
    Object.assign(config(), {ticketMedio:tick, cubiertosActuales:cub, diasApertura:dias, foodCostObj:fc});
    saveDB();
    if(!tick || !dias){
      ['pe-r1','pe-r2','pe-r3','pe-r4','pe-r5','pe-r6'].forEach(id=>document.getElementById(id).textContent='—');
      return;
    }
    const cvCub = tick*(fc/100);
    const contribCub = tick - cvCub;
    if(contribCub<=0){ document.getElementById('pe-r3').textContent='No calculable'; return; }
    const cubNec = Math.ceil(fij/contribCub);
    const cubDia = Math.ceil(cubNec/dias);
    const ventasMin = cubNec*tick;
    document.getElementById('pe-r1').textContent = fmtMoney(cvCub)+'/cubierto';
    document.getElementById('pe-r2').textContent = fmtMoney(contribCub)+'/cubierto';
    document.getElementById('pe-r3').textContent = cubNec+' cubiertos/mes';
    document.getElementById('pe-r4').textContent = cubDia+' cubiertos/día';
    document.getElementById('pe-r5').textContent = fmtMoney(ventasMin);
    const diff = cub - cubNec;
    document.getElementById('pe-r6').textContent = (diff>=0?'+':'')+diff+' cubiertos';
    const estadoEl = document.getElementById('pe-estado');
    estadoEl.textContent = diff>=0 ? '✅ Por encima del equilibrio' : '⚠️ Por debajo del equilibrio';
    estadoEl.style.color = diff>=0 ? 'var(--green)' : 'var(--red)';
    peGauge(cub, cubNec);
  }
  function peGauge(cub, cubNec){
    const el = document.getElementById('pe-gauge'); if(!el) return;
    const max = Math.max(cub, cubNec, 1)*1.2;
    const pctAct = Math.min(cub/max*100, 100);
    const pctNec = Math.min(cubNec/max*100, 100);
    const ok = cub >= cubNec;
    el.innerHTML = `
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px;display:flex;justify-content:space-between">
        <span>0</span><span style="color:var(--amber-dark);font-weight:600">Equilibrio: ${cubNec} cub.</span><span>${Math.ceil(max)}</span>
      </div>
      <div style="position:relative;height:28px;background:var(--border);border-radius:6px;overflow:visible">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctAct}%;background:${ok?'var(--teal)':'var(--red)'};border-radius:6px;transition:width .4s"></div>
        <div style="position:absolute;left:${pctNec}%;top:-4px;height:36px;width:3px;background:var(--amber-dark);border-radius:2px"></div>
        <div style="position:absolute;left:${pctNec}%;top:34px;transform:translateX(-50%);font-size:10px;color:var(--amber-dark);font-weight:700;white-space:nowrap">← equilibrio</div>
      </div>
      <div style="margin-top:24px;font-size:13px;font-weight:600;color:${ok?'var(--green)':'var(--red)'}">
        ${ok?'✅ Estás por encima del equilibrio':'⚠️ Estás por debajo del equilibrio'} · ${cub} cubiertos actuales
      </div>`;
  }

  /* -- CAPEX -- */
  function renderCapex(){
    const tbody = document.getElementById('capex-tbody');
    const empty = document.getElementById('capex-empty');
    if(!capex().length){
      tbody.innerHTML='';
      empty.style.display='block';
      ['capex-base','capex-iva','capex-total'].forEach(id=>document.getElementById(id).textContent='—');
      return;
    }
    empty.style.display='none';
    let base=0, ivaT=0;
    tbody.innerHTML = capex().map(c=>{
      const imp=parseFloat(c.importe||0), ivaPct=parseFloat(c.iva||0);
      const ivaAmt=imp*ivaPct/100, tot=imp+ivaAmt;
      base+=imp; ivaT+=ivaAmt;
      const cs = c.estadoPago==='PAGADO' ? {bg:'var(--green-l)',tx:'var(--green)'}
        : c.estadoPago==='PARCIAL' ? {bg:'var(--amber-l)',tx:'var(--amber-dark)'}
        : {bg:'var(--red-l)',tx:'var(--red)'};
      let financInfo = '—';
      if(c.financiado && c.fecha){
        const [fy,fm] = c.fecha.split('-').map(Number);
        const now = new Date();
        const elapsed = (now.getFullYear()*12+now.getMonth()) - (fy*12+(fm-1));
        const cuotas = parseInt(c.cuotas)||0;
        const pagadas = Math.min(Math.max(elapsed,0), cuotas);
        const restantes = Math.max(cuotas-pagadas, 0);
        financInfo = `${fmtMoney(c.cuotaMensual||0)}/mes · ${restantes>0?restantes+' cuotas restantes':'pagado'}`;
      }
      return `<tr>
        <td style="text-align:left;font-weight:600">${escapeHtml(c.descripcion)}</td>
        <td>${escapeHtml(c.fecha||'—')}</td>
        <td>${fmtMoney(imp)}</td>
        <td>${fmtMoney(ivaAmt)}</td>
        <td>${fmtMoney(tot)}</td>
        <td><span class="badge" style="background:${cs.bg};color:${cs.tx}">${c.estadoPago}</span></td>
        <td style="font-size:12px">${financInfo}</td>
        <td style="text-align:left">
          <button class="btn btn-sm btn-icon" onclick="GE.editCapex(${c.id})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-icon btn-danger" onclick="GE.deleteCapex(${c.id})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
    document.getElementById('capex-base').textContent = fmtMoney(base);
    document.getElementById('capex-iva').textContent = fmtMoney(ivaT);
    document.getElementById('capex-total').textContent = fmtMoney(base+ivaT);
  }
  function newCapex(){
    editingCX = null;
    openCapexModal('Nueva inversión', {descripcion:'', importe:'', iva:21, fecha:todayStr(), estadoPago:'PENDIENTE', financiado:false, cuotaMensual:'', cuotas:''});
  }
  function editCapex(id){
    const c = capex().find(x=>x.id===id); if(!c) return;
    editingCX = id;
    openCapexModal('Editar inversión', c);
  }
  function toggleCapexFinanciado(){
    const checked = document.getElementById('cx-f-financiado').checked;
    document.getElementById('cx-f-cuotas-row').style.display = checked ? 'flex' : 'none';
  }
  function openCapexModal(title, c){
    openModal(`
      <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="field"><label>Descripción</label><input type="text" id="cx-f-desc" value="${escapeHtml(c.descripcion)}"></div>
      <div class="field-row">
        <div class="field"><label>Importe (€)</label><input type="number" id="cx-f-imp" min="0" step="0.01" value="${c.importe}"></div>
        <div class="field"><label>IVA (%)</label><input type="number" id="cx-f-iva" min="0" max="100" value="${c.iva||21}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Fecha</label><input type="date" id="cx-f-fecha" value="${c.fecha||''}"></div>
        <div class="field"><label>Estado</label>
          <select id="cx-f-estado">
            ${['PAGADO','PENDIENTE','PARCIAL'].map(s=>`<option ${c.estadoPago===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="cx-f-financiado" style="width:auto" ${c.financiado?'checked':''} onchange="GE.toggleCapexFinanciado()">
        <label style="margin:0">Inversión pagada a plazos (financiada)</label>
      </div>
      <div class="field-row" id="cx-f-cuotas-row" style="display:${c.financiado?'flex':'none'}">
        <div class="field"><label>Cuota mensual (€)</label><input type="number" id="cx-f-cuota" min="0" step="0.01" value="${c.cuotaMensual||''}"></div>
        <div class="field"><label>Nº de cuotas</label><input type="number" id="cx-f-numcuotas" min="1" step="1" value="${c.cuotas||''}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
        <button class="btn btn-primary" onclick="GE.saveCapex()">${t("common.save")}</button>
      </div>
    `);
  }
  function saveCapex(){
    const desc = document.getElementById('cx-f-desc').value.trim();
    const imp = parseFloat(document.getElementById('cx-f-imp').value);
    if(!desc){ showToast(t('msg.descRequired')); return; }
    if(isNaN(imp) || imp<=0){ showToast(t('msg.enterAmount')); return; }
    const financiado = document.getElementById('cx-f-financiado').checked;
    const data = {
      descripcion: desc.toUpperCase(), importe: imp,
      iva: parseFloat(document.getElementById('cx-f-iva').value)||0,
      fecha: document.getElementById('cx-f-fecha').value,
      estadoPago: document.getElementById('cx-f-estado').value,
      financiado,
      cuotaMensual: financiado ? (parseFloat(document.getElementById('cx-f-cuota').value)||0) : 0,
      cuotas: financiado ? (parseInt(document.getElementById('cx-f-numcuotas').value)||0) : 0
    };
    if(editingCX){
      Object.assign(capex().find(x=>x.id===editingCX), data);
    }else{
      capex().push({id:genId(), ...data});
    }
    saveDB();
    closeModal();
    renderCapex();
    showToast(t('msg.investmentSaved'));
  }
  function deleteCapex(id){
    if(!confirm(t('msg.confirmDeleteInvestment'))) return;
    ge().capex = capex().filter(c=>c.id!==id);
    saveDB();
    renderCapex();
  }

  /* -- RESULTADO TRIMESTRAL/ANUAL -- */
  function renderResultado(){
    const pctImpEl = document.getElementById('res-pct-impuesto');
    if(pctImpEl) pctImpEl.value = config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25;
    const pctIvaComprasEl = document.getElementById('res-pct-iva-compras');
    if(pctIvaComprasEl) pctIvaComprasEl.value = ivaComprasPct();
    const pctImp = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;

    const tf = totalFijos();
    const qLabels = ['T1 (Ene-Mar)','T2 (Abr-Jun)','T3 (Jul-Sep)','T4 (Oct-Dic)','TOTAL AÑO'];
    const qMonths = [[0,1,2],[3,4,5],[6,7,8],[9,10,11],[0,1,2,3,4,5,6,7,8,9,10,11]];
    function qVal(months, fn){ return months.reduce((s,m)=>s+fn(m), 0); }
    const ivaPct = ivaVentasPct();
    // Resultado antes de impuestos en criterio de caja (cuotas reales de inversión
    // financiada). Coincide con resultadoAntesImpMes para que todas las vistas
    // (Resultado, Cuenta de Resultados, Panel, Tesorería) muestren el mismo número
    // sin doble cómputo (antes restaba además la amortización CAPEX).
    const resAntesImp = m => resultadoAntesImpMes(m);
    const ivaCPct = ivaComprasPct();

    const conceptos = [
      {lbl:'Facturación (TPV, IVA incl.)', fn:m=>facturacionMes(m), bold:true},
      {lbl:`IVA repercutido (ventas, ${ivaPct}%)`, fn:m=>ivaVentasMes(m), auto:true},
      {lbl:'Ventas Netas', fn:m=>facturacionNetaMes(m), highlight:true, bold:true},
      {lbl:`Coste de Ventas (MP, sin IVA, ${ivaCPct}%)`, fn:m=>totalVariablesNetoMes(m)},
      {lbl:'Margen Bruto', fn:m=>facturacionNetaMes(m)-totalVariablesNetoMes(m), highlight:true, bold:true},
      {lbl:'Comisiones Apps Delivery', fn:m=>comisionesMes(m), auto:true},
      {lbl:'Gastos Explotación', fn:()=>tf},
      {lbl:'EBITDA Operativo', fn:m=>facturacionNetaMes(m)-totalVariablesNetoMes(m)-tf-comisionesMes(m), highlight:true, bold:true},
      {lbl:'Cuotas inversión financiada', fn:m=>capexCuotaMes(m), auto:true},
      {lbl:'Resultado Antes Impuestos', fn:resAntesImp, isResult:true, bold:true},
      {lbl:`Impuesto sobre beneficios (${(pctImp*100).toFixed(0)}%)`, fn:m=>{ const r=resAntesImp(m); return r>0?r*pctImp:0; }, auto:true},
      {lbl:'Resultado Neto', fn:m=>{ const r=resAntesImp(m); return r>0?r*(1-pctImp):r; }, isResult:true, bold:true},
    ];
    let html = `<thead><tr><th style="text-align:left">Concepto</th>${qLabels.map(q=>`<th style="background:var(--dark);color:#fff">${q}</th>`).join('')}</tr></thead><tbody>`;
    conceptos.forEach(c=>{
      html += `<tr class="${c.isResult?'total':c.highlight?'highlight':''}"><td>${c.lbl}${c.auto?'<span class="ge-auto">AUTO</span>':''}</td>`;
      qMonths.forEach(months=>{
        const v = qVal(months, c.fn);
        const cls = v<0 ? 'neg' : (c.isResult ? 'pos' : '');
        const sign = v<0 ? '-' : '';
        html += `<td class="${cls}">${sign+fmtMoney(Math.abs(v))}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
    document.getElementById('res-table').innerHTML = html;
  }

  /* -- TESORERÍA -- */
  function renderTesoreria(){
    document.getElementById('te-months').innerHTML = MESES.map((m,i)=>`
      <div class="month-pill${i===activeMonth?' active':''}" onclick="GE.setMonthTe(${i})">${m}</div>`).join('');

    const dp = config().distPct;
    if(dp && !distPctLoaded){
      document.getElementById('te-pct-per').value = dp.per;
      document.getElementById('te-pct-gf').value = dp.gf;
      document.getElementById('te-pct-mp').value = dp.mp;
      document.getElementById('te-pct-og').value = dp.og;
      document.getElementById('te-pct-ben').value = dp.ben;
      distPctLoaded = true;
    }

    const pctPer = (parseFloat(document.getElementById('te-pct-per')?.value)||0)/100;
    const pctGF = (parseFloat(document.getElementById('te-pct-gf')?.value)||0)/100;
    const pctMP = (parseFloat(document.getElementById('te-pct-mp')?.value)||0)/100;
    const pctOG = (parseFloat(document.getElementById('te-pct-og')?.value)||0)/100;
    const pctBen = (parseFloat(document.getElementById('te-pct-ben')?.value)||0)/100;

    const facBruta = facturacionMes(activeMonth);
    const facNeta = facturacionNetaMes(activeMonth);
    const ivaLiquidar = ivaLiquidarMes(activeMonth);

    const pctImp = (config().pctImpuestoBeneficio!=null ? config().pctImpuestoBeneficio : 25)/100;
    const realPerKpi = totalPersonal();
    const realGFKpi = totalGF();
    const realMPKpi = totalVariablesNetoMes(activeMonth);
    const cuotasCapexKpi = capexCuotaMes(activeMonth);
    const realBenKpi = facNeta - realPerKpi - realGFKpi - realMPKpi - cuotasCapexKpi;
    const taxReserve = realBenKpi>0 ? realBenKpi*pctImp : 0;
    const netoDisponible = realBenKpi - taxReserve;

    const ivaLabel = ivaLiquidar>=0 ? 'IVA a pagar (modelo 303)' : 'IVA a tu favor (modelo 303)';
    document.getElementById('te-kpis').innerHTML = `
      <div class="kpi-mini"><div class="l">Facturación bruta</div><div class="v">${fmtMoney(facBruta)}</div><div style="font-size:11px;color:var(--muted)">Desde TPV</div></div>
      <div class="kpi-mini" style="border-color:var(--amber)"><div class="l">${ivaLabel}</div><div class="v" style="color:${ivaLiquidar>=0?'var(--amber-dark)':'var(--green)'}">${fmtMoney(Math.abs(ivaLiquidar))}</div><div style="font-size:11px;color:var(--muted)">IVA repercutido - IVA soportado</div></div>
      <div class="kpi-mini" style="border-color:var(--teal)"><div class="l">Facturación neta</div><div class="v" style="color:var(--teal-d)">${fmtMoney(facNeta)}</div><div style="font-size:11px;color:var(--muted)">Base distribución</div></div>
      <div class="kpi-mini" style="border-color:var(--amber)"><div class="l">Reserva Impuestos (IRPF/IS, ${(pctImp*100).toFixed(0)}%)</div><div class="v" style="color:var(--amber-dark)">${fmtMoney(taxReserve)}</div><div style="font-size:11px;color:var(--muted)">→ Hacienda (sobre beneficio)</div></div>
      <div class="kpi-mini" style="border-color:var(--green)"><div class="l">Beneficio neto disponible</div><div class="v" style="color:${netoDisponible>=0?'var(--green)':'var(--red)'}">${fmtMoney(netoDisponible)}</div><div style="font-size:11px;color:var(--muted)">Tras reservar IVA e impuestos</div></div>`;

    const realPer = totalPersonal();
    const realGF = totalGF();
    const realMP = totalVariablesNetoMes(activeMonth);
    const realOG = capexCuotaMes(activeMonth);
    const realBen = facNeta - realPer - realGF - realMP - realOG;

    const rows = [
      {lbl:'Personal (nóminas + SS)', pct:pctPer, obj:facNeta*pctPer, real:realPer, color:'var(--blue)'},
      {lbl:'Gastos Fijos Generales', pct:pctGF, obj:facNeta*pctGF, real:realGF, color:'var(--purple)'},
      {lbl:'Gastos Variables', pct:pctMP, obj:facNeta*pctMP, real:realMP, color:'var(--red)'},
      {lbl:'Otros Gastos (cuotas financiación)', pct:pctOG, obj:facNeta*pctOG, real:realOG, color:'var(--amber)'},
      {lbl:'Beneficio estimado', pct:pctBen, obj:facNeta*pctBen, real:realBen, color:'var(--teal)', isBen:true},
    ];

    document.getElementById('te-rows').innerHTML = rows.map(r=>{
      const diff = r.real - r.obj;
      const ok = r.isBen ? (r.real>=0) : (Math.abs(diff)/Math.max(r.obj,1) < 0.1);
      const warn = !r.isBen && diff > r.obj*0.1;
      const estado = r.isBen ? (r.real>=0?'✅':'❌') : (ok?'✅':warn?'⚠️':'❌');
      const diffColor = r.isBen ? (r.real>=0?'var(--green)':'var(--red)') : (diff<=0?'var(--green)':'var(--red)');
      const barPct = r.obj>0 ? Math.min(r.real/r.obj*100, 150) : 0;
      const barColor = barPct>110?'var(--red)':barPct>90?'var(--green)':'var(--amber)';
      return `<div class="te-row">
        <span style="font-size:14px;font-weight:600">${r.lbl}</span>
        <span style="text-align:right;font-weight:600;color:${r.color}">${(r.pct*100).toFixed(0)}%</span>
        <span style="text-align:right;font-family:monospace">${fmtMoney(r.obj)}</span>
        <span style="text-align:right;font-family:monospace;font-weight:700">${r.real?fmtMoney(r.real):'—'}</span>
        <span style="text-align:right;font-family:monospace;color:${diffColor}">${r.real?(diff>0?'+':'')+fmtMoney(diff):'—'}</span>
        <span style="text-align:center;font-size:16px">${estado}</span>
      </div>
      <div class="te-bar-wrap"><div class="te-bar-fill" style="width:${Math.min(barPct,100)}%;background:${barColor}"></div></div>`;
    }).join('');

    document.getElementById('te-annual-chart').innerHTML = barChartHTML(MESES.map((m,i)=>({lbl:m, v:resultadoMes(i)})));
  }
  function setMonthTe(m){ activeMonth=m; renderTesoreria(); }
  function adjustDistPct(changedId){
    const ids = ['te-pct-per','te-pct-gf','te-pct-mp','te-pct-og','te-pct-ben'];
    const els = {}; ids.forEach(id=>els[id]=document.getElementById(id));
    const vals = {}; ids.forEach(id=>vals[id]=Math.max(0,Math.min(100,parseFloat(els[id].value)||0)));
    const changedVal = vals[changedId];
    const otherIds = ids.filter(id=>id!==changedId);
    const othersSum = otherIds.reduce((s,id)=>s+vals[id],0);
    const remaining = 100 - changedVal;
    if(othersSum<=0){
      otherIds.forEach(id=>vals[id]=remaining/otherIds.length);
    }else{
      otherIds.forEach(id=>vals[id]=Math.max(0, remaining*vals[id]/othersSum));
    }
    vals[changedId]=changedVal;
    ids.forEach(id=>els[id].value = Math.round(vals[id]*10)/10);
    config().distPct = {per:vals['te-pct-per'], gf:vals['te-pct-gf'], mp:vals['te-pct-mp'], og:vals['te-pct-og'], ben:vals['te-pct-ben']};
    distPctLoaded = true;
    saveDB();
    renderTesoreria();
  }
  function setPctImpuesto(){
    config().pctImpuestoBeneficio = parseFloat(document.getElementById('res-pct-impuesto').value) || 0;
    saveDB();
    renderResultado();
  }
  function setPctIvaCompras(){
    config().ivaComprasPct = parseFloat(document.getElementById('res-pct-iva-compras').value) || 0;
    saveDB();
    renderResultado();
  }

  function barChartHTML(data){
    const vals = data.map(d=>d.v);
    const max = Math.max(...vals.map(Math.abs), 1);
    return data.map(d=>{
      const pct = Math.abs(d.v)/max*100;
      const color = d.v>=0 ? 'var(--teal)' : 'var(--red)';
      return `<div class="bar-col" title="${d.lbl}: ${fmtMoney(d.v)}">
        <div class="bar-fill" style="height:${pct*0.7}px;background:${color}"></div>
        <div class="bar-lbl">${d.lbl}</div>
      </div>`;
    }).join('');
  }

  /* -- ANÁLISIS DE PLATOS -- */
  function getPlatosRange(){
    const today = todayStr();
    if(platosPeriod === 'custom' && platosFrom && platosTo){
      return platosFrom <= platosTo ? {start: platosFrom, end: platosTo} : {start: platosTo, end: platosFrom};
    }
    const d = new Date();
    if(platosPeriod === 'hoy') return {start: today, end: today};
    if(platosPeriod === 'semana') return {start: dateStr(new Date(d.getTime() - 6*86400000)), end: today};
    if(platosPeriod === 'año') return {start: `${d.getFullYear()}-01-01`, end: today};
    if(platosPeriod === 'todo') return {start: '0000-01-01', end: '9999-12-31'};
    return {start: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, end: today}; // mes
  }

  function platosStats(){
    const {start, end} = getPlatosRange();
    const sales = DB.sales.filter(s => s.date >= start && s.date <= end);
    const map = {};
    sales.forEach(sale => {
      (sale.items||[]).forEach(line => {
        const key = line.recipeId ? ('r'+line.recipeId) : ('m'+(line.name||''));
        if(!map[key]){
          const recipe = line.recipeId ? getRecipe(line.recipeId) : null;
          map[key] = {
            name: line.name || '(sin nombre)',
            recipeId: line.recipeId || null,
            category: recipe ? (recipe.category||'Sin categoría') : 'Sin escandallo',
            unitCost: recipe ? recipeCost(recipe) : null,
            units: 0, revenue: 0
          };
        }
        map[key].units += (line.qty||0);
        map[key].revenue += (line.price||0) * (line.qty||0);
      });
    });
    const items = Object.values(map).map(it => {
      const cost = it.unitCost!=null ? it.unitCost * it.units : null;
      const margin = cost!=null ? it.revenue - cost : null;
      const marginPct = (cost!=null && it.revenue>0) ? (margin/it.revenue*100) : null;
      return {...it, cost, margin, marginPct};
    });
    return {start, end, items};
  }

  function renderPlatosPeriodSel(){
    const periods = [{k:'hoy',l:'Hoy'},{k:'semana',l:'Últimos 7 días'},{k:'mes',l:'Este mes'},{k:'año',l:'Este año'},{k:'todo',l:'Todo'}];
    document.getElementById('platos-period-sel').innerHTML = periods.map(p=>`
      <div class="month-pill${platosPeriod===p.k?' active':''}" onclick="GE.setPlatosPeriod('${p.k}')">${p.l}</div>
    `).join('') + `
      <input type="date" id="platos-from-input" value="${platosFrom}" style="border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:12px" onchange="GE.setPlatosCustom()">
      <span style="font-size:12px;color:var(--muted);align-self:center">a</span>
      <input type="date" id="platos-to-input" value="${platosTo}" style="border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:12px" onchange="GE.setPlatosCustom()">
    `;
  }
  function setPlatosPeriod(p){ platosPeriod = p; renderPlatos(); }
  function setPlatosCustom(){
    platosFrom = document.getElementById('platos-from-input').value;
    platosTo = document.getElementById('platos-to-input').value;
    if(platosFrom && platosTo){ platosPeriod = 'custom'; renderPlatos(); }
  }

  function renderPlatosRankingTable(elId, list, totalIngresos){
    const tbl = document.getElementById(elId);
    if(!list.length){ tbl.innerHTML = `<tr><td colspan="5"><div class="empty" style="padding:14px">Sin ventas en este periodo.</div></td></tr>`; return; }
    tbl.innerHTML = `
      <thead><tr><th>Plato</th><th style="text-align:left">Categoría</th><th>Uds.</th><th>Ingresos</th><th>% del total</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td style="text-align:left;font-family:inherit;font-weight:400;background:none;border-left:none">${escapeHtml(i.category)}</td>
          <td>${fmtNum(i.units,0)}</td>
          <td>${fmtMoney(i.revenue)}</td>
          <td>${totalIngresos>0?(i.revenue/totalIngresos*100).toFixed(1)+'%':'—'}</td>
        </tr>`).join('')}</tbody>
    `;
  }

  function renderPlatosRentabilidadTable(elId, list){
    const tbl = document.getElementById(elId);
    if(!list.length){ tbl.innerHTML = `<tr><td colspan="6"><div class="empty" style="padding:14px">Vincula los platos vendidos a recetas del Escandallo para ver su rentabilidad.</div></td></tr>`; return; }
    tbl.innerHTML = `
      <thead><tr><th>Plato</th><th>Uds.</th><th>Ingresos</th><th>Coste</th><th>Margen</th><th>% Margen</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td>${fmtNum(i.units,0)}</td>
          <td>${fmtMoney(i.revenue)}</td>
          <td>${fmtMoney(i.cost)}</td>
          <td class="${i.margin>=0?'pos':'neg'}">${fmtMoney(i.margin)}</td>
          <td class="${i.marginPct>=0?(i.marginPct<25?'':'pos'):'neg'}">${i.marginPct.toFixed(1)}%</td>
        </tr>`).join('')}</tbody>
    `;
  }

  function renderPlatos(){
    renderPlatosPeriodSel();
    const {items} = platosStats();
    const totalUnidades = items.reduce((s,i)=>s+i.units,0);
    const totalIngresos = items.reduce((s,i)=>s+i.revenue,0);
    const conReceta = items.filter(i=>i.margin!=null);
    const totalMargen = conReceta.reduce((s,i)=>s+i.margin,0);
    const ingresosConReceta = conReceta.reduce((s,i)=>s+i.revenue,0);
    const margenPct = ingresosConReceta>0 ? (totalMargen/ingresosConReceta*100) : 0;
    const ticketMedio = totalUnidades>0 ? totalIngresos/totalUnidades : 0;

    document.getElementById('platos-kpis').innerHTML = `
      <div class="ge-kpi"><div class="lbl">Platos vendidos (uds.)</div><div class="val">${fmtNum(totalUnidades,0)}</div></div>
      <div class="ge-kpi"><div class="lbl">Ingresos totales</div><div class="val">${fmtMoney(totalIngresos)}</div></div>
      <div class="ge-kpi"><div class="lbl">Margen total</div><div class="val" style="color:${totalMargen>=0?'var(--green)':'var(--red)'}">${conReceta.length?fmtMoney(totalMargen):'—'}</div><div class="sub">${conReceta.length?'Platos con escandallo':'Crea escandallos para ver el margen'}</div></div>
      <div class="ge-kpi"><div class="lbl">% Margen medio</div><div class="val">${conReceta.length?margenPct.toFixed(1)+'%':'—'}</div></div>
      <div class="ge-kpi"><div class="lbl">Ticket medio / línea</div><div class="val">${fmtMoney(ticketMedio)}</div></div>
      <div class="ge-kpi"><div class="lbl">Referencias vendidas</div><div class="val">${items.length}</div></div>
    `;

    const top5 = [...items].sort((a,b)=>b.revenue-a.revenue).slice(0,5);
    document.getElementById('platos-chart').innerHTML = top5.length
      ? barChartHTML(top5.map(i=>({lbl: i.name.length>10 ? i.name.slice(0,9)+'…' : i.name, v:i.revenue})))
      : `<div class="empty">Sin ventas en este periodo.</div>`;

    renderPlatosRankingTable('platos-mas-vendidos', [...items].sort((a,b)=>b.units-a.units).slice(0,10), totalIngresos);
    renderPlatosRankingTable('platos-menos-vendidos', [...items].sort((a,b)=>a.units-b.units).slice(0,10), totalIngresos);
    renderPlatosRentabilidadTable('platos-mas-rentables', conReceta.slice().sort((a,b)=>b.margin-a.margin).slice(0,10));
    renderPlatosRentabilidadTable('platos-menos-rentables', conReceta.slice().sort((a,b)=>a.margin-b.margin).slice(0,10));

    const soldRecipeIds = new Set(items.filter(i=>i.recipeId).map(i=>i.recipeId));
    const sinVentas = DB.recipes.filter(r => !r.isBase && !soldRecipeIds.has(r.id));
    document.getElementById('platos-sin-ventas').innerHTML = sinVentas.length
      ? `<div style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px">${sinVentas.map(r=>`<span class="badge badge-gray">${escapeHtml(r.name)}</span>`).join('')}</div>`
      : `<div class="empty" style="padding:12px 16px">Todos los platos del Escandallo se han vendido en este periodo. 🎉</div>`;
  }

  /* -- EXPORTAR CONTABILIDAD PARA EL GESTOR -- */
  function openExportModal(){
    const now = new Date();
    openModal(`
      <div class="modal-header"><h3><i class="ti ti-file-export"></i> Exportar contabilidad mensual</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <p style="font-size:13px;color:var(--muted)">Genera un archivo CSV (compatible con Excel) con el libro de ventas, los gastos y el resultado del mes, listo para enviar a tu gestor o asesoría.</p>
      <div class="field-row">
        <div class="field">
          <label>Mes</label>
          <select id="exp-mes">${MESES.map((m,i)=>`<option value="${i}" ${i===now.getMonth()?'selected':''}>${m}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Año</label>
          <input type="number" id="exp-anyo" value="${now.getFullYear()}" min="2000" max="2100">
        </div>
      </div>
      <div class="field">
        <label>Email del gestor / asesoría</label>
        <input type="email" id="exp-email" value="${escapeHtml((DB.business||{}).gestorEmail||'')}" placeholder="gestoria@ejemplo.com">
        <small style="color:var(--muted)">Se recordará para próximas exportaciones. Al pulsar "Enviar al gestor" se abrirá tu programa de correo con un mensaje preparado: descarga primero el CSV y adjúntalo antes de enviarlo.</small>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
        <button class="btn btn-primary" onclick="GE.exportMonth()"><i class="ti ti-download"></i> Descargar CSV</button>
        <button class="btn btn-primary" onclick="GE.emailMonth()"><i class="ti ti-mail"></i> Enviar al gestor</button>
      </div>
    `);
  }

  function buildMonthReport(mes, año){
    const b = DB.business || {};
    const mesStr = `${año}-${String(mes+1).padStart(2,'0')}`;
    const ivaVentas = (b.ticket && b.ticket.ivaPct != null) ? b.ticket.ivaPct : 10;

    const ventas = DB.sales.filter(v => (v.date||'').startsWith(mesStr)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));

    const rows = [];
    rows.push(['INFORME CONTABLE MENSUAL - GASTROGOAN']);
    rows.push(['Negocio', b.name || '']);
    if(b.cif) rows.push(['CIF/NIF', b.cif]);
    rows.push(['Periodo', `${MESES[mes]} ${año}`]);
    rows.push(['Generado el', new Date().toLocaleString('es-ES')]);
    rows.push([]);

    rows.push(['LIBRO DE VENTAS']);
    rows.push(['Fecha','Nº Factura','Tipo','Cliente','Forma de pago','Base imponible (€)','IVA %','Cuota IVA (€)','Total (€)']);
    let sumBase=0, sumIva=0, sumTotal=0;
    ventas.forEach(v => {
      const total = parseFloat(v.total||0);
      const base = total / (1 + ivaVentas/100);
      const iva = total - base;
      sumBase += base; sumIva += iva; sumTotal += total;
      rows.push([v.date||'', v.facturaNum||'', v.tipo||'', v.clienteNombre||'', v.metodoPago||'', base, ivaVentas, iva, total]);
    });
    if(!ventas.length) rows.push(['Sin ventas registradas este mes.']);
    rows.push(['','','','','TOTAL', sumBase, '', sumIva, sumTotal]);
    rows.push([]);

    rows.push(['GASTOS FIJOS MENSUALES (recurrentes)']);
    rows.push(['Concepto','Categoría','Día de pago','Periodicidad','Importe mensual equiv. (€)']);
    let sumFijos = 0;
    fijos().forEach(g => {
      const imp = gfMonthlyImporte(g);
      sumFijos += imp;
      const periodo = (parseInt(g.periodicidadMeses)||1)===1 ? 'Mensual' : `Cada ${g.periodicidadMeses} meses`;
      rows.push([g.nombre||'', g.categoria||'', g.diaPago||'', periodo, imp]);
    });
    if(!fijos().length) rows.push(['Sin gastos fijos registrados.']);
    rows.push(['','','TOTAL', sumFijos]);
    rows.push([]);

    rows.push(['GASTOS VARIABLES DEL MES']);
    rows.push(['Fecha','Categoría','Proveedor','Importe (€)']);
    let sumVar = 0;
    const variablesDelMes = variablesMes(mes, año).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
    variablesDelMes.forEach(v => {
      const imp = parseFloat(v.importe||0);
      sumVar += imp;
      rows.push([v.fecha||'', v.categoria||'', v.proveedor||'', imp]);
    });
    if(!variablesDelMes.length) rows.push(['Sin gastos variables registrados este mes.']);
    rows.push(['','','TOTAL', sumVar]);
    rows.push([]);

    const capexMes = capex().filter(c => (c.fecha||'').startsWith(mesStr));
    rows.push(['INVERSIONES (CAPEX) DEL MES']);
    rows.push(['Descripción','Fecha','Base (€)','IVA %','Cuota IVA (€)','Total (€)','Estado de pago']);
    let sumCapexBase=0, sumCapexIva=0, sumCapexTotal=0;
    capexMes.forEach(c => {
      const imp = parseFloat(c.importe||0);
      const ivaPct = parseFloat(c.iva||0);
      const ivaAmt = imp * ivaPct/100;
      const total = imp + ivaAmt;
      sumCapexBase += imp; sumCapexIva += ivaAmt; sumCapexTotal += total;
      rows.push([c.descripcion||'', c.fecha||'', imp, ivaPct, ivaAmt, total, c.estadoPago||'']);
    });
    if(!capexMes.length) rows.push(['Sin inversiones registradas este mes.']);
    rows.push(['','','TOTAL', sumCapexBase, '', sumCapexIva, sumCapexTotal, '']);
    rows.push([]);

    const comisiones = comisionesMes(mes);
    const resultado = sumTotal - sumVar - sumFijos - comisiones;
    rows.push(['RESUMEN DEL MES']);
    rows.push(['Concepto','Importe (€)']);
    rows.push(['Total facturación (con IVA)', sumTotal]);
    rows.push(['Base imponible ventas', sumBase]);
    rows.push(['IVA repercutido (ventas)', sumIva]);
    rows.push(['Comisiones plataformas de delivery', comisiones]);
    rows.push(['Total gastos variables', sumVar]);
    rows.push(['Total gastos fijos', sumFijos]);
    rows.push(['Total inversiones - CAPEX (base)', sumCapexBase]);
    rows.push(['IVA soportado (CAPEX)', sumCapexIva]);
    rows.push(['Resultado del mes (antes de impuestos)', resultado]);

    const nombreNegocio = (b.name||'gastrogoan').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return {rows, mesStr, nombreNegocio, sumTotal, sumBase, sumIva, sumFijos, sumVar, comisiones, resultado};
  }

  function exportMonth(){
    const mes = parseInt(document.getElementById('exp-mes').value);
    const año = parseInt(document.getElementById('exp-anyo').value) || currentYear;
    const report = buildMonthReport(mes, año);
    downloadCSV(report.rows, `contabilidad-${report.nombreNegocio}-${report.mesStr}.csv`);
    closeModal();
    showToast(t('msg.reportDownloaded'));
  }

  function emailMonth(){
    const mes = parseInt(document.getElementById('exp-mes').value);
    const año = parseInt(document.getElementById('exp-anyo').value) || currentYear;
    const email = document.getElementById('exp-email').value.trim();
    if(!email){ showToast(t('msg.enterAccountantEmail')); return; }

    const b = DB.business || {};
    b.gestorEmail = email;
    saveDB();

    const report = buildMonthReport(mes, año);
    const fmt = n => (Math.round(n*100)/100).toFixed(2).replace('.', ',') + ' €';
    const subject = `Contabilidad ${MESES[mes]} ${año} - ${b.name||'GastroGoan'}`;
    const body = [
      `Hola,`,
      ``,
      `Adjunto el informe contable de ${MESES[mes]} ${año} de ${b.name||'el negocio'}.`,
      ``,
      `Resumen del mes:`,
      `- Total facturación (con IVA): ${fmt(report.sumTotal)}`,
      `- Base imponible ventas: ${fmt(report.sumBase)}`,
      `- IVA repercutido: ${fmt(report.sumIva)}`,
      `- Gastos fijos: ${fmt(report.sumFijos)}`,
      `- Gastos variables: ${fmt(report.sumVar)}`,
      `- Resultado del mes: ${fmt(report.resultado)}`,
      ``,
      `Recuerda adjuntar el archivo CSV descargado (contabilidad-${report.nombreNegocio}-${report.mesStr}.csv) antes de enviar este correo.`,
      ``,
      `Un saludo.`
    ].join('\n');

    downloadCSV(report.rows, `contabilidad-${report.nombreNegocio}-${report.mesStr}.csv`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    closeModal();
    showToast(t('msg.csvDownloaded'));
  }

  return {init, tab, newGF, newGFFromEmployee, editGF, saveGF, deleteGF, toggleGFAutoCalc, recalcGFAuto, setMonth, newGV, saveGV, deleteGV, deleteGVGroup, calcPE, newCapex, editCapex, saveCapex, deleteCapex, toggleCapexFinanciado, setMonthTe, adjustDistPct, setPctImpuesto, setPctIvaCompras, renderTesoreria, setCDRYear, renderPlatos, setPlatosPeriod, setPlatosCustom, openExportModal, exportMonth, emailMonth};
})();

/* ============================================================
   HORARIOS — Turnos del personal
   ============================================================ */
const WEEK_DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const WEEK_DAY_KEYS = ['lun','mar','mie','jue','vie','sab','dom'];
const SHIFT_TYPES = {
  M: {label:'Mañana', bg:'#DBEAFE', tx:'#1E40AF'},
  T: {label:'Tarde', bg:'#FEF9C3', tx:'#854D0E'},
  P: {label:'Partido', bg:'#DCFCE7', tx:'#166534'},
  D: {label:'Descanso', bg:'#F3F4F6', tx:'#6B7280'},
  V: {label:'Vacaciones', bg:'#FFF7ED', tx:'#9A3412'},
  B: {label:'Baja', bg:'#FEE2E2', tx:'#991B1B'},
  C: {label:'Otro', bg:'#EDE9FE', tx:'#5B21B6'}
};

let horariosTab = 'personal';
let horariosWeekOffset = 0;
let horariosDate = todayStr();
let horariosMonthOffset = 0;

function getWeekDates(offset){
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day-1) + offset*7);
  return Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d; });
}
function dateStr(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function hoursBetween(t1, t2){
  if(!t1 || !t2) return 0;
  const [h1,m1] = t1.split(':').map(Number), [h2,m2] = t2.split(':').map(Number);
  let diff = (h2*60+m2) - (h1*60+m1);
  if(diff < 0) diff += 24*60;
  return diff/60;
}
function turnoHours(t){
  if(['D','V','B'].includes(t.tipo)) return 0;
  let h = hoursBetween(t.entrada, t.salida);
  if(t.tipo==='P' && t.entrada2 && t.salida2) h += hoursBetween(t.entrada2, t.salida2);
  return h;
}
function turnoHorarioLabel(t){
  if(['D','V','B'].includes(t.tipo)) return '—';
  let s = `${t.entrada}-${t.salida}`;
  if(t.tipo==='P' && t.entrada2 && t.salida2) s += ` / ${t.entrada2}-${t.salida2}`;
  return s;
}

function renderHorarios(){
  const box = document.getElementById('horarios-content');
  box.innerHTML = `
    <nav class="ge-tab-row">
      <button class="ge-tab ${horariosTab==='personal'?'active':''}" onclick="setHorariosTab('personal')"><i class="ti ti-users"></i> Personal</button>
      <button class="ge-tab ${horariosTab==='fichar'?'active':''}" onclick="setHorariosTab('fichar')"><i class="ti ti-clock-play"></i> Fichar</button>
      <button class="ge-tab ${horariosTab==='dia'?'active':''}" onclick="setHorariosTab('dia')"><i class="ti ti-calendar-event"></i> Día</button>
      <button class="ge-tab ${horariosTab==='semana'?'active':''}" onclick="setHorariosTab('semana')"><i class="ti ti-calendar"></i> Semana</button>
      <button class="ge-tab ${horariosTab==='mes'?'active':''}" onclick="setHorariosTab('mes')"><i class="ti ti-calendar-month"></i> Mes</button>
    </nav>
    <div id="horarios-tab-content"></div>
  `;
  renderHorariosTab();
}
function setHorariosTab(t){ horariosTab = t; renderHorarios(); }
function renderHorariosTab(){
  if(horariosTab === 'personal') renderHorariosPersonal();
  else if(horariosTab === 'fichar') renderHorariosFichar();
  else if(horariosTab === 'dia') renderHorariosDia();
  else if(horariosTab === 'mes') renderHorariosMes();
  else renderHorariosSemana();
}

function goToHorariosDia(date){
  horariosDate = date;
  horariosTab = 'dia';
  renderHorarios();
}

function renderHorariosDia(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;

  const emps = areaEmployees();
  if(!emps.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>`;
    return;
  }

  const date = horariosDate;
  const turnos = (DB.turnos||[]).filter(t => t.fecha === date);

  const rows = emps.map(emp => {
    const turno = turnos.find(x => x.employeeId===emp.id);
    if(turno){
      const tipo = SHIFT_TYPES[turno.tipo] || SHIFT_TYPES.C;
      const hh = turnoHours(turno);
      return `
        <tr>
          <td>
            <span style="display:inline-flex;align-items:center;gap:6px">
              <span style="width:10px;height:10px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
              <span><strong>${escapeHtml(emp.name)}</strong>${emp.rol?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(emp.rol)}</span>`:''}</span>
            </span>
          </td>
          <td><span style="display:inline-block;padding:4px 8px;border-radius:6px;background:${tipo.bg};color:${tipo.tx};font-weight:700;font-size:12px">${turno.tipo} - ${tipo.label}</span></td>
          <td>${escapeHtml(turnoHorarioLabel(turno))}</td>
          <td>${hh>0?hh.toFixed(1)+'h':'—'}</td>
          <td class="wrap">${escapeHtml(turno.notas||'—')}</td>
          <td class="actions-cell">
            <button class="owner-only btn btn-sm btn-icon" onclick="openTurnoModal(${turno.id})"><i class="ti ti-edit"></i></button>
            <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteTurno(${turno.id})"><i class="ti ti-trash"></i></button>
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
            <span><strong>${escapeHtml(emp.name)}</strong>${emp.rol?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(emp.rol)}</span>`:''}</span>
          </span>
        </td>
        <td colspan="4"><span style="color:var(--muted)">Sin turno asignado</span></td>
        <td class="actions-cell">
          <button class="owner-only btn btn-sm" onclick="openTurnoModal(null, ${emp.id}, '${date}')"><i class="ti ti-plus"></i> Asignar</button>
        </td>
      </tr>
    `;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <input type="date" id="horarios-filter-date" value="${date}" onchange="horariosDate=this.value;renderHorarios()">
      </div>
      <button class="owner-only btn btn-primary" onclick="openTurnoModal(null, null, '${date}')"><i class="ti ti-plus"></i> Nuevo Turno</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      ${Object.entries(SHIFT_TYPES).map(([k,v]) => `<span class="badge" style="background:${v.bg};color:${v.tx}">${k} = ${v.label}</span>`).join('')}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Empleado</th><th>Turno</th><th>Horario</th><th>Horas</th><th>Notas</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderHorariosMes(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + horariosMonthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const empIds = new Set(areaEmployees().map(e => e.id));
  const counts = {};
  (DB.turnos||[]).forEach(t => { if(t.tipo !== 'D' && empIds.has(t.employeeId)) counts[t.fecha] = (counts[t.fecha]||0) + 1; });

  let cells = '';
  for(let i=0; i<startOffset; i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const ds = dateStr(new Date(year, month, day));
    const count = counts[ds] || 0;
    const isToday = ds === todayStr();
    cells += `
      <div class="card" style="cursor:pointer;padding:8px;text-align:center;${isToday?'border-color:var(--brand-orange)':''}" onclick="goToHorariosDia('${ds}')">
        <div style="font-weight:700">${day}</div>
        ${count ? `<span class="badge badge-blue">${count} turno${count!==1?'s':''}</span>` : ''}
      </div>
    `;
  }

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="horariosMonthOffset--;renderHorarios()"><i class="ti ti-chevron-left"></i></button>
        <button class="btn btn-sm" onclick="horariosMonthOffset=0;renderHorarios()">Hoy</button>
        <button class="btn btn-sm" onclick="horariosMonthOffset++;renderHorarios()"><i class="ti ti-chevron-right"></i></button>
        <strong style="margin-left:8px">${MONTH_NAMES[month]} ${year}</strong>
      </div>
      <button class="owner-only btn btn-primary" onclick="openTurnoModal()"><i class="ti ti-plus"></i> Nuevo Turno</button>
    </div>
    <div class="grid" style="grid-template-columns:repeat(7,1fr);gap:6px">
      ${WEEK_DAYS.map(d=>`<div style="text-align:center;font-size:12px;font-weight:700;color:var(--muted)">${d.slice(0,3)}</div>`).join('')}
      ${cells}
    </div>
  `;
}

function renderHorariosSemana(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;

  const emps = areaEmployees();
  if(!emps.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>`;
    return;
  }

  const dates = getWeekDates(horariosWeekOffset);
  const dateStrs = dates.map(dateStr);
  const label = `${dates[0].toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${dates[6].toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`;
  const headerCells = dates.map((d,i) => `<th>${WEEK_DAYS[i].slice(0,3)}<br><span style="font-size:10px;font-weight:400">${d.getDate()}/${d.getMonth()+1}</span></th>`).join('');

  const rows = emps.map(emp => {
    let totalH = 0;
    const cells = dateStrs.map(ds => {
      const turno = (DB.turnos||[]).find(x => x.employeeId===emp.id && x.fecha===ds);
      if(turno){
        const tipo = SHIFT_TYPES[turno.tipo] || SHIFT_TYPES.C;
        const hh = turnoHours(turno);
        if(hh > 0) totalH += hh;
        return `<td><span style="display:inline-block;padding:4px 8px;border-radius:6px;background:${tipo.bg};color:${tipo.tx};font-weight:700;cursor:pointer;font-size:12px;text-align:center" onclick="if(editUnlocked) openTurnoModal(${turno.id})">${turno.tipo}${turno.tipo!=='D'?`<br><span style="font-size:10px;font-weight:400">${escapeHtml(turnoHorarioLabel(turno))}</span>`:''}</span></td>`;
      }
      return `<td><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--muted)" onclick="if(editUnlocked) openTurnoModal(null, ${emp.id}, '${ds}')">+</span></td>`;
    }).join('');
    return `<tr>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${emp.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
          <span><strong>${escapeHtml(emp.name)}</strong>${emp.rol?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(emp.rol)}</span>`:''}</span>
        </span>
      </td>
      ${cells}
      <td style="text-align:center;font-weight:700">${totalH>0?totalH.toFixed(1)+'h':'—'}</td>
    </tr>`;
  }).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <button class="btn btn-sm" onclick="horariosWeekOffset--; renderHorariosSemana()"><i class="ti ti-chevron-left"></i></button>
        <strong style="margin:0 8px">${label}</strong>
        <button class="btn btn-sm" onclick="horariosWeekOffset++; renderHorariosSemana()"><i class="ti ti-chevron-right"></i></button>
        <button class="btn btn-sm" onclick="horariosWeekOffset=0; renderHorariosSemana()">Hoy</button>
      </div>
      <button class="owner-only btn btn-primary" onclick="openTurnoModal()"><i class="ti ti-plus"></i> Nuevo Turno</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      ${Object.entries(SHIFT_TYPES).map(([k,v]) => `<span class="badge" style="background:${v.bg};color:${v.tx}">${k} = ${v.label}</span>`).join('')}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Empleado</th>${headerCells}<th>Total h.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function openTurnoModal(id, employeeId, fecha){
  const emps = areaEmployees();
  if(!emps.length){ showToast(t('msg.addEmployeesFirst')); return; }
  let turno = id ? (DB.turnos||[]).find(x => x.id===id) : null;
  const state = turno ? {...turno} : {id:null, employeeId: employeeId||emps[0].id, fecha: fecha||dateStr(new Date()), tipo:'M', entrada:'09:00', salida:'17:00', notas:''};
  const empOptions = emps.map(e => `<option value="${e.id}"${e.id===state.employeeId?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  const tipoOptions = Object.entries(SHIFT_TYPES).map(([k,v]) => `<option value="${k}"${k===state.tipo?' selected':''}>${k} - ${v.label}</option>`).join('');
  const noHorario = ['D','V','B'].includes(state.tipo);
  const isPartido = state.tipo === 'P';

  openModal(`
    <div class="modal-header">
      <h3>${state.id ? 'Editar' : 'Nuevo'} Turno</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Empleado</label>
        <select id="turno-employee">${empOptions}</select>
      </div>
      <div class="field">
        <label>Fecha</label>
        <input type="date" id="turno-fecha" value="${state.fecha}">
      </div>
    </div>
    <div class="field">
      <label>Tipo de turno</label>
      <select id="turno-tipo" onchange="turnoTipoChanged()">${tipoOptions}</select>
    </div>
    <div id="turno-horarios" style="display:${noHorario?'none':'block'}">
      <div class="field-row">
        <div class="field">
          <label>${isPartido?'Entrada (mañana)':'Entrada'}</label>
          <input type="time" id="turno-entrada" value="${state.entrada}">
        </div>
        <div class="field">
          <label>${isPartido?'Salida (mañana)':'Salida'}</label>
          <input type="time" id="turno-salida" value="${state.salida}">
        </div>
      </div>
      <div id="turno-partido" style="display:${isPartido?'block':'none'}">
        <div class="field-row">
          <div class="field">
            <label>Entrada (tarde)</label>
            <input type="time" id="turno-entrada2" value="${state.entrada2||'16:00'}">
          </div>
          <div class="field">
            <label>Salida (tarde)</label>
            <input type="time" id="turno-salida2" value="${state.salida2||'23:00'}">
          </div>
        </div>
      </div>
    </div>
    <div id="turno-descanso-msg" style="display:${noHorario?'block':'none'};background:#F3F4F6;border-radius:8px;padding:12px;font-size:13px;color:var(--muted);text-align:center;margin-bottom:10px">
      Este día no tiene horario asignado.
    </div>
    <div class="field">
      <label>Notas</label>
      <input type="text" id="turno-notas" value="${escapeHtml(state.notas||'')}" placeholder="Notas del turno...">
    </div>
    <div class="modal-footer">
      ${state.id ? `<button class="owner-only btn btn-danger" onclick="deleteTurno(${state.id})">${t("common.delete")}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="saveTurno(${state.id||'null'})">${t("common.save")}</button>
    </div>
  `);
}

function turnoTipoChanged(){
  const tipo = document.getElementById('turno-tipo').value;
  const noHorario = ['D','V','B'].includes(tipo);
  const isPartido = tipo === 'P';
  document.getElementById('turno-horarios').style.display = noHorario ? 'none' : 'block';
  document.getElementById('turno-partido').style.display = isPartido ? 'block' : 'none';
  document.getElementById('turno-descanso-msg').style.display = noHorario ? 'block' : 'none';
}

function saveTurno(id){
  const tipo = document.getElementById('turno-tipo').value;
  const noHorario = ['D','V','B'].includes(tipo);
  const isPartido = tipo === 'P';
  const data = {
    employeeId: parseInt(document.getElementById('turno-employee').value),
    fecha: document.getElementById('turno-fecha').value,
    tipo,
    entrada: noHorario ? '' : document.getElementById('turno-entrada').value,
    salida: noHorario ? '' : document.getElementById('turno-salida').value,
    entrada2: isPartido && document.getElementById('turno-entrada2') ? document.getElementById('turno-entrada2').value : '',
    salida2: isPartido && document.getElementById('turno-salida2') ? document.getElementById('turno-salida2').value : '',
    notas: document.getElementById('turno-notas').value.trim()
  };
  if(!DB.turnos) DB.turnos = [];
  if(id){
    const turno = DB.turnos.find(x => x.id===id);
    if(!turno){ showToast(t('msg.shiftNotFound')); return; }
    Object.assign(turno, data);
  } else {
    DB.turnos.push({id: genId(), ...data});
  }
  saveDB();
  closeModal();
  renderHorariosTab();
  showToast(t('msg.shiftSaved'));
}

function deleteTurno(id){
  if(!confirm(t('msg.confirmDeleteShift'))) return;
  DB.turnos = (DB.turnos||[]).filter(t => t.id!==id);
  saveDB();
  closeModal();
  renderHorariosTab();
}

// Empleados del área actual (cocina o sala). El personal se gestiona por separado
// según desde qué carpeta (Cocina/Sala) se entre a Horarios.
function areaEmployees(){
  return DB.employees.filter(e => (e.area||'cocina') === currentArea());
}

function renderHorariosPersonal(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;
  const emps = areaEmployees();
  const cards = emps.map(e => `
    <div class="card" style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:14px;height:14px;border-radius:50%;background:${e.color||'#DF7039'};display:inline-block;flex-shrink:0"></span>
        <div><strong>${escapeHtml(e.name)}</strong><div style="font-size:12px;color:var(--muted)">${escapeHtml(e.rol||'Sin rol')}</div></div>
      </div>
      <div class="actions-cell">
        ${e.phone ? `<a class="btn btn-sm btn-icon" href="https://wa.me/${escapeJsAttr(e.phone.replace(/[^\d+]/g,''))}" target="_blank" rel="noopener" title="Enviar WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
        ${e.email ? `<a class="btn btn-sm btn-icon" href="mailto:${escapeJsAttr(e.email)}" title="Enviar email"><i class="ti ti-mail"></i></a>` : ''}
        <button class="owner-only btn btn-sm btn-icon" onclick="openEmployeeModal(${e.id})"><i class="ti ti-edit"></i></button>
        <button class="owner-only btn btn-sm btn-icon btn-danger" onclick="deleteEmployee(${e.id})"><i class="ti ti-trash"></i></button>
      </div>
    </div>
  `).join('');

  box.innerHTML = `
    <div class="toolbar">
      <div class="left"></div>
      <div style="display:flex;gap:8px">
        <button class="owner-only btn btn-primary" onclick="openEmployeeModal()"><i class="ti ti-plus"></i> Añadir Empleado</button>
      </div>
    </div>
    ${emps.length ? `<div class="grid grid-3">${cards}</div>` : `<div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>`}
  `;
}

function openBulkTurnoModal(employeeId){
  if(!DB.employees.length){ showToast(t('msg.addEmployeesFirst')); return; }
  const empOptions = DB.employees.map(e => `<option value="${e.id}"${e.id===(employeeId||DB.employees[0].id)?' selected':''}>${escapeHtml(e.name)}</option>`).join('');
  const today = new Date();
  const end = new Date(today); end.setDate(today.getDate()+6);

  openModal(`
    <div class="modal-header">
      <h3>Asignar turnos por periodo</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>Empleado</label>
      <select id="bulk-employee" onchange="renderBulkCalendar()">${empOptions}</select>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Desde</label>
        <input type="date" id="bulk-desde" value="${dateStr(today)}" onchange="renderBulkCalendar()">
      </div>
      <div class="field">
        <label>Hasta</label>
        <input type="date" id="bulk-hasta" value="${dateStr(end)}" onchange="renderBulkCalendar()">
      </div>
    </div>
    <div class="field">
      <label>Horario de cada día del periodo</label>
      <div id="bulk-calendar"></div>
    </div>
    <div class="field">
      <label>Notas (opcional, se aplica a todos los días)</label>
      <input type="text" id="bulk-notas" placeholder="Notas para todos estos turnos...">
    </div>
    <p style="font-size:12px;color:var(--muted)">Si ya había un turno asignado ese día a este empleado, se sustituirá.</p>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="applyBulkTurno()">Aplicar</button>
    </div>
  `);
  renderBulkCalendar();
}

function bulkTipoOptions(selected){
  return ['M','T','P','C'].map(k => `<option value="${k}"${k===selected?' selected':''}>${k} - ${SHIFT_TYPES[k].label}</option>`).join('');
}

function renderBulkCalendar(){
  const box = document.getElementById('bulk-calendar');
  if(!box) return;
  const desde = document.getElementById('bulk-desde').value;
  const hasta = document.getElementById('bulk-hasta').value;
  const employeeId = parseInt(document.getElementById('bulk-employee').value);
  if(!desde || !hasta || desde > hasta){
    box.innerHTML = `<p style="font-size:12px;color:var(--muted)">Selecciona un periodo válido.</p>`;
    return;
  }

  let html = '';
  const cursor = new Date(desde + 'T00:00:00');
  const end = new Date(hasta + 'T00:00:00');
  let guard = 0;
  while(cursor <= end && guard < 62){
    const ds = dateStr(cursor);
    const dow = (cursor.getDay()+6)%7;
    const existing = (DB.turnos||[]).find(x => x.employeeId===employeeId && x.fecha===ds);
    const isFestivo = !!existing && existing.tipo === 'D';
    const isPartido = !!existing && existing.tipo === 'P';
    const tipo = (existing && !isFestivo && !isPartido) ? existing.tipo : 'M';
    const entrada = existing?.entrada || '09:00';
    const salida = existing?.salida || '17:00';
    const entrada2 = existing?.entrada2 || '17:00';
    const salida2 = existing?.salida2 || '21:00';

    html += `
      <div class="card bulk-day-card" data-date="${ds}" style="margin-bottom:8px;padding:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
          <strong>${WEEK_DAYS[dow]} ${cursor.getDate()}/${cursor.getMonth()+1}</strong>
          <label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" class="bulk-day-festivo" ${isFestivo?'checked':''} onchange="toggleBulkDayFields(this)"> Festivo</label>
        </div>
        <div class="bulk-day-fields" style="${isFestivo?'display:none':''}">
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;margin-bottom:6px"><input type="checkbox" class="bulk-day-partido" ${isPartido?'checked':''} onchange="toggleBulkDayFields(this)"> Turno partido (2 tramos)</label>
          <div class="field-row bulk-day-seguido" style="${isPartido?'display:none':''}">
            <select class="bulk-day-tipo">${bulkTipoOptions(tipo)}</select>
            <input type="time" class="bulk-day-entrada" value="${entrada}">
            <input type="time" class="bulk-day-salida" value="${salida}">
          </div>
          <div class="field-row bulk-day-partido-fields" style="${isPartido?'':'display:none'}">
            <input type="time" class="bulk-day-entrada1" value="${entrada}">
            <input type="time" class="bulk-day-salida1" value="${salida}">
            <input type="time" class="bulk-day-entrada2" value="${entrada2}">
            <input type="time" class="bulk-day-salida2" value="${salida2}">
          </div>
        </div>
      </div>
    `;
    cursor.setDate(cursor.getDate()+1);
    guard++;
  }
  box.innerHTML = html;
}

function toggleBulkDayFields(el){
  const card = el.closest('.bulk-day-card');
  const festivo = card.querySelector('.bulk-day-festivo').checked;
  const partido = card.querySelector('.bulk-day-partido').checked;
  card.querySelector('.bulk-day-fields').style.display = festivo ? 'none' : '';
  card.querySelector('.bulk-day-seguido').style.display = partido ? 'none' : '';
  card.querySelector('.bulk-day-partido-fields').style.display = partido ? '' : 'none';
}

function applyBulkTurno(){
  const employeeId = parseInt(document.getElementById('bulk-employee').value);
  const notas = document.getElementById('bulk-notas').value.trim();
  const cards = document.querySelectorAll('.bulk-day-card');
  if(!cards.length){ showToast(t('msg.checkDates')); return; }

  if(!DB.turnos) DB.turnos = [];
  let count = 0;
  cards.forEach(card => {
    const ds = card.dataset.date;
    const festivo = card.querySelector('.bulk-day-festivo').checked;
    const partido = card.querySelector('.bulk-day-partido').checked;
    let data;
    if(festivo){
      data = {tipo:'D', entrada:'', salida:'', entrada2:'', salida2:'', notas};
    } else if(partido){
      data = {
        tipo:'P',
        entrada: card.querySelector('.bulk-day-entrada1').value,
        salida: card.querySelector('.bulk-day-salida1').value,
        entrada2: card.querySelector('.bulk-day-entrada2').value,
        salida2: card.querySelector('.bulk-day-salida2').value,
        notas
      };
    } else {
      data = {
        tipo: card.querySelector('.bulk-day-tipo').value,
        entrada: card.querySelector('.bulk-day-entrada').value,
        salida: card.querySelector('.bulk-day-salida').value,
        entrada2: '', salida2: '',
        notas
      };
    }
    const existing = DB.turnos.find(x => x.employeeId===employeeId && x.fecha===ds);
    if(existing) Object.assign(existing, data);
    else DB.turnos.push({id: genId(), employeeId, fecha: ds, ...data});
    count++;
  });
  saveDB();
  closeModal();
  renderHorariosTab();
  showToast(`${count} turno${count!==1?'s':''} asignado${count!==1?'s':''}`);
}

function openEmployeeModal(id){
  const e = id ? DB.employees.find(x => x.id===id) : {name:'', rol:'', color:'#DF7039', area: currentArea()};
  openModal(`
    <div class="modal-header">
      <h3>${id ? 'Editar' : 'Nuevo'} Empleado</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>Nombre</label>
      <input type="text" id="emp-name" value="${escapeHtml(e.name)}" placeholder="Nombre del empleado">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Rol</label>
        <input type="text" id="emp-rol" value="${escapeHtml(e.rol||'')}" placeholder="Ej. Cocinero, Camarero...">
      </div>
      <div class="field">
        <label>Color identificativo</label>
        <input type="color" id="emp-color" value="${e.color||'#DF7039'}" style="height:40px;padding:4px">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Teléfono</label>
        <input type="tel" id="emp-phone" value="${escapeHtml(e.phone||'')}" placeholder="Ej. 600123456">
      </div>
      <div class="field">
        <label>Email</label>
        <input type="email" id="emp-email" value="${escapeHtml(e.email||'')}" placeholder="ejemplo@correo.com">
      </div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin:-4px 0 6px">Para comentarios o envío de documentación (WhatsApp / email).</p>
    ${id ? `
    <div class="field">
      <label>PIN de fichaje</label>
      <p style="font-size:13px;color:var(--muted);margin:0 0 6px">${e.pinChanged ? 'El empleado ya configuró su PIN personal.' : 'PIN por defecto (1234) — el empleado deberá cambiarlo al fichar por primera vez.'}</p>
      <button class="btn btn-sm" onclick="resetEmployeePin(${id})"><i class="ti ti-key"></i> Restablecer PIN a 1234</button>
    </div>` : ''}
    <div class="modal-footer">
      ${id ? `<button class="owner-only btn btn-danger" onclick="deleteEmployee(${id})">${t("common.delete")}</button>` : ''}
      <button class="btn" onclick="closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="saveEmployee(${id||'null'})">${t("common.save")}</button>
    </div>
  `);
}

function resetEmployeePin(id){
  const e = DB.employees.find(x=>x.id===id);
  if(!e) return;
  if(!confirm(t('msg.confirmResetPin').replace('${name}', e.name))) return;
  e.pin = '1234';
  e.pinChanged = false;
  // PIN por defecto se guarda en plano; se hasheará cuando el empleado lo cambie
  saveDB();
  showToast(t('msg.pinResetDone'));
  openEmployeeModal(id);
}

function saveEmployee(id){
  const name = document.getElementById('emp-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const rol = document.getElementById('emp-rol').value.trim();
  const color = document.getElementById('emp-color').value;
  const phone = document.getElementById('emp-phone').value.trim();
  const email = document.getElementById('emp-email').value.trim();
  if(id){
    const emp = DB.employees.find(e => e.id===id);
    if(!emp) return;
    // El área no se pregunta: se conserva la del empleado (o la actual si no tenía).
    Object.assign(emp, {name, rol, color, phone, email, area: emp.area||currentArea()});
  } else {
    // Nuevo empleado: se asigna automáticamente al área desde la que se crea.
    DB.employees.push({id: genId(), name, rol, color, phone, email, area: currentArea(), pin:'1234', pinChanged:false});
  }
  saveDB();
  closeModal();
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-horarios') renderHorarios();
  else if(active && active.id === 'view-distribucion') renderDistribucion();
  showToast(t('msg.employeeSaved'));
}

function deleteEmployee(id){
  if(!confirm(t('msg.confirmDeleteEmployee'))) return;
  DB.employees = DB.employees.filter(e => e.id!==id);
  DB.turnos = (DB.turnos||[]).filter(t => t.employeeId!==id);
  DB.fichajes = (DB.fichajes||[]).filter(f => f.employeeId!==id);
  delete DB.shifts[id];
  delete DB.workDistribution[id];
  saveDB();
  closeModal();
  const active = document.querySelector('.view.active');
  if(active && active.id === 'view-horarios') renderHorarios();
  else if(active && active.id === 'view-distribucion') renderDistribucion();
}

/* ============================================================
   FICHAR — Control de horario de entrada/salida del personal
   ============================================================ */
function fmtHora(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function fmtDuracion(hours){
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2,'0')}m`;
}
function getOpenFichaje(employeeId){
  return (DB.fichajes||[]).find(f => f.employeeId===employeeId && !f.salida);
}
function fichajeHoras(f){
  if(!f.entrada || !f.salida) return 0;
  return (new Date(f.salida) - new Date(f.entrada)) / 3600000;
}
function employeeHoursInRange(employeeId, dates){
  return (DB.fichajes||[]).filter(f => f.employeeId===employeeId && dates.includes(f.fecha)).reduce((s,f) => s + fichajeHoras(f), 0);
}
function employeePropinasInRange(employeeId, dates){
  return (DB.fichajes||[]).filter(f => f.employeeId===employeeId && dates.includes(f.fecha)).reduce((s,f) => s + (f.propinas||0), 0);
}

function renderHorariosFichar(){
  const box = document.getElementById('horarios-tab-content');
  if(!box) return;
  const emps = areaEmployees();
  if(!emps.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-users"></i>${t("empty.employees")}</div>`;
    return;
  }
  const weekDates = getWeekDates(0).map(d=>dateStr(d));
  const now = new Date();
  const monthDates = Array.from({length: new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}, (_,i) => dateStr(new Date(now.getFullYear(), now.getMonth(), i+1)));

  const cards = emps.map(e => {
    const open = getOpenFichaje(e.id);
    const horasSemana = employeeHoursInRange(e.id, weekDates);
    const horasMes = employeeHoursInRange(e.id, monthDates);
    const propinasSemana = employeePropinasInRange(e.id, weekDates);
    return `
      <div class="card" style="text-align:center;cursor:pointer" onclick="openFichajeHistoryModal(${e.id})">
        <h3 style="justify-content:center"><span style="width:12px;height:12px;border-radius:50%;background:${e.color||'#DF7039'};display:inline-block"></span> ${escapeHtml(e.name)}</h3>
        ${open ? `<span class="badge badge-green"><i class="ti ti-clock-play"></i> Fichado desde las ${fmtHora(open.entrada)}</span>` : `<span class="badge badge-gray">Fuera de servicio</span>`}
        <div style="margin-top:10px;display:flex;gap:6px;justify-content:center" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-primary" ${open?'disabled':''} onclick="openFichajeModal(${e.id}, 'entrada')"><i class="ti ti-login"></i> Entrada</button>
          <button class="btn btn-sm btn-danger" ${!open?'disabled':''} onclick="openFichajeModal(${e.id}, 'salida')"><i class="ti ti-logout"></i> Salida</button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">Horas esta semana: <strong>${fmtDuracion(horasSemana)}</strong></div>
        <div style="font-size:12px;color:var(--muted)">Horas este mes: <strong>${fmtDuracion(horasMes)}</strong></div>
        <div style="font-size:12px;color:var(--muted)">Propinas esta semana: <strong>${fmtMoney(propinasSemana)}</strong></div>
        <div style="margin-top:6px;font-size:12px;color:var(--brand-orange)"><i class="ti ti-history"></i> Ver últimos fichajes</div>
      </div>
    `;
  }).join('');

  box.innerHTML = `<div class="grid grid-3">${cards}</div>`;
}

function openFichajeHistoryModal(employeeId){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const fichajes = (DB.fichajes||[]).filter(f => f.employeeId===employeeId)
    .sort((a,b) => (b.entrada||'').localeCompare(a.entrada||'')).slice(0, 20);

  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> Últimos fichajes — ${escapeHtml(e.name)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${fichajes.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Propinas</th></tr></thead>
          <tbody>
            ${fichajes.map(f => `
              <tr>
                <td>${escapeHtml(f.fecha)}</td>
                <td>${fmtHora(f.entrada)}</td>
                <td>${f.salida ? fmtHora(f.salida) : '<span class="badge badge-green">En curso</span>'}</td>
                <td>${f.salida ? fmtDuracion(fichajeHoras(f)) : '—'}</td>
                <td>${f.propinas ? fmtMoney(f.propinas) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty"><i class="ti ti-clock-play"></i>Sin fichajes registrados todavía.</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cerrar</button>
    </div>
  `);
}

function openFichajeModal(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> ${escapeHtml(e.name)} — ${action==='entrada' ? 'Fichar Entrada' : 'Fichar Salida'}</h3>
      <button class="modal-close" onclick="renderHorariosTab();closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>Introduce tu PIN</label>
      <input type="password" id="fichaje-pin" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center">
    </div>
    ${action==='salida' ? `
    <div class="field">
      <label>Propinas recibidas en este turno (€)</label>
      <input type="number" id="fichaje-propinas" min="0" step="0.01" placeholder="0.00">
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn" onclick="renderHorariosTab();closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmFichaje(${employeeId}, '${action}')">${action==='entrada' ? 'Fichar Entrada' : 'Fichar Salida'}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('fichaje-pin')?.focus(), 50);
}

function confirmFichaje(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const pin = document.getElementById('fichaje-pin').value.trim();
  const storedPin = e.pin || '1234';
  const match = storedPin.startsWith('H:') ? hashPin(pin) === storedPin : pin === storedPin;
  if(!match){ showToast(t('msg.pinIncorrect')); return; }
  if(!e.pinChanged){
    openNewPinModal(employeeId, action);
    return;
  }
  doFichaje(employeeId, action);
}

function openNewPinModal(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> Crea tu PIN personal</h3>
      <button class="modal-close" onclick="renderHorariosTab();closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">Es tu primer fichaje, ${escapeHtml(e.name)}. Por seguridad, crea un PIN personal de 4 dígitos antes de continuar.</p>
    <div class="field">
      <label>Nuevo PIN (4 dígitos)</label>
      <input type="password" id="new-pin-1" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center">
    </div>
    <div class="field">
      <label>Repite el PIN</label>
      <input type="password" id="new-pin-2" inputmode="numeric" maxlength="4" placeholder="••••" style="font-size:24px;letter-spacing:6px;text-align:center">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="renderHorariosTab();closeModal()">${t("common.cancel")}</button>
      <button class="btn btn-primary" onclick="confirmNewPin(${employeeId}, '${action}')">Guardar y fichar</button>
    </div>
  `);
}

function confirmNewPin(employeeId, action){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  const p1 = document.getElementById('new-pin-1').value.trim();
  const p2 = document.getElementById('new-pin-2').value.trim();
  if(!/^\d{4}$/.test(p1)){ showToast(t('msg.pinMustBe4')); return; }
  if(p1 !== p2){ showToast(t('msg.pinsDontMatch')); return; }
  if(p1 === '1234'){ showToast(t('msg.pinNotDefault')); return; }
  e.pin = hashPin(p1);
  e.pinChanged = true;
  saveDB();
  doFichaje(employeeId, action);
}

function doFichaje(employeeId, action){
  const now = new Date().toISOString();
  if(action === 'entrada'){
    if(getOpenFichaje(employeeId)){ showToast(t('msg.alreadyClockedIn')); closeModal(); renderHorariosTab(); return; }
    DB.fichajes.push({id: genId(), employeeId, fecha: todayStr(), entrada: now, salida: null});
  }else{
    const open = getOpenFichaje(employeeId);
    if(!open){ showToast(t('msg.noClockedIn')); closeModal(); renderHorariosTab(); return; }
    open.salida = now;
    open.propinas = parseFloat(document.getElementById('fichaje-propinas')?.value || '0') || 0;
  }
  saveDB();
  closeModal();
  renderHorariosTab();
  showToast(action === 'entrada' ? 'Entrada registrada' : 'Salida registrada');
}

