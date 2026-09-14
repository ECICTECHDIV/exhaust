/* ============================================================
 * data.js — 浸染能耗計算工具：查表資料 / 範本庫 / 雙語字典
 * 這個檔案只放「資料」，不放邏輯。修改物理常數預設值、熱源熱值/排碳係數、
 * 內建染色/水洗範本、雙語字串時改這裡；改計算邏輯或畫面互動去改 app.js。
 * 載入順序要排在 app.js 之前（app.js 會直接使用這裡定義的常數）。
 * ============================================================ */

/* ---- 中英文對照 ---- */
const TRANSLATIONS = {
  zh: {
    appTitle:"染色能耗計算工具",
    tabSettings:"自定義", tabProcess:"染程設定", tabResults:"計算結果", tabMethods:"計算方式",
    customSettingsTitle:"自定義設定", customSettingsSub:"物理常數，一般不需調整；有特殊現場條件才需要修改",
    waterHeatCapacityLabel:"水的比熱 (kJ/(kg·°C))", boilerEfficiencyLabel:"鍋爐效率 (0-1)",
    steamLatentHeatLabel:"蒸汽潛熱 (kJ/kg)", electricityEmissionLabel:"電力排放係數 (kg CO₂/kWh)",
    waterInOutTimeLabel:"進出水時間 (分鐘)", tempMaintainFactorLabel:"保溫耗損係數",
    heatLossFactorLabel:"熱損耗係數 (0-1)", residualWaterFactorLabel:"殘留水量係數",
    resetDefaultsBtn:"重設為預設值", settingsResetMsg:"已重設為預設值",
    processSettingsTitle:"染程設定", loadSetLabel:"載入製程組", saveSetLabel:"儲存製程組",
    addProcessBtn:"＋ 新增製程", clearBtn:"清除", selectSetOpt:"-- 選擇已儲存的製程組 --", setNamePh:"輸入製程組名稱",
    fabricWeightLabel:"布重 (kg)", bathRatioLabel:"浴比", initialTempLabel:"初溫 (°C)", machinePowerLabel:"機台功率 (kW)",
    heatSourceLabel:"熱源",
    dyeingStagesTitle:"染色階段", addDyeStageBtn:"＋ 新增染色階段", drainLabel:"排液（下一階段視為重新加水到初溫）",
    washStepsTitle:"水洗步驟", addWashBtn:"＋ 新增水洗",
    targetTempLabel:"目標溫度(°C)", rampMinLabel:"爬升(分)", holdMinLabel:"保溫(分)",
    resultsTitle:"計算結果", calcBtn:"計算 / 更新結果", chartTitle:"溫度-時間比較圖",
    waterCompareTitle:"用水量比較（每公斤）", energyCompareTitle:"能耗與CO₂比較（每公斤）",
    totalConsumptionCol:"總消耗量", perKgCol:"每公斤消耗量",
    waterResultLabel:"總用水量", thermalResultLabel:"總熱能", electricityResultLabel:"電力消耗",
    steamResultLabel:"蒸汽消耗", carbonResultLabel:"CO₂排放", timeResultLabel:"總製程時間",
    methodsTitle:"計算方式說明",
    m_waterTitle:"用水量",
    m_waterText:"總用水量 = 起始浴液量（布重 × 浴比）+ 每次水洗的補水量 + 每次「排液」重新加水的補水量。\n\n補水量會先扣掉殘留在布料上、不用重新補的水量（殘留水量係數 × 布重），所以補水量 = max(0, 浴液量 − 殘留水量)。",
    m_thermalTitle:"熱能",
    m_thermalText:"每一段（染色階段或水洗步驟）所需熱能 = 加熱能量 + 保溫耗損能量。\n\n加熱能量 = 浴液量 × 水的比熱 × 溫差（跟時間快慢無關，單純看溫差）；\n保溫耗損能量 = 浴液量 × 水的比熱 × 保溫耗損係數 × 保溫時間。\n\n全部段落加總後，再除以（1 − 熱損耗係數）反映管路/槽體散失，最後單位從 kJ 換算成 kWh。",
    m_timeTitle:"總製程時間",
    m_timeText:"每段時間 = 爬升分鐘 + 保溫分鐘；有勾選「排液」的階段，額外加一次進出水時間。\n\n水洗每次開始前也各加一次進出水時間，整體再加一次起始進出水時間。",
    m_electricityTitle:"電力消耗",
    m_electricityText:"電力消耗 = 機台功率 × 總製程時間（換算成小時）。",
    m_steamTitle:"蒸汽與燃料消耗",
    m_steamText:"蒸汽消耗由總熱能反推：\n蒸汽消耗 = 總熱能 × 3600 ÷（蒸汽潛熱 × 鍋爐效率）。\n\n燃料消耗再由蒸汽消耗反推：\n燃料消耗 = （蒸汽消耗 × 蒸汽潛熱）÷（熱源熱值 × 鍋爐效率）。\n\n不同熱源（煤／重油／天然氣）的熱值與排放係數已內建，選了熱源會自動代入對應數值。",
    m_carbonTitle:"CO₂排放",
    m_carbonText:"CO₂排放 = 熱源燃燒排放（燃料消耗 × 熱源排放係數）+ 用電排放（電力消耗 × 電力排放係數）。",
    m_drainTitle:"「排液」的意義",
    m_drainText:"染色階段勾選「排液」，代表這一段結束後會把缸內的水排掉、重新加水到初溫，才進入下一階段——下一階段的起始溫度會是「初溫」，不是接續這一段的溫度；同時會多算一次補水量跟一次進出水時間。\n\n不勾排液，下一階段就直接從這一段的溫度繼續加溫或降溫，中間不重新加水。"
  },
  en: {
    appTitle:"Dyeing Energy Consumption Tool",
    tabSettings:"Settings", tabProcess:"Process", tabResults:"Results", tabMethods:"Methods",
    customSettingsTitle:"Custom Settings", customSettingsSub:"Physical constants — usually no need to adjust unless site conditions differ",
    waterHeatCapacityLabel:"Water Heat Capacity (kJ/(kg·°C))", boilerEfficiencyLabel:"Boiler Efficiency (0-1)",
    steamLatentHeatLabel:"Steam Latent Heat (kJ/kg)", electricityEmissionLabel:"Electricity Emission (kg CO₂/kWh)",
    waterInOutTimeLabel:"Water In/Out Time (min)", tempMaintainFactorLabel:"Temp. Maintain Factor",
    heatLossFactorLabel:"Heat Loss Factor (0-1)", residualWaterFactorLabel:"Residual Water Factor",
    resetDefaultsBtn:"Reset to Defaults", settingsResetMsg:"Reset to defaults",
    processSettingsTitle:"Process Settings", loadSetLabel:"Load Set", saveSetLabel:"Save Set",
    addProcessBtn:"+ Add Process", clearBtn:"Clear", selectSetOpt:"-- Select a saved set --", setNamePh:"Enter set name",
    fabricWeightLabel:"Fabric Weight (kg)", bathRatioLabel:"Liquor Ratio", initialTempLabel:"Initial Temp. (°C)", machinePowerLabel:"Machine Power (kW)",
    heatSourceLabel:"Heat Source",
    dyeingStagesTitle:"Dyeing Stages", addDyeStageBtn:"+ Add Dyeing Stage", drainLabel:"Drain (next stage refills water to initial temp)",
    washStepsTitle:"Wash Steps", addWashBtn:"+ Add Wash",
    targetTempLabel:"Target Temp.(°C)", rampMinLabel:"Ramp(min)", holdMinLabel:"Hold(min)",
    resultsTitle:"Calculation Results", calcBtn:"Calculate / Update", chartTitle:"Temperature-Time Comparison",
    waterCompareTitle:"Water Consumption Comparison (per kg)", energyCompareTitle:"Energy & CO₂ Comparison (per kg)",
    totalConsumptionCol:"Total", perKgCol:"Per kg Fabric",
    waterResultLabel:"Total Water", thermalResultLabel:"Total Thermal Energy", electricityResultLabel:"Electricity",
    steamResultLabel:"Steam", carbonResultLabel:"CO₂ Emissions", timeResultLabel:"Total Time",
    methodsTitle:"Calculation Methods",
    m_waterTitle:"Water Consumption",
    m_waterText:"Total water = initial bath volume (fabric weight × liquor ratio) + top-up water for each wash + top-up water for each dyeing-stage \"drain\".\n\nTop-up water is reduced by water already retained in the fabric (residual water factor × fabric weight), so top-up = max(0, bath volume − residual water).",
    m_thermalTitle:"Thermal Energy",
    m_thermalText:"Thermal energy for each stage (dyeing or washing) = heating energy + temperature-maintain loss.\n\nHeating energy = bath volume × water heat capacity × temperature difference (independent of how fast it's heated).\nMaintain loss = bath volume × water heat capacity × maintain factor × hold time.\n\nAll stages are summed, then divided by (1 − heat loss factor) to account for losses from piping/tank, and converted from kJ to kWh.",
    m_timeTitle:"Total Process Time",
    m_timeText:"Each stage's time = ramp minutes + hold minutes. A stage with \"drain\" checked adds one extra water in/out time.\n\nEach wash step also adds a water in/out time before it starts, plus one overall water in/out time at the beginning.",
    m_electricityTitle:"Electricity Consumption",
    m_electricityText:"Electricity consumption = machine power × total process time (converted to hours).",
    m_steamTitle:"Steam & Fuel Consumption",
    m_steamText:"Steam consumption is derived from total thermal energy:\nsteam = thermal energy × 3600 ÷ (steam latent heat × boiler efficiency).\n\nFuel consumption is then derived from steam consumption:\nfuel = (steam × steam latent heat) ÷ (heat source's heating value × boiler efficiency).\n\nHeating values and emission factors for coal/heavy oil/natural gas are built in and applied automatically based on the selected heat source.",
    m_carbonTitle:"CO₂ Emissions",
    m_carbonText:"CO₂ emissions = heat source combustion emissions (fuel consumption × heat source emission factor) + electricity emissions (electricity consumption × electricity emission factor).",
    m_drainTitle:"What \"Drain\" Means",
    m_drainText:"Checking \"drain\" on a dyeing stage means the bath is drained and refilled to the initial temperature before the next stage begins — the next stage's starting temperature is the initial temperature, not a continuation of this stage's temperature. This also adds one extra top-up water amount and one extra water in/out time.\n\nWithout \"drain\", the next stage continues heating or cooling directly from this stage's temperature, without refilling."
  }
};

// 原始能耗計算機的預設物理常數，逐一對照搬過來，數值完全不變
const DEFAULT_SETTINGS = {
  waterHeatCapacity: 4.186,
  boilerEfficiency: 0.8,
  steamLatentHeat: 2257,
  electricityEmissionFactor: 0.5,
  waterInOutTime: 5,
  temperatureMaintainFactor: 0.005,
  heatLossFactor: 0.1,
  residualWaterFactor: 2
};

/* ---- 熱源清單 ---- */
const HEAT_SOURCES = ["coal","heavyOil","naturalGas"];


/* ---- 內建染色範本（直接搬自浸染試染工具，數值不變） ---- */
const BUILTIN_DYE_TEMPLATES = [
  { id:"bd_m1", name:"染法一：一般染法", segs:[
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:60, rampMin:25, holdMin:20, drain:false },
    { targetTemp:60, rampMin:0,  holdMin:45, drain:true }
  ]},
  { id:"bd_m2", name:"染法二：快速恆溫法（紗線/易染織物）", segs:[
    { targetTemp:60, rampMin:0, holdMin:10, drain:false },
    { targetTemp:60, rampMin:0, holdMin:10, drain:false },
    { targetTemp:60, rampMin:0, holdMin:10, drain:false },
    { targetTemp:60, rampMin:0, holdMin:15, drain:false },
    { targetTemp:60, rampMin:0, holdMin:30, drain:false },
    { targetTemp:60, rampMin:0, holdMin:45, drain:true }
  ]},
  { id:"bd_m3", name:"染法三：高溫移染法（Viscose/Tencel/Modal/厚重織物）", segs:[
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:80, rampMin:20, holdMin:20, drain:false },
    { targetTemp:60, rampMin:15, holdMin:30, drain:false },
    { targetTemp:60, rampMin:0,  holdMin:45, drain:true }
  ]},
  { id:"bd_m4", name:"染法四：預加鹼法", segs:[
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:30, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:60, rampMin:15, holdMin:30, drain:false },
    { targetTemp:60, rampMin:0,  holdMin:45, drain:true }
  ]},
  { id:"bd_m5", name:"染法五：Turquoise Blue G 專用染法", segs:[
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:50, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:90, rampMin:25, holdMin:20, drain:false },
    { targetTemp:80, rampMin:8,  holdMin:20, drain:false },
    { targetTemp:80, rampMin:0,  holdMin:30, drain:false },
    { targetTemp:80, rampMin:0,  holdMin:45, drain:true }
  ]},
  { id:"bd_nylon6", name:"尼龍6 繩狀/經軸/筒子紗染色（A-13）", segs:[
    { targetTemp:40, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:40, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:40, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:98, rampMin:58, holdMin:30, drain:true }
  ]},
  { id:"bd_nylon66", name:"尼龍6,6 繩狀/經軸/筒子紗染色（A-13）", segs:[
    { targetTemp:40, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:40, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:40, rampMin:0,  holdMin:10, drain:false },
    { targetTemp:115, rampMin:75, holdMin:30, drain:true }
  ]}
];

/* ---- 內建水洗範本（直接搬自浸染試染工具，數值不變） ---- */
const BUILTIN_WASH_TEMPLATES = [
  { id:"bw_a4", name:"標準水洗（A-4，7道）", segs:[
    { targetTemp:40, rampMin:0,  holdMin:10, drain:true },
    { targetTemp:40, rampMin:0,  holdMin:10, drain:true },
    { targetTemp:65, rampMin:8,  holdMin:10, drain:true },
    { targetTemp:90, rampMin:17, holdMin:10, drain:true },
    { targetTemp:98, rampMin:19, holdMin:10, drain:true },
    { targetTemp:65, rampMin:8,  holdMin:10, drain:true },
    { targetTemp:40, rampMin:0,  holdMin:10, drain:true }
  ]},
  { id:"bw_mt", name:"MT 中溫洗淨（5道）", segs:[
    { targetTemp:50, rampMin:0, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true }
  ]},
  { id:"bw_mts", name:"MTS 中溫皂洗（5道）", segs:[
    { targetTemp:50, rampMin:0, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true },
    { targetTemp:70, rampMin:7, holdMin:10, drain:true }
  ]},
  { id:"bw_ht", name:"HT 高溫皂洗（6道）", segs:[
    { targetTemp:50, rampMin:0,  holdMin:10, drain:true },
    { targetTemp:60, rampMin:3,  holdMin:10, drain:true },
    { targetTemp:80, rampMin:10, holdMin:10, drain:true },
    { targetTemp:98, rampMin:16, holdMin:10, drain:true },
    { targetTemp:80, rampMin:10, holdMin:10, drain:true },
    { targetTemp:60, rampMin:3,  holdMin:10, drain:true }
  ]}
];


/* ---- 熱源熱值 / 排碳係數 ---- */
const HEAT_SOURCE_DATA = {
  coal: { heatValue: 29307, emissionFactor: 2.86 },
  heavyOil: { heatValue: 40194, emissionFactor: 3.15 },
  naturalGas: { heatValue: 38931, emissionFactor: 2.03 }
};
