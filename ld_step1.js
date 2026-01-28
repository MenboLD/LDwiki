const slots = Array.from(document.querySelectorAll('.slot'));
let state = { slots:Array(5).fill(null), locked:Array(5).fill(false), selectedDownstream:new Set(['教官'])};
let pendingName=null;
function render(){ slots.forEach((el,i)=>{ el.querySelector('.name').textContent = state.slots[i]||'空'; el.querySelector('.lock').textContent = state.locked[i]?'🔒':'🔓';});}
slots.forEach(el=>{ const i=+el.dataset.i; el.querySelector('.lock').onclick=()=>{state.locked[i]=!state.locked[i]; render();};});
document.querySelectorAll('.card').forEach(c=>{ c.onclick=()=>{pendingName=c.dataset.name;};});
document.getElementById('transfer').onclick=()=>{ if(!pendingName) return; if(state.selectedDownstream.has(pendingName)){ document.getElementById('modal').classList.remove('hidden'); } else doTransfer();};
function doTransfer(){ const idx=state.slots.findIndex((v,i)=>!state.locked[i]); if(idx>=0) state.slots[idx]=pendingName; pendingName=null; render();}
document.getElementById('yes').onclick=()=>{ state.selectedDownstream.delete(pendingName); document.getElementById('modal').classList.add('hidden'); doTransfer();};
document.getElementById('no').onclick=()=>{ document.getElementById('modal').classList.add('hidden');};
document.getElementById('reset').onclick=()=>{ state.slots.fill(null); state.locked.fill(false); render();};
document.getElementById('swapUp').onclick=()=>{ for(let i=1;i<5;i++){ if(state.slots[i]&&!state.locked[i]&&!state.locked[i-1]){ [state.slots[i-1],state.slots[i]]=[state.slots[i],state.slots[i-1]]; break;}} render();};
document.getElementById('swapDown').onclick=()=>{ for(let i=3;i>=0;i--){ if(state.slots[i]&&!state.locked[i]&&!state.locked[i+1]){ [state.slots[i+1],state.slots[i]]=[state.slots[i],state.slots[i+1]]; break;}} render();};
document.getElementById('remove').onclick=()=>{ for(let i=0;i<5;i++){ if(state.slots[i]&&!state.locked[i]){ state.slots[i]=null; state.locked[i]=false; break;}} render();};
render();
