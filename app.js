/* ============================================================
 * app.js — 浸染能耗計算工具：邏輯（計算 / 畫面互動 / 存讀檔 / PWA 註冊）
 * 這個檔案依賴 data.js 先載入（用到 TRANSLATIONS、DEFAULT_SETTINGS、
 * HEAT_SOURCES、HEAT_SOURCE_DATA、BUILTIN_DYE_TEMPLATES、
 * BUILTIN_WASH_TEMPLATES 等常數）。
 * ============================================================ */


function getSettings(){
  return {
    waterHeatCapacity: Number(document.getElementById("s_waterHeatCapacity").value) || 0,
    boilerEfficiency: Number(document.getElementById("s_boilerEfficiency").value) || 0,
    steamLatentHeat: Number(document.getElementById("s_steamLatentHeat").value) || 0,
    electricityEmissionFactor: Number(document.getElementById("s_electricityEmissionFactor").value) || 0,
    waterInOutTime: Number(document.getElementById("s_waterInOutTime").value) || 0,
    temperatureMaintainFactor: Number(document.getElementById("s_temperatureMaintainFactor").value) || 0,
    heatLossFactor: Number(document.getElementById("s_heatLossFactor").value) || 0,
    residualWaterFactor: Number(document.getElementById("s_residualWaterFactor").value) || 0
  };
}
function applySettingsToForm(settings){
  document.getElementById("s_waterHeatCapacity").value = settings.waterHeatCapacity;
  document.getElementById("s_boilerEfficiency").value = settings.boilerEfficiency;
  document.getElementById("s_steamLatentHeat").value = settings.steamLatentHeat;
  document.getElementById("s_electricityEmissionFactor").value = settings.electricityEmissionFactor;
  document.getElementById("s_waterInOutTime").value = settings.waterInOutTime;
  document.getElementById("s_temperatureMaintainFactor").value = settings.temperatureMaintainFactor;
  document.getElementById("s_heatLossFactor").value = settings.heatLossFactor;
  document.getElementById("s_residualWaterFactor").value = settings.residualWaterFactor;
}
document.getElementById("resetSettingsBtn").addEventListener("click", ()=>{
  applySettingsToForm(DEFAULT_SETTINGS);
});

const state = { lang:"zh" };
function T(key){ return TRANSLATIONS[state.lang][key] || key; }

function setLanguage(lang){
  state.lang = lang;
  document.getElementById("langBtnZh").classList.toggle("active", lang==="zh");
  document.getElementById("langBtnEn").classList.toggle("active", lang==="en");
  applyLanguage();
}
function applyLanguage(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    el.textContent = T(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
    el.placeholder = T(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el=>{
    el.title = T(el.getAttribute("data-i18n-title"));
    el.setAttribute("aria-label", T(el.getAttribute("data-i18n-title")));
  });

  if (loadedSetName) {
    document.getElementById("setNameInput").placeholder = state.lang === "en"
      ? `Loaded: ${loadedSetName} (blank = overwrite)`
      : `目前載入：${loadedSetName}（留空即覆蓋）`;
  }

  updateSetList();

  // Auto-translate default process names if user hasn't customized them
  processes.forEach((p, i) => {
    if (/^(製程|Process) \d+$/.test(p.name)) {
      p.name = (state.lang === "en" ? "Process " : "製程 ") + (i + 1);
    }
  });

  renderProcessList();

  // Re-run calculation if results are displayed, so table and charts refresh in current language
  const outputEl = document.getElementById("resultsOutput");
  if (outputEl && outputEl.children.length > 0) {
    runCalculation();
  }
}

document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-"+btn.dataset.tab).classList.add("active");
  });
});

// ========== 染程設定：製程管理 ==========
// 每個製程一張卡片，各自獨立的基本資料＋染色階段＋水洗步驟。染色階段數量由「染色模式」決定。
let processes = [];
let processIdCounter = 0;


// ========== 染色/水洗範本：直接搬自浸染試染工具的內建範本庫，數值完全不變 ==========
function getTemplateName(t) {
  if (state.lang === "en") {
    const enNames = {
      "bd_m1": "Method 1: Conventional dyeing",
      "bd_m2": "Method 2: Rapid isothermal (Yarn/Easy-dye)",
      "bd_m3": "Method 3: High-temp migration (Viscose/Tencel/Modal/Heavy)",
      "bd_m4": "Method 4: Pre-alkali addition",
      "bd_m5": "Method 5: Turquoise Blue G special",
      "bd_nylon6": "Nylon 6 Rope/Beam/Package dyeing (A-13)",
      "bd_nylon66": "Nylon 6,6 Rope/Beam/Package dyeing (A-13)",
      "bw_a4": "Standard Washing (A-4, 7 steps)",
      "bw_mt": "MT Medium-Temp Washing (5 steps)",
      "bw_mts": "MTS Medium-Temp Soaping (5 steps)",
      "bw_ht": "HT High-Temp Soaping (6 steps)"
    };
    return enNames[t.id] || t.name;
  }
  return t.name;
}


function createProcess(){
  processIdCounter++;
  return {
    id: processIdCounter,
    name: (state.lang==="en" ? "Process " : "製程 ") + processes.length,
    fabricWeight: 100,
    bathRatio: 10,
    initialTemp: 30,
    machinePower: 12,
    heatSource: "heavyOil",
    dyeingStages: [{ targetTemp:60, rampMin:15, holdMin:60, drain:false }],
    washSteps: [{ targetTemp:60, rampMin:15, holdMin:10 }]
  };
}

function addProcess(){
  const p = createProcess();
  p.name = (state.lang==="en" ? "Process " : "製程 ") + (processes.length + 1);
  processes.push(p);
  renderProcessList();
}
function deleteProcess(id){
  processes = processes.filter(p => p.id !== id);
  renderProcessList();
}
function findProcess(id){
  return processes.find(p => p.id === id);
}

function heatSourceLabel(key){
  const labels = {
    zh:{coal:"煤",heavyOil:"重油",naturalGas:"天然氣"},
    en:{coal:"Coal",heavyOil:"Heavy Oil",naturalGas:"Natural Gas"}
  };
  return labels[state.lang][key];
}

function renderProcessList(){
  const list = document.getElementById("processList");
  list.innerHTML = processes.map(p => renderProcessCardHTML(p)).join("");
  processes.forEach(p => wireProcessCard(p));
}

function renderProcessCardHTML(p){
  return `
    <div class="process-card" data-id="${p.id}">
      <div class="process-card-header open" data-toggle-id="${p.id}">
        <span class="process-card-chevron open">▾</span>
        <input type="text" class="process-name-input" data-id="${p.id}" value="${escapeHtmlE(p.name)}">
        <button type="button" class="process-card-delete" data-del-id="${p.id}">✕</button>
      </div>
      <div class="process-card-body" data-body-id="${p.id}" style="display:block;">
        <div class="row2">
          <div class="field">
            <label data-i18n="fabricWeightLabel">${T("fabricWeightLabel")}</label>
            <input type="number" class="p-input" data-id="${p.id}" data-field="fabricWeight" value="${p.fabricWeight}" min="0">
          </div>
          <div class="field">
            <label data-i18n="bathRatioLabel">${T("bathRatioLabel")}</label>
            <input type="number" class="p-input" data-id="${p.id}" data-field="bathRatio" value="${p.bathRatio}" min="0">
          </div>
          <div class="field">
            <label data-i18n="initialTempLabel">${T("initialTempLabel")}</label>
            <input type="number" class="p-input" data-id="${p.id}" data-field="initialTemp" value="${p.initialTemp}">
          </div>
          <div class="field">
            <label data-i18n="machinePowerLabel">${T("machinePowerLabel")}</label>
            <input type="number" class="p-input" data-id="${p.id}" data-field="machinePower" value="${p.machinePower}" min="0">
          </div>
        </div>
        <div class="field">
          <label data-i18n="heatSourceLabel">${T("heatSourceLabel")}</label>
          <select class="p-input" data-id="${p.id}" data-field="heatSource">
            ${HEAT_SOURCES.map(hs=>`<option value="${hs}" ${p.heatSource===hs?"selected":""}>${heatSourceLabel(hs)}</option>`).join("")}
          </select>
        </div>

        <div class="grp-title" data-i18n="dyeingStagesTitle">${T("dyeingStagesTitle")}</div>
        <div class="field" style="margin-bottom:10px;">
          <select class="dye-template-select" data-tplproc-id="${p.id}">
            <option value="">${state.lang==="en"?"-- Select a template --":"-- 選擇範本 --"}</option>
            ${BUILTIN_DYE_TEMPLATES.map(t=>`<option value="${t.id}">${escapeHtmlE(getTemplateName(t))}</option>`).join("")}
          </select>
        </div>
        <div class="dyeing-stage-rows" data-rows-id="${p.id}">
          ${p.dyeingStages.map((s,i)=>renderDyeingStageRowHTML(p.id,i,s)).join("")}
        </div>
        <button type="button" class="add-row-btn" data-adddye-id="${p.id}" data-i18n="addDyeStageBtn">${T("addDyeStageBtn")}</button>

        <div class="grp-title" data-i18n="washStepsTitle">${T("washStepsTitle")}</div>
        <div class="field" style="margin-bottom:10px;">
          <select class="wash-template-select" data-tplproc-id="${p.id}">
            <option value="">${state.lang==="en"?"-- Select a template --":"-- 選擇範本 --"}</option>
            ${BUILTIN_WASH_TEMPLATES.map(t=>`<option value="${t.id}">${escapeHtmlE(getTemplateName(t))}</option>`).join("")}
          </select>
        </div>
        <div class="wash-stage-rows" data-washrows-id="${p.id}">
          ${p.washSteps.map((s,i)=>renderWashStepRowHTML(p.id,i,s)).join("")}
        </div>
        <button type="button" class="add-row-btn" data-addwash-id="${p.id}" data-i18n="addWashBtn">${T("addWashBtn")}</button>
      </div>
    </div>
  `;
}

function renderDyeingStageRowHTML(pid, idx, s){
  return `
    <div class="stage-row">
      <div class="stage-row-top">
        <span style="font-weight:700;font-size:.85rem;">${state.lang==="en"?"Stage":"階段"} ${idx+1}</span>
        <button type="button" class="stage-row-del" data-deldye-pid="${pid}" data-deldye-idx="${idx}">✕</button>
      </div>
      <div class="stage-row-grid">
        <div><label data-i18n="targetTempLabel">${T("targetTempLabel")}</label><input type="number" class="dstage-input" data-pid="${pid}" data-idx="${idx}" data-field="targetTemp" value="${s.targetTemp}"></div>
        <div><label data-i18n="rampMinLabel">${T("rampMinLabel")}</label><input type="number" class="dstage-input" data-pid="${pid}" data-idx="${idx}" data-field="rampMin" value="${s.rampMin}" min="0"></div>
        <div><label data-i18n="holdMinLabel">${T("holdMinLabel")}</label><input type="number" class="dstage-input" data-pid="${pid}" data-idx="${idx}" data-field="holdMin" value="${s.holdMin}" min="0"></div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:.82rem;color:var(--ink-soft);cursor:pointer;">
        <input type="checkbox" class="dstage-input" data-pid="${pid}" data-idx="${idx}" data-field="drain" ${s.drain?"checked":""} style="width:auto;">
        <span data-i18n="drainLabel">${T("drainLabel")}</span>
      </label>
    </div>
  `;
}

function renderWashStepRowHTML(pid, idx, s){
  return `
    <div class="stage-row">
      <div class="stage-row-top">
        <span style="font-weight:700;font-size:.85rem;">${state.lang==="en"?"Wash":"水洗"} ${idx+1}</span>
        <button type="button" class="stage-row-del" data-delwash-pid="${pid}" data-delwash-idx="${idx}">✕</button>
      </div>
      <div class="stage-row-grid">
        <div><label data-i18n="targetTempLabel">${T("targetTempLabel")}</label><input type="number" class="wstage-input" data-pid="${pid}" data-idx="${idx}" data-field="targetTemp" value="${s.targetTemp}"></div>
        <div><label data-i18n="rampMinLabel">${T("rampMinLabel")}</label><input type="number" class="wstage-input" data-pid="${pid}" data-idx="${idx}" data-field="rampMin" value="${s.rampMin}" min="0"></div>
        <div><label data-i18n="holdMinLabel">${T("holdMinLabel")}</label><input type="number" class="wstage-input" data-pid="${pid}" data-idx="${idx}" data-field="holdMin" value="${s.holdMin}" min="0"></div>
      </div>
    </div>
  `;
}

function escapeHtmlE(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireProcessCard(p){
  const header = document.querySelector(`.process-card-header[data-toggle-id="${p.id}"]`);
  header.addEventListener("click", (e)=>{
    if(e.target.tagName === "INPUT" || e.target.closest("button")) return;
    const body = document.querySelector(`.process-card-body[data-body-id="${p.id}"]`);
    const willOpen = body.style.display === "none";
    body.style.display = willOpen ? "block" : "none";
    header.classList.toggle("open", willOpen);
  });

  document.querySelector(`.process-name-input[data-id="${p.id}"]`).addEventListener("input", (e)=>{
    p.name = e.target.value;
  });
  document.querySelector(`.process-card-delete[data-del-id="${p.id}"]`).addEventListener("click", (e)=>{
    e.stopPropagation();
    deleteProcess(p.id);
  });

  document.querySelectorAll(`.p-input[data-id="${p.id}"]`).forEach(input=>{
    input.addEventListener("input", ()=>{
      const field = input.dataset.field;
      p[field] = input.type === "number" ? Number(input.value) || 0 : input.value;
    });
  });

  wireDyeingStageInputs(p);
  wireWashStepInputs(p);

  document.querySelector(`[data-adddye-id="${p.id}"]`).addEventListener("click", ()=>{
    p.dyeingStages.push({ targetTemp:60, rampMin:15, holdMin:30, drain:false });
    const rowsEl = document.querySelector(`.dyeing-stage-rows[data-rows-id="${p.id}"]`);
    rowsEl.innerHTML = p.dyeingStages.map((s,i)=>renderDyeingStageRowHTML(p.id,i,s)).join("");
    wireDyeingStageInputs(p);
  });

  document.querySelector(`[data-addwash-id="${p.id}"]`).addEventListener("click", ()=>{
    p.washSteps.push({ targetTemp:60, rampMin:15, holdMin:10 });
    const rowsEl = document.querySelector(`.wash-stage-rows[data-washrows-id="${p.id}"]`);
    rowsEl.innerHTML = p.washSteps.map((s,i)=>renderWashStepRowHTML(p.id,i,s)).join("");
    wireWashStepInputs(p);
  });

  document.querySelector(`.dye-template-select[data-tplproc-id="${p.id}"]`).addEventListener("change", (e)=>{
    const tpl = BUILTIN_DYE_TEMPLATES.find(t=>t.id===e.target.value);
    if(!tpl) return;
    p.dyeingStages = tpl.segs.map(s=>({ targetTemp:s.targetTemp, rampMin:s.rampMin, holdMin:s.holdMin, drain:!!s.drain }));
    const rowsEl = document.querySelector(`.dyeing-stage-rows[data-rows-id="${p.id}"]`);
    rowsEl.innerHTML = p.dyeingStages.map((s,i)=>renderDyeingStageRowHTML(p.id,i,s)).join("");
    wireDyeingStageInputs(p);
  });

  document.querySelector(`.wash-template-select[data-tplproc-id="${p.id}"]`).addEventListener("change", (e)=>{
    const tpl = BUILTIN_WASH_TEMPLATES.find(t=>t.id===e.target.value);
    if(!tpl) return;
    p.washSteps = tpl.segs.map(s=>({ targetTemp:s.targetTemp, rampMin:s.rampMin, holdMin:s.holdMin }));
    const rowsEl = document.querySelector(`.wash-stage-rows[data-washrows-id="${p.id}"]`);
    rowsEl.innerHTML = p.washSteps.map((s,i)=>renderWashStepRowHTML(p.id,i,s)).join("");
    wireWashStepInputs(p);
  });
}

function wireDyeingStageInputs(p){
  document.querySelectorAll(`.dstage-input[data-pid="${p.id}"]`).forEach(input=>{
    const evt = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(evt, ()=>{
      const idx = Number(input.dataset.idx);
      const field = input.dataset.field;
      p.dyeingStages[idx][field] = input.type === "checkbox" ? input.checked : (Number(input.value) || 0);
    });
  });
  document.querySelectorAll(`.stage-row-del[data-deldye-pid="${p.id}"]`).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(p.dyeingStages.length <= 1) return; // 至少保留一段染色階段
      const idx = Number(btn.dataset.deldyeIdx);
      p.dyeingStages.splice(idx, 1);
      const rowsEl = document.querySelector(`.dyeing-stage-rows[data-rows-id="${p.id}"]`);
      rowsEl.innerHTML = p.dyeingStages.map((s,i)=>renderDyeingStageRowHTML(p.id,i,s)).join("");
      wireDyeingStageInputs(p);
    });
  });
}
function wireWashStepInputs(p){
  document.querySelectorAll(`.wstage-input[data-pid="${p.id}"]`).forEach(input=>{
    input.addEventListener("input", ()=>{
      const idx = Number(input.dataset.idx);
      const field = input.dataset.field;
      p.washSteps[idx][field] = Number(input.value) || 0;
    });
  });
  document.querySelectorAll(`.stage-row-del[data-delwash-pid="${p.id}"]`).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.delwashIdx);
      p.washSteps.splice(idx, 1);
      const rowsEl = document.querySelector(`.wash-stage-rows[data-washrows-id="${p.id}"]`);
      rowsEl.innerHTML = p.washSteps.map((s,i)=>renderWashStepRowHTML(p.id,i,s)).join("");
      wireWashStepInputs(p);
    });
  });
}

document.getElementById("addProcessBtn").addEventListener("click", addProcess);
document.getElementById("clearProcessBtn").addEventListener("click", ()=>{
  const msg = state.lang==="en" ? "Clear all processes and start fresh? This cannot be undone." : "確定要清空所有製程、重新開始嗎？此動作無法復原。";
  if(!confirm(msg)) return;
  processes = [];
  processIdCounter = 0;
  localStorage.removeItem("dyeEnergy_autosave");
  addProcess();
  document.getElementById("resultsOutput").innerHTML = "";
});
addProcess(); // 預設先給一個製程

// ========== 載入/存檔/分享：邏輯比照浸染試染工具與CPB ==========
const SAVED_SETS_KEY = "dyeEnergy_savedSets";
let loadedSetName = "";

function getSavedSets(){
  try{
    return JSON.parse(localStorage.getItem(SAVED_SETS_KEY) || "{}");
  }catch(err){
    console.error("Failed to read saved sets:", err);
    alert(state.lang==="en"
      ? "Unable to read saved sets. This browser/mode may be restricting local storage."
      : "無法讀取已儲存的製程組。此瀏覽器/模式可能限制了本機儲存功能。");
    return null;
  }
}
function setSavedSets(sets){
  try{
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(sets));
    return true;
  }catch(err){
    console.error("Failed to save sets:", err);
    alert(state.lang==="en"
      ? "Save failed. Storage may be restricted or full."
      : "儲存失敗：此瀏覽器/模式可能限制了本機儲存功能，或儲存空間已滿。");
    return false;
  }
}

function collectAllData(){
  return { processes: processes, settings: getSettings() };
}
function applyAllData(data){
  processes = data.processes || [];
  if(processes.length === 0) processes.push(createProcess());
  applySettingsToForm(data.settings || DEFAULT_SETTINGS);
  renderProcessList();
  document.getElementById("resultsOutput").innerHTML = "";
}

function saveProcessSet(){
  const typedName = document.getElementById("setNameInput").value.trim();
  const setName = typedName || loadedSetName;
  if(!setName){
    alert(state.lang==="en" ? "Please enter a name." : "請輸入製程組名稱。");
    return;
  }
  const existing = getSavedSets();
  if(existing === null) return;
  if(existing[setName]){
    const msg = state.lang==="en" ? `A set named "${setName}" already exists. Overwrite it?` : `已存在同名製程組「${setName}」，是否要覆蓋？`;
    if(!confirm(msg)) return;
  }
  existing[setName] = collectAllData();
  if(!setSavedSets(existing)) return;
  updateSetList();
  document.getElementById("savedSetsSel").value = setName;
  loadedSetName = setName;
  const input = document.getElementById("setNameInput");
  input.value = "";
  input.placeholder = state.lang==="en" ? `Loaded: ${setName} (blank = overwrite)` : `目前載入：${setName}（留空即覆蓋）`;
  alert(state.lang==="en" ? "Saved!" : "儲存成功！");
}

function loadProcessSet(){
  const sel = document.getElementById("savedSetsSel");
  const name = sel.value;
  if(!name) return;
  const sets = getSavedSets();
  if(sets === null) return;
  const data = sets[name];
  if(!data){
    alert(state.lang==="en" ? "Set not found." : "找不到製程組。");
    return;
  }
  applyAllData(data);
  loadedSetName = name;
  const input = document.getElementById("setNameInput");
  input.value = "";
  input.placeholder = state.lang==="en" ? `Loaded: ${name} (blank = overwrite)` : `目前載入：${name}（留空即覆蓋）`;
  alert(state.lang==="en" ? "Loaded!" : "載入成功！");
}

function deleteProcessSet(){
  const sel = document.getElementById("savedSetsSel");
  const name = sel.value;
  if(!name){
    alert(state.lang==="en" ? "Please select one to delete." : "請選擇要刪除的製程組。");
    return;
  }
  const msg = state.lang==="en" ? `Delete "${name}"?` : `確定要刪除「${name}」嗎？`;
  if(!confirm(msg)) return;
  const sets = getSavedSets();
  if(sets === null) return;
  delete sets[name];
  if(!setSavedSets(sets)) return;
  updateSetList();
  alert(state.lang==="en" ? "Deleted." : "刪除成功！");
}

function updateSetList(){
  const sets = getSavedSets();
  const sel = document.getElementById("savedSetsSel");
  const current = sel.value;
  sel.innerHTML = `<option value="">${T("selectSetOpt")}</option>`;
  if(sets){
    Object.keys(sets).sort().forEach(name=>{
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
  }
  sel.value = current;
}
updateSetList();

async function shareToolUrl(){
  const url = window.location.href;
  const btn = document.getElementById("shareBtn");
  const original = btn.innerHTML;
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
    }else{
      const ta = document.createElement("textarea");
      ta.value = url; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    btn.textContent = state.lang==="en" ? "Copied!" : "已複製！";
    setTimeout(()=>{ btn.innerHTML = original; }, 2000);
  }catch(err){
    console.error("Copy failed:", err);
    alert(state.lang==="en" ? "Copy failed — please copy the URL from the address bar manually." : "複製失敗，請手動複製網址列的網址。");
  }
}


// ========== 計算結果：逐行對照原本工具的公式搬過來，數字邏輯完全不變 ==========
// 原本用「染色模式」(twoStageTwoBaths等) 決定要不要重新加水/補時間，
// 這裡改成看「排液」勾選框：某階段勾了排液，下一階段就視為重新加水到初溫，
// 效果上等同原本的 twoStageTwoBaths 邏輯，只是不綁死在單一模式、可以逐階段自由控制

function calcHeatEnergy(waterAmount, initialTemp, targetTemp, processTime, settings){
  const heatingEnergy = waterAmount * settings.waterHeatCapacity * (targetTemp - initialTemp);
  const maintainEnergy = waterAmount * settings.waterHeatCapacity * settings.temperatureMaintainFactor * processTime;
  return heatingEnergy + maintainEnergy;
}

function calculateEmissions(process, settings){
  const waterAmountForEnergyCalc = process.fabricWeight * process.bathRatio;
  const dyeingWaterAmount = waterAmountForEnergyCalc;
  const residualWater = process.fabricWeight * settings.residualWaterFactor;
  const waterTopUpPerWash = Math.max(0, dyeingWaterAmount - residualWater);

  const drainCount = process.dyeingStages.filter(s => s.drain).length;

  // 總用水量：起始一次浴液量 + 每次水洗補水(扣掉殘留水量) + 每個排液的染色階段各補一次浴液
  let totalWaterAmount = dyeingWaterAmount;
  totalWaterAmount += waterTopUpPerWash * process.washSteps.length;
  totalWaterAmount += waterTopUpPerWash * drainCount;

  // 染色階段能耗與時間
  let dyeingEnergy = 0, dyeingTime = 0;
  process.dyeingStages.forEach((stage, index)=>{
    const prevDrained = index > 0 && process.dyeingStages[index-1].drain;
    const stageInitialTemp = (index === 0 || prevDrained) ? process.initialTemp : process.dyeingStages[index-1].targetTemp;
    const tempChangeTime = stage.rampMin; // 直接用分鐘數，不用速率反推
    dyeingEnergy += calcHeatEnergy(waterAmountForEnergyCalc, stageInitialTemp, stage.targetTemp, stage.holdMin, settings);
    dyeingTime += stage.holdMin + tempChangeTime;
  });
  dyeingTime += drainCount * settings.waterInOutTime; // 每次排液重新加水，各加一次進出水時間

  // 水洗能耗與時間
  let washingEnergy = 0, washingTime = 0;
  process.washSteps.forEach(step=>{
    washingEnergy += calcHeatEnergy(waterAmountForEnergyCalc, process.initialTemp, step.targetTemp, step.holdMin, settings);
    washingTime += step.holdMin + step.rampMin;
  });

  const totalThermalEnergy = (dyeingEnergy + washingEnergy) / (1 - settings.heatLossFactor) / 3600;
  const totalTime = dyeingTime + washingTime + (process.washSteps.length + 1) * settings.waterInOutTime;
  const electricityConsumption = (process.machinePower * totalTime) / 60;
  const steamConsumption = totalThermalEnergy * 3600 / (settings.steamLatentHeat * settings.boilerEfficiency);

  const { heatValue, emissionFactor } = HEAT_SOURCE_DATA[process.heatSource];
  const fuelConsumption = (steamConsumption * settings.steamLatentHeat) / (heatValue * settings.boilerEfficiency);
  const heatSourceCarbonEmissions = fuelConsumption * emissionFactor;
  const electricityCarbonEmissions = electricityConsumption * settings.electricityEmissionFactor;
  const totalCarbonEmissions = heatSourceCarbonEmissions + electricityCarbonEmissions;

  const perKg = (val) => val / process.fabricWeight;

  return {
    name: process.name, fabricWeight: process.fabricWeight,
    totalWaterAmount, waterConsumptionPerKg: perKg(totalWaterAmount),
    totalThermalEnergy, thermalEnergyPerKg: perKg(totalThermalEnergy),
    electricityConsumption, electricityConsumptionPerKg: perKg(electricityConsumption),
    steamConsumption, steamConsumptionPerKg: perKg(steamConsumption),
    totalCarbonEmissions, carbonEmissionsPerKg: perKg(totalCarbonEmissions),
    totalTime,
    chartData: generateChartPoints(process, settings, drainCount)
  };
}

// 產生溫度-時間曲線的座標點，分段方式跟浸染試染工具的染程曲線一樣：
// 排液會斷開曲線（中間空一小段代表排液+重新加水），不排液就接續前一階段溫度繼續畫
function generateChartPoints(process, settings, drainCount){
  let pointGroups = [];
  let drainMarkers = []; // 排液點座標，圖表上用箭頭標示
  let currentGroup = [];
  let t = settings.waterInOutTime;

  process.dyeingStages.forEach((stage, index)=>{
    const prevDrained = index > 0 && process.dyeingStages[index-1].drain;
    const stageInitialTemp = (index === 0 || prevDrained) ? process.initialTemp : process.dyeingStages[index-1].targetTemp;
    if(index === 0 || prevDrained){
      if(currentGroup.length) pointGroups.push(currentGroup);
      currentGroup = [{ t, temp: stageInitialTemp }];
    }
    t += stage.rampMin;
    currentGroup.push({ t, temp: stage.targetTemp });
    t += stage.holdMin;
    currentGroup.push({ t, temp: stage.targetTemp });
    if(stage.drain){
      drainMarkers.push({ t, temp: stage.targetTemp });
      t += settings.waterInOutTime;
    }
  });
  if(currentGroup.length) pointGroups.push(currentGroup);

  // 水洗步驟：每段都視為排液重新加水，各自從初溫開始，接續累加時間軸
  process.washSteps.forEach(step=>{
    t += settings.waterInOutTime;
    const group = [{ t, temp: process.initialTemp }];
    t += step.rampMin;
    group.push({ t, temp: step.targetTemp });
    t += step.holdMin;
    group.push({ t, temp: step.targetTemp });
    pointGroups.push(group);
    drainMarkers.push({ t, temp: step.targetTemp });
  });

  return { pointGroups, drainMarkers };
}

// ========== 計算結果：數字卡片 + 多製程溫度-時間比較圖 ==========
const CHART_COLORS = ["rgba(135, 95, 40, 0.82)", "rgba(40, 105, 140, 0.82)", "rgba(35, 115, 85, 0.82)", "rgba(155, 85, 45, 0.82)", "rgba(105, 70, 150, 0.82)", "rgba(55, 110, 125, 0.82)"];

function numFmt(val, digits){
  if(!isFinite(val)) return "–";
  return val.toLocaleString(undefined, { minimumFractionDigits:digits, maximumFractionDigits:digits });
}

function runCalculation(){
  const settings = getSettings();
  const results = processes.map(p => calculateEmissions(p, settings));
  renderResultsOutput(results);
}

function renderResultsOutput(results){
  const container = document.getElementById("resultsOutput");
  if(results.length === 0){
    container.innerHTML = `<div class="card"><p class="sub" style="margin:0;">${state.lang==="en"?"No processes yet — add one in the Process tab.":"還沒有製程資料，請先到「染程設定」新增製程。"}</p></div>`;
    return;
  }

  const compareHtml = results.length >= 2 ? `
    <div class="compare-grid">
      <div class="card">
        <h2>${T("waterCompareTitle")}</h2>
        <div id="waterBarWrap"></div>
      </div>
      <div class="card">
        <h2>${T("energyCompareTitle")}</h2>
        <div id="energyBarWrap"></div>
      </div>
    </div>
  ` : "";

  container.innerHTML = compareHtml + `<div class="results-grid">${results.map((r,i)=>`
    <div class="card result-card" style="border-top:4px solid ${CHART_COLORS[i % CHART_COLORS.length]};">
      <h2>${escapeHtmlE(r.name)}</h2>
      <div class="single-chart-wrap" data-chart-idx="${i}"></div>
      <table class="result-data-table">
        <thead>
          <tr><th></th><th data-i18n="totalConsumptionCol">${T("totalConsumptionCol")}</th><th data-i18n="perKgCol">${T("perKgCol")}</th></tr>
        </thead>
        <tbody>
          <tr><td data-i18n="waterResultLabel">${T("waterResultLabel")}</td><td><span class="rdv">${numFmt(r.totalWaterAmount,1)}</span><span class="rdu"> L</span></td><td><span class="rdv">${numFmt(r.waterConsumptionPerKg,2)}</span><span class="rdu"> L/kg</span></td></tr>
          <tr><td data-i18n="thermalResultLabel">${T("thermalResultLabel")}</td><td><span class="rdv">${numFmt(r.totalThermalEnergy,2)}</span><span class="rdu"> kWh</span></td><td><span class="rdv">${numFmt(r.thermalEnergyPerKg,3)}</span><span class="rdu"> kWh/kg</span></td></tr>
          <tr><td data-i18n="electricityResultLabel">${T("electricityResultLabel")}</td><td><span class="rdv">${numFmt(r.electricityConsumption,2)}</span><span class="rdu"> kWh</span></td><td><span class="rdv">${numFmt(r.electricityConsumptionPerKg,3)}</span><span class="rdu"> kWh/kg</span></td></tr>
          <tr><td data-i18n="steamResultLabel">${T("steamResultLabel")}</td><td><span class="rdv">${numFmt(r.steamConsumption,1)}</span><span class="rdu"> kg</span></td><td><span class="rdv">${numFmt(r.steamConsumptionPerKg,3)}</span><span class="rdu"> kg/kg</span></td></tr>
          <tr><td data-i18n="carbonResultLabel">${T("carbonResultLabel")}</td><td><span class="rdv">${numFmt(r.totalCarbonEmissions,2)}</span><span class="rdu"> kg</span></td><td><span class="rdv">${numFmt(r.carbonEmissionsPerKg,3)}</span><span class="rdu"> kg/kg</span></td></tr>
          <tr><td data-i18n="timeResultLabel">${T("timeResultLabel")}</td><td colspan="2"><span class="rdv">${numFmt(r.totalTime,0)}</span><span class="rdu"> ${state.lang==="en"?"min":"分鐘"}</span></td></tr>
        </tbody>
      </table>
    </div>
  `).join("")}</div>`;

  if(results.length >= 2){
    document.getElementById("waterBarWrap").innerHTML = renderGroupedBarSVG(
      [{ label: state.lang==="en"?"Water (L/kg)":"用水量 (L/kg)", values: results.map(r=>r.waterConsumptionPerKg) }],
      results.map(r=>r.name)
    );
    document.getElementById("energyBarWrap").innerHTML = renderGroupedBarSVG(
      [
        { label: state.lang==="en"?"Thermal (kWh/kg)":"熱能 (kWh/kg)", values: results.map(r=>r.thermalEnergyPerKg) },
        { label: state.lang==="en"?"Electricity (kWh/kg)":"電力 (kWh/kg)", values: results.map(r=>r.electricityConsumptionPerKg) },
        { label: state.lang==="en"?"CO₂ (kg/kg)":"CO₂ (kg/kg)", values: results.map(r=>r.carbonEmissionsPerKg) }
      ],
      results.map(r=>r.name)
    );
  }

  // 每個製程各自的圖，用自己卡片的實際寬度畫，手機上盡量整條曲線一次顯示、不用橫向捲動
  results.forEach((r,i)=>{
    const wrap = document.querySelector(`.single-chart-wrap[data-chart-idx="${i}"]`);
    wrap.innerHTML = renderSingleChartSVG(r, CHART_COLORS[i % CHART_COLORS.length], wrap.clientWidth || 300);
  });
}

// 單一製程的溫度-時間曲線，畫法比照浸染試染工具的染程曲線（斷點=排液）
// 手機版用較窄的預設尺寸與較精簡的座標刻度，讓整條曲線盡量一次顯示完，不用橫向捲動
// 分組長條圖：每個「類別」(用水量、或熱能/電力/CO2) 底下並排各製程的長條，方便互相比較
function renderGroupedBarSVG(categories, processNames){
  const svgW = 340;
  const svgH = 220;
  const padL = 44;
  const padR = 16;
  const padT = 28;
  const padB = 36;
  const legendH = 24;

  const plotW = svgW - padL - padR; // 280
  const plotH = svgH - padT - padB - legendH; // 132

  const allVals = categories.flatMap(c => c.values);
  let maxVal = Math.max(...allVals, 0.001) * 1.22;
  if(!isFinite(maxVal) || maxVal === 0) maxVal = 1.0;

  const yOf = (v) => padT + plotH - (v / maxVal) * plotH;

  const numCats = categories.length;
  const numProcs = Math.max(1, processNames.length);

  let barW, barGap, groupW;
  if(numCats === 1){
    barW = Math.min(36, Math.max(20, Math.floor(110 / numProcs)));
    barGap = 8;
    groupW = numProcs * barW + (numProcs - 1) * barGap;
  } else {
    const catW = plotW / numCats;
    barW = Math.min(22, Math.max(10, Math.floor((catW - 16) / numProcs)));
    barGap = 4;
    groupW = numProcs * barW + (numProcs - 1) * barGap;
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" style="display:block;width:100%;height:auto;font-family:inherit;">`;

  // Grid lines & Y axis ticks
  for(let i = 0; i <= 4; i++){
    const v = maxVal * i / 4;
    const y = yOf(v);
    svg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL+plotW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E3E1DC" stroke-width="1" stroke-dasharray="3,3"/>`;
    const vStr = v < 10 ? numFmt(v, 1) : numFmt(v, 0);
    svg += `<text x="${padL-6}" y="${(y+3.5).toFixed(1)}" font-size="9.5" font-weight="500" font-family="var(--font-num)" fill="#6B6862" text-anchor="end">${vStr}</text>`;
  }

  // Base X Axis Line
  svg += `<line x1="${padL}" y1="${(padT+plotH).toFixed(1)}" x2="${(padL+plotW).toFixed(1)}" y2="${(padT+plotH).toFixed(1)}" stroke="#C9C6BF" stroke-width="1"/>`;

  // Bars & Category Labels
  categories.forEach((cat, ci) => {
    let groupCenterX;
    if(numCats === 1){
      groupCenterX = padL + plotW / 2;
    } else {
      const catW = plotW / numCats;
      groupCenterX = padL + ci * catW + catW / 2;
    }
    const groupStartX = groupCenterX - groupW / 2;

    cat.values.forEach((v, pi) => {
      const color = CHART_COLORS[pi % CHART_COLORS.length];
      const x = groupStartX + pi * (barW + barGap);
      const y = yOf(v);
      const h = Math.max(1.0, padT + plotH - y);

      // Semi-transparent bar with rounded top
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="3" ry="3"/>`;

      // Value label on top of bar
      const vText = v < 10 ? numFmt(v, 2) : numFmt(v, 1);
      svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="9" font-weight="700" font-family="var(--font-num)" fill="${color}" text-anchor="middle">${vText}</text>`;
    });

    // Category Label
    svg += `<text x="${groupCenterX.toFixed(1)}" y="${(padT + plotH + 16).toFixed(1)}" font-size="10.5" font-weight="700" fill="#1C1B19" text-anchor="middle">${escapeHtmlE(cat.label)}</text>`;
  });

  // Legend at Bottom
  const legendY = padT + plotH + padB + 2;
  let legendX = padL;
  processNames.forEach((name, pi) => {
    const color = CHART_COLORS[pi % CHART_COLORS.length];
    svg += `<circle cx="${(legendX + 5).toFixed(1)}" cy="${(legendY + 4).toFixed(1)}" r="4" fill="${color}"/>`;
    svg += `<text x="${(legendX + 13).toFixed(1)}" y="${(legendY + 7).toFixed(1)}" font-size="10" font-weight="600" fill="#6B6862">${escapeHtmlE(name)}</text>`;
    legendX += 13 + name.length * 7.5 + 14;
  });

  svg += `</svg>`;
  return svg;
}

function renderSingleChartSVG(result, color, availableWidth){
  const isNarrow = availableWidth < 420;
  const padL = isNarrow ? 32 : 42, padR = 8, padT = 10, padB = 22;
  const points = result.chartData.pointGroups.flat();
  const maxTemp = Math.max(100, Math.ceil((Math.max(...points.map(p=>p.temp),0)+5)/10)*10);
  const minTemp = Math.min(20, Math.floor(Math.min(...points.map(p=>p.temp),20)/10)*10);
  const maxTime = Math.max(30, Math.ceil(Math.max(...points.map(p=>p.t),0)/10)*10);

  const plotW = Math.max(200, (availableWidth || 300) - padL - padR);
  const plotH = isNarrow ? 160 : 200;
  const svgW = plotW + padL + padR;
  const svgH = plotH + padT + padB;

  const xOf = (t) => padL + (t / maxTime) * plotW;
  const yOf = (temp) => padT + plotH - ((temp - minTemp) / (maxTemp - minTemp)) * plotH;

  const fontSize = isNarrow ? 8 : 10;
  const tempStep = isNarrow ? 40 : 20;
  const timeStep = Math.max(10, Math.round(maxTime / (isNarrow ? 5 : 8) / 10) * 10);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" style="display:block;width:100%;height:auto;font-family:inherit;margin-bottom:14px;">`;

  for(let temp = minTemp; temp <= maxTemp; temp += tempStep){
    const y = yOf(temp);
    svg += `<line x1="${padL}" y1="${y}" x2="${padL+plotW}" y2="${y}" stroke="#E1E4E8" stroke-width="1"/>`;
    svg += `<text x="${padL-6}" y="${y+3}" font-size="${fontSize}" fill="#5B6B79" text-anchor="end">${temp}°</text>`;
  }
  for(let tm = 0; tm <= maxTime; tm += timeStep){
    const x = xOf(tm);
    svg += `<text x="${x}" y="${padT+plotH+15}" font-size="${fontSize}" fill="#5B6B79" text-anchor="middle">${tm}'</text>`;
  }

  result.chartData.pointGroups.forEach(group=>{
    const pathD = group.map((p,i)=> (i===0?"M":"L") + xOf(p.t).toFixed(1) + "," + yOf(p.temp).toFixed(1)).join(" ");
    svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2"/>`;
  });

  // 排液箭頭：在排液點畫一個向下的小箭頭，顏色跟這條製程曲線一致，箭頭起點盡量貼齊線條
  result.chartData.drainMarkers.forEach(marker=>{
    const x = xOf(marker.t), y = yOf(marker.temp);
    const arrowBottom = y + 14;
    svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${arrowBottom}" stroke="${color}" stroke-width="1.6"/>`;
    svg += `<path d="M${x-3.5},${arrowBottom-4} L${x},${arrowBottom} L${x+3.5},${arrowBottom-4}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  svg += `</svg>`;
  return svg;
}

document.getElementById("calcBtn").addEventListener("click", runCalculation);

// 註冊 Service Worker，讓工具可以離線使用、也能被瀏覽器判定為可安裝的 PWA
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(err=>{
      console.error("Service worker registration failed:", err);
    });
  });
}
