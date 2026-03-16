const STAYFLOW_KEY='stayflow_state_v3';
const defaultState={
  language:'en',
  theme:'dark',
  property:null,
  clients:[
    {client:'John Mwangi',property:'Ocean Breeze Apartments',status:'Active',payment:'Paid',amount:100000,paidOn:'2026-03-15'},
    {client:'Rehema Kassim',property:'Harbor View Lodge',status:'Pending Activation',payment:'Pending',amount:100000,paidOn:'2026-03-15'},
    {client:'Said Juma',property:'Palm Court Apartments',status:'Active',payment:'Paid',amount:250000,paidOn:'2026-03-14'}
  ],
  sales:[
    {name:'Asha',region:'Zanzibar',commission:20,status:'Active',agreementAccepted:true,agreementDate:'2026-03-01',sales:[{date:'2026-03-15',property:'Ocean Breeze Apartments',amount:100000},{date:'2026-03-15',property:'Harbor View Lodge',amount:100000}]},
    {name:'Daniel',region:'Dar es Salaam',commission:15,status:'On Hold',agreementAccepted:true,agreementDate:'2026-03-01',sales:[{date:'2026-03-14',property:'Palm Court Apartments',amount:250000}]},
    {name:'Grace',region:'Arusha',commission:18,status:'Pending Agreement',agreementAccepted:false,agreementDate:null,sales:[]}
  ],
  commissionPayouts:[
    {salesperson:'Asha',week:'2026-03-10 to 2026-03-16',amount:40000,status:'Confirmed Received',markedPaidDate:'2026-03-14',confirmedDate:'2026-03-14'},
    {salesperson:'Daniel',week:'2026-03-10 to 2026-03-16',amount:37500,status:'Awaiting Confirmation',markedPaidDate:'2026-03-14',confirmedDate:null},
    {salesperson:'Grace',week:'2026-03-10 to 2026-03-16',amount:0,status:'Not Eligible',markedPaidDate:null,confirmedDate:null}
  ],
  bookings:[
    {date:'2026-03-15',gross:180000,paid:120000,status:'checked_in'},
    {date:'2026-03-15',gross:240000,paid:240000,status:'checked_in'},
    {date:'2026-03-15',gross:120000,paid:90000,status:'reserved'},
    {date:'2026-03-14',gross:200000,paid:200000,status:'checked_out'}
  ],
  expenses:[
    {date:'2026-03-15',item:'Soap and toiletries',amount:25000},
    {date:'2026-03-15',item:'Water bottles',amount:15000},
    {date:'2026-03-14',item:'Cleaner transport',amount:10000}
  ]
};
const currencies=['TZS','USD','KES','UGX','EUR','GBP','ZAR','AED','NGN','RWF'];
const issueTemplates={guest_house:['AC','Plumbing','Electricity','Door/Lock','Bathroom','Wi‑Fi'],lodge:['Water pressure','Solar power','Generator','Mosquito nets','Bathroom','Security lighting'],apartment:['Kitchen sink','Cooker','Fridge','AC','Plumbing','Electricity','Wi‑Fi']};
const roomSeed=[{name:'Room 1',sub:'Deluxe • Good condition',status:'avail'},{name:'Room 2',sub:'David Kim • Needs service',status:'occ'},{name:'Room 3',sub:'Cleaning in progress',status:'clean'},{name:'Room 4',sub:'Reserved for Sarah Ali',status:'reserve'}];
const issueSeed=[{title:'Room 2 • AC not cooling',sub:'Priority: High • Progress: In progress',status:'repair'},{title:'Room 7 • Shower leak',sub:'Priority: Medium • Progress: Waiting parts',status:'service'},{title:'Room 9 • Good condition',sub:'No open issues',status:'good'}];
const reportSeed=[['checkins_today_sub','3 arrivals confirmed','3','reserve'],['checkouts_today_sub','2 departures due','2','avail'],['room_issues_sub','2 need attention today','2','service'],['inventory_alerts_sub','Towels, soap, water low','3','clean']];
async function loadLang(lang){const res=await fetch(`lang/${lang}.json`);return await res.json();}
function getState(){try{return mergeState(defaultState, JSON.parse(localStorage.getItem(STAYFLOW_KEY)||'{}'));}catch{return JSON.parse(JSON.stringify(defaultState));}}
function mergeState(base, saved){const merged=JSON.parse(JSON.stringify(base)); for(const k in saved){merged[k]=saved[k];} return merged;}
function saveState(state){localStorage.setItem(STAYFLOW_KEY,JSON.stringify(state));}
function applyTheme(theme){document.body.classList.toggle('light',theme==='light');}
function isoToday(){return '2026-03-15';}
function todayLabel(){return new Date(isoToday()).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function money(n, currency='TZS'){return `${Number(n||0).toLocaleString('en-GB')} ${currency}`;}
function expensesByDate(state, date){return (state.expenses||[]).filter(x=>x.date===date);}
function bookingByDate(state, date){return (state.bookings||[]).filter(x=>x.date===date);}
function ownerTotals(state, date){const prop=state.property||{}; const currency=prop.currency||'TZS'; const bookings=bookingByDate(state,date); const gross=bookings.reduce((a,b)=>a+Number(b.gross||0),0); const outstanding=bookings.reduce((a,b)=>a+(Number(b.gross||0)-Number(b.paid||0)),0); const expenses=expensesByDate(state,date).reduce((a,b)=>a+Number(b.amount||0),0); const net=gross-expenses; return {gross,expenses,net,outstanding,currency};}
function adminTotals(state, date){const clientRows=(state.clients||[]).filter(c=>c.paidOn===date); const gross=clientRows.reduce((a,b)=>a+Number(b.amount||0),0); const paidCount=clientRows.filter(c=>c.payment==='Paid').length; const pending=(state.clients||[]).filter(c=>c.payment!=='Paid').length; const payouts=(state.commissionPayouts||[]); return {gross,paidCount,pending,activations:(state.clients||[]).filter(c=>c.status==='Active').length, commissionPaid:payouts.filter(p=>p.status==='Confirmed Received').reduce((a,b)=>a+Number(b.amount||0),0), awaitingConfirm:payouts.filter(p=>p.status==='Awaiting Confirmation').reduce((a,b)=>a+Number(b.amount||0),0)};}
function salesTotals(state, date){const rows=[]; (state.sales||[]).forEach(s=> (s.sales||[]).forEach(x=> {if(x.date===date) rows.push({...x,salesperson:s.name,commission:s.commission});})); const gross=rows.reduce((a,b)=>a+Number(b.amount||0),0); const commission=rows.reduce((a,b)=>a+(Number(b.amount||0)*Number(b.commission||0)/100),0); const active=(state.sales||[]).filter(x=>x.status==='Active').length; const awaiting=(state.commissionPayouts||[]).filter(x=>x.status==='Awaiting Confirmation').length; return {gross,commission,count:rows.length,rows,active,awaiting};}
function ensurePropertyDefaults(state){if(!state.property) return state; if(!state.property.currency) state.property.currency='TZS'; return state;}
function logoSvg(){return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 29L32 15L49 29" stroke="#8FB7A3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 28H42" stroke="#8FB7A3" stroke-width="4" stroke-linecap="round"/><path d="M19 38C23 35 28 35 32 38C36 41 41 41 45 38" stroke="#C7D9CF" stroke-width="3.8" stroke-linecap="round"/><path d="M19 46C23 43 28 43 32 46C36 49 41 49 45 46" stroke="#A8C8B9" stroke-width="3.8" stroke-linecap="round"/><path d="M19 54C23 51 28 51 32 54C36 57 41 57 45 54" stroke="#8FB7A3" stroke-width="3.8" stroke-linecap="round"/></svg>`}
