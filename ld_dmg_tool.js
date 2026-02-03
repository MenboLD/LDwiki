const STATE={units:[],treasures:[],values:{unit:null,treasure_on:false,treasure_level:1}};
const supa=window.supabase.createClient(window.LD_SUPABASE_URL,window.LD_SUPABASE_ANON_KEY);
async function loadMasters(){
 const u=await supa.from('ld_DMG_unit_atk').select('UnitName,unitrarity');
 const t=await supa.from('ld_DMG_treasure').select('*');
 STATE.units=u.data||[];STATE.treasures=t.data||[];
}
const normName=r=>r.treasurename??r.treasure_name;
const normLv=r=>String(r.parame_1??r.param_level);
const normText=r=>r.parame_text??r.param_text;
const normVal=r=>r.parame_2??r.param_value;
function setupUnit(){
 const s=document.getElementById('unitSelect');s.innerHTML='';
 STATE.units.forEach(u=>{const o=document.createElement('option');o.value=u.UnitName;o.textContent=u.UnitName;o.dataset.rarity=u.unitrarity;s.appendChild(o);});
 s.onchange=()=>{STATE.values.unit=s.value;updateTreasureVisibility();};
 if(s.options.length){s.value=s.options[0].value;STATE.values.unit=s.value;}
}
function updateTreasureVisibility(){
 const c=document.getElementById('treasure-card');
 const u=STATE.units.find(x=>x.UnitName===STATE.values.unit);
 if(!u||u.unitrarity!=='神話'){c.classList.add('hidden');return;}
 const rows=STATE.treasures.filter(r=>normName(r)===STATE.values.unit);
 if(!rows.length){c.classList.add('hidden');return;}
 c.classList.remove('hidden');
}
function setupTreasure(){
 const t=document.getElementById('treasureToggle');
 const l=document.getElementById('treasureLevel');
 const lr=document.getElementById('treasure-level-row');
 for(let i=1;i<=11;i++){const o=document.createElement('option');o.value=i;o.textContent=i;l.appendChild(o);}
 t.onclick=()=>{STATE.values.treasure_on=!STATE.values.treasure_on;t.textContent=STATE.values.treasure_on?'ON':'OFF';lr.classList.toggle('hidden',!STATE.values.treasure_on);renderTreasureDetail();};
 l.onchange=()=>{STATE.values.treasure_level=l.value;renderTreasureDetail();};
}
function renderTreasureDetail(){
 const b=document.getElementById('treasure-detail');b.innerHTML='';
 if(!STATE.values.treasure_on)return;
 const rows=STATE.treasures.filter(r=>normName(r)===STATE.values.unit&&normLv(r)===String(STATE.values.treasure_level));
 rows.forEach(r=>{const d=document.createElement('div');d.textContent=`${normText(r)} : ${normVal(r)}`;b.appendChild(d);});
}
function setupTabs(){
 document.querySelectorAll('.tab').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('isActive'));b.classList.add('isActive');
 document.getElementById('tab-input').classList.toggle('hidden',b.dataset.tab!=='input');
 document.getElementById('tab-output').classList.toggle('hidden',b.dataset.tab!=='output');};});
}
async function main(){setupTabs();await loadMasters();setupUnit();setupTreasure();updateTreasureVisibility();}
main();
