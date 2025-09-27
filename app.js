// ================================
// app.js — Polished & fully working
// ================================

// ---------- State & Storage ----------
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let workHours = JSON.parse(localStorage.getItem("workHours")) || Array(7).fill(0);
if (!Array.isArray(workHours) || workHours.length !== 7) workHours = Array(7).fill(0);

let completedPomodoros = parseInt(localStorage.getItem("completedPomodoros")) || 0;
let dailyGoal = parseFloat(localStorage.getItem("dailyGoal")) || 6;

// Pomodoro timer
let timerId = null;
let timerRunning = false;
let timerMinutes = 25, timerSeconds = 0;
let timerMinutesStart = 25, timerSecondsStart = 0;

// Chart instances
let workChart = null;
let expensePieChart = null;

// ---------- DOM ----------
const $ = id => document.getElementById(id);

const amountInput = $('amount');
const categorySelect = $('category');
const addExpenseBtn = $('addExpense');
const expenseList = $('expenseList');
const totalExpenseEl = $('totalExpense');
const filterCategory = $('filterCategory');
const clearExpensesBtn = $('clearExpenses');

const customMinutesInput = $('customMinutes');
const setTimerBtn = $('setTimer');

const dailyGoalInput = $('dailyGoalInput');
const setDailyGoalBtn = $('setDailyGoalBtn');

const timerDisplay = $('timerDisplay');
const sessionType = $('sessionType');
const startTimerBtn = $('startTimer');
const pauseTimerBtn = $('pauseTimer');
const resetTimerBtn = $('resetTimer');

const workProgressEl = $('workProgress');
const dailyGoalProgressEl = $('dailyGoalProgress');
const workSummary = $('workSummary');
const sessionCount = $('sessionCount');

const dailyNote = $('dailyNote');
const noteCategory = $('noteCategory');
const saveNoteBtn = $('saveNote');
const notesList = $('notesList');

const workChartCanvas = $('workChart');
const expensePieCanvas = $('expensePieChart');
const weekSummary = $('weekSummary');

const downloadPDFBtn = $('downloadPDF');
const downloadCSVBtn = $('downloadCSV');

// ---------- Helpers ----------
const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const currency = v => `$${Number(v || 0).toFixed(2)}`;

function persistAll(){
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("notes", JSON.stringify(notes));
  localStorage.setItem("workHours", JSON.stringify(workHours));
  localStorage.setItem("completedPomodoros", completedPomodoros);
  localStorage.setItem("dailyGoal", dailyGoal);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// ---------- Expenses ----------
function renderExpenses(filter="All"){
  if (!expenseList) return;
  expenseList.innerHTML = "";
  const list = filter === "All" ? expenses : expenses.filter(e=>e.category===filter);
  let total = 0;
  list.forEach(exp=>{
    total += exp.amount;
    const li = document.createElement("li");
    li.className = 'expense-item';
    li.innerHTML = `
      <div class="expense-left">
        <div class="cat">${escapeHtml(exp.category)}</div>
        <div class="date small">(${new Date(exp.date).toLocaleDateString()})</div>
      </div>
      <div class="expense-right">
        <div class="amount">${currency(exp.amount)}</div>
        <button class="delete-btn" data-id="${exp.id}" title="Delete">✕</button>
      </div>
    `;
    expenseList.appendChild(li);
  });
  totalExpenseEl.textContent = `Total: ${currency(total)}`;
  renderExpensePie();
  renderWorkChart();
  updateWeekSummary();
}

function addExpense(){
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  if (!category || category==="Choose Category" || isNaN(amount) || amount<=0){
    alert("Please enter a valid amount and pick a category.");
    return;
  }
  const newExp = { id: Date.now(), amount, category, date: new Date().toISOString() };
  expenses.push(newExp);
  persistAll();
  amountInput.value = "";
  categorySelect.value = "Choose Category";
  renderExpenses(filterCategory.value || "All");
}

expenseList?.addEventListener('click', e=>{
  const btn = e.target.closest(".delete-btn");
  if(!btn) return;
  const id = parseInt(btn.dataset.id);
  expenses = expenses.filter(e=>e.id!==id);
  persistAll();
  renderExpenses(filterCategory.value || "All");
});

function clearExpenses(){
  if(!confirm("Clear all expenses?")) return;
  expenses=[];
  persistAll();
  renderExpenses("All");
}

// ---------- Pomodoro Timer ----------
function updateTimerUI(){
  timerDisplay.textContent = `${String(timerMinutes).padStart(2,'0')}:${String(timerSeconds).padStart(2,'0')}`;
  const totalSec = Math.max(timerMinutesStart*60+timerSecondsStart,1);
  const elapsed = totalSec-(timerMinutes*60+timerSeconds);
  const pct = Math.min(100,(elapsed/totalSec)*100);
  if(workProgressEl) workProgressEl.style.width = pct+'%';
}

function startTimer(){
  if(timerRunning) return;
  timerRunning=true;
  if((timerMinutesStart===0&&timerSecondsStart===0)||typeof timerMinutesStart==='undefined'){
    timerMinutesStart=timerMinutes||25;
    timerSecondsStart=timerSeconds||0;
  }
  timerId = setInterval(()=>{
    if(timerSeconds===0 && timerMinutes===0){
      clearInterval(timerId);
      timerRunning=false;
      completedPomodoros++;
      const addedHours=(timerMinutesStart+timerSecondsStart/60)/60;
      workHours[new Date().getDay()]=(workHours[new Date().getDay()]||0)+addedHours;
      persistAll();
      updateDailyGoalUI();
      renderWorkChart();
      updateWeekSummary();
      sessionCount&&(sessionCount.textContent=`Pomodoros Completed: ${completedPomodoros}`);
      alert("Pomodoro finished!");
      timerMinutes=timerMinutesStart;
      timerSeconds=timerSecondsStart;
      updateTimerUI();
      return;
    }
    if(timerSeconds===0){timerMinutes--;timerSeconds=59;}
    else timerSeconds--;
    updateTimerUI();
  },1000);
}

function pauseTimer(){if(timerId) clearInterval(timerId); timerRunning=false;}
function resetTimer(){if(timerId) clearInterval(timerId); timerRunning=false; timerMinutes=timerMinutesStart; timerSeconds=timerSecondsStart; workProgressEl&&(workProgressEl.style.width='0%'); updateTimerUI();}
function setCustomTimer(){const v=parseInt(customMinutesInput.value); if(isNaN(v)||v<=0){alert("Enter positive minutes"); return;} timerMinutes=v; timerSeconds=0; timerMinutesStart=v; timerSecondsStart=0; updateTimerUI(); customMinutesInput.value='';}

// ---------- Work hours ----------
function updateDailyGoalUI(){
  const today=new Date().getDay();
  const todayHours=workHours[today]||0;
  const pct=Math.min(100, todayHours/(dailyGoal||1)*100);
  if(dailyGoalProgressEl) dailyGoalProgressEl.style.width=pct+'%';
  if(workSummary) workSummary.textContent=`Today: ${todayHours.toFixed(2)} / ${dailyGoal} hours`;
}

function setDailyGoal(){
  const v=parseFloat(dailyGoalInput.value);
  if(isNaN(v)||v<=0){alert("Enter a valid daily goal in hours"); return;}
  dailyGoal=v;
  persistAll();
  dailyGoalInput.value='';
  updateDailyGoalUI();
  alert(`Daily goal set to ${dailyGoal} hours`);
}

// ---------- Notes ----------
let editNoteIndex=null;
function renderNotes(){
  notesList.innerHTML='';
  notes.forEach((n,idx)=>{
    const li=document.createElement('li');
    li.className='note-item';
    const dateStr=n.timestampISO?new Date(n.timestampISO).toLocaleString():'—';
    li.innerHTML=`
      <div class="note-header">
        <div class="note-category">${escapeHtml(n.category)}</div>
        <div class="note-time small">${dateStr}</div>
      </div>
      <div class="note-text">${escapeHtml(n.text)}</div>
      <div class="note-buttons">
        <button class="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    li.querySelector('.edit').addEventListener('click', ()=>{
      dailyNote.value=n.text;
      noteCategory.value=n.category;
      editNoteIndex=idx;
    });
    li.querySelector('.delete').addEventListener('click', ()=>{
      if(!confirm('Delete this note?')) return;
      notes.splice(idx,1);
      persistAll();
      renderNotes();
      updateWeekSummary();
    });
    notesList.appendChild(li);
  });
}

function saveNote(){
  const text=dailyNote.value.trim();
  const category=noteCategory.value;
  if(!text||!category||category==='Choose Category'){alert('Write a note and choose a category'); return;}
  const timestampISO=new Date().toISOString();
  if(editNoteIndex!==null){notes[editNoteIndex]={text,category,timestampISO}; editNoteIndex=null;}
  else notes.push({text,category,timestampISO});
  dailyNote.value=''; noteCategory.value='Choose Category';
  persistAll();
  renderNotes();
  updateWeekSummary();
}

// ---------- Charts ----------
function generatePalette(n){const base=['#0077b6','#00b4d8','#90e0ef','#06d6a0','#ef476f','#ffd166','#118ab2','#073b4c']; return n<=base.length?base.slice(0,n):Array.from({length:n},(_,i)=>base[i%base.length]);}
function renderWorkChart(){if(!workChartCanvas) return; const ctx=workChartCanvas.getContext('2d'); const data=workHours.map(v=>Number(v.toFixed(2))); if(workChart) workChart.destroy(); workChart=new Chart(ctx,{type:'bar',data:{labels:days,datasets:[{label:'Work Hours',data,backgroundColor:'#00b4d8'}]}, options:{responsive:true,plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}});}
function renderExpensePie(){if(!expensePieCanvas) return; const ctx=expensePieCanvas.getContext('2d'); if(!expenses.length){if(expensePieChart) expensePieChart.destroy(); expensePieChart=new Chart(ctx,{type:'pie',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['#223344']}]},options:{responsive:true}}); return;} const byCat={}; expenses.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+e.amount); const labels=Object.keys(byCat); const data=labels.map(l=>byCat[l]); const palette=generatePalette(labels.length); if(expensePieChart) expensePieChart.destroy(); expensePieChart=new Chart(ctx,{type:'pie',data:{labels,datasets:[{data,backgroundColor:palette}]},options:{responsive:true}});}

// ---------- Weekly Summary ----------
function updateWeekSummary(){
  const totalExpense=expenses.reduce((s,e)=>s+e.amount,0);
  const totalHours=workHours.reduce((s,h)=>s+h,0);
  const avgHours=totalHours/7;
  const maxHours=Math.max(...workHours);
  const bestDay=maxHours>0?days[workHours.indexOf(maxHours)]:'-';
  if(weekSummary) weekSummary.innerHTML=`
    <p>💰 <strong>Total Expense:</strong> ${currency(totalExpense)}</p>
    <p>⏱️ <strong>Avg Hours:</strong> ${avgHours.toFixed(2)}h</p>
    <p>🏆 <strong>Best Day:</strong> ${bestDay}</p>
  `;
  sessionCount&&(sessionCount.textContent=`Pomodoros Completed: ${completedPomodoros}`);
}

// App Name
const APP_NAME = "Dev Productivity Tracker";

// ---------- PDF Export ----------
if (downloadPDFBtn) {
  downloadPDFBtn.addEventListener('click', () => {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('jsPDF not loaded'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Header with App Name
    doc.setFontSize(18);
    doc.setTextColor(0, 60, 120);
    doc.text(`${APP_NAME} - Weekly Report`, 40, 40);

    let y = 70;

    // Summary
    const totalExpense = expenses.reduce((s,e)=>s+e.amount,0);
    const totalHours = workHours.reduce((s,h)=>s+h,0);
    const avgHours = (totalHours/7).toFixed(2);

    doc.setFontSize(12);
    doc.setTextColor(20,20,20);
    doc.text(`Total Weekly Expense: ${currency(totalExpense)}`, 40, y); y+=16;
    doc.text(`Average Daily Hours: ${avgHours} h`, 40, y); y+=16;
    doc.text(`Daily Goal: ${dailyGoal} h`, 40, y); y+=20;

    // ---------- Work Hours Table ----------
    const workBody = days.map((d,i)=>[d, workHours[i].toFixed(2)]);
    doc.autoTable({
      startY: y,
      head: [['Day','Work Hours']],
      body: workBody,
      theme: 'grid',
      headStyles: { fillColor: [0,180,200], textColor: 255 }
    });
    y = doc.lastAutoTable.finalY + 20;

    // ---------- Expenses Table ----------
    const expenseBody = expenses.length ? expenses.map(e=>{
      const day = days[new Date(e.date).getDay()];
      const time = new Date(e.date).toLocaleTimeString();
      return [day, e.category, currency(e.amount), new Date(e.date).toLocaleDateString(), time];
    }) : [['-','-','-','-','-']];

    doc.autoTable({
      startY: y,
      head: [['Day','Category','Amount','Date','Time']],
      body: expenseBody,
      theme: 'grid',
      headStyles: { fillColor: [0,119,182], textColor: 255 }
    });
    y = doc.lastAutoTable.finalY + 20;

    // ---------- Notes Table ----------
    const notesBody = notes.length ? notes.map(n=>{
      const day = days[new Date(n.timestampISO).getDay()];
      const time = new Date(n.timestampISO).toLocaleTimeString();
      return [day, n.category, n.text, new Date(n.timestampISO).toLocaleDateString(), time];
    }) : [['-','-','-','-','-']];

    doc.autoTable({
      startY: y,
      head: [['Day','Category','Note','Date','Time']],
      body: notesBody,
      theme: 'grid',
      headStyles: { fillColor: [0,100,200], textColor: 255 }
    });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated by ${APP_NAME}`, 40, doc.internal.pageSize.height - 20);

    doc.save('Weekly_Report.pdf');
  });
}

// ---------- CSV Export ----------
if (downloadCSVBtn) {
  downloadCSVBtn.addEventListener('click', () => {
    let csv = '';

    // App Name at top
    csv += `${APP_NAME} - Weekly Report\n\n`;

    // Work Hours
    csv += '--- Work Hours ---\n';
    csv += 'Day,Work Hours\n';
    days.forEach((d,i)=>{ csv += `${d},${workHours[i].toFixed(2)}\n`; });
    csv += '\n';

    // Expenses
    csv += '--- Expenses ---\n';
    csv += 'Day,Category,Amount,Date,Time\n';
    expenses.forEach(e=>{
      const day = days[new Date(e.date).getDay()];
      const time = new Date(e.date).toLocaleTimeString();
      csv += `${day},${e.category},${e.amount.toFixed(2)},${new Date(e.date).toLocaleDateString()},${time}\n`;
    });
    if(!expenses.length) csv += '-,-,-,-,-\n';
    csv += '\n';

    // Notes
    csv += '--- Notes ---\n';
    csv += 'Day,Category,Note,Date,Time\n';
    notes.forEach(n=>{
      const day = days[new Date(n.timestampISO).getDay()];
      const time = new Date(n.timestampISO).toLocaleTimeString();
      csv += `${day},${n.category},"${n.text.replace(/"/g,'""')}",${new Date(n.timestampISO).toLocaleDateString()},${time}\n`;
    });
    if(!notes.length) csv += '-,-,-,-,-\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Weekly_Report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

// ---------- Event wiring ----------
addExpenseBtn?.addEventListener('click',addExpense);
filterCategory?.addEventListener('change',()=>renderExpenses(filterCategory.value));
clearExpensesBtn?.addEventListener('click',clearExpenses);
setTimerBtn?.addEventListener('click',setCustomTimer);
startTimerBtn?.addEventListener('click',startTimer);
pauseTimerBtn?.addEventListener('click',pauseTimer);
resetTimerBtn?.addEventListener('click',resetTimer);
setDailyGoalBtn?.addEventListener('click',setDailyGoal);
saveNoteBtn?.addEventListener('click',saveNote);

// ---------- Boot ----------
function boot(){
  timerMinutes=timerMinutesStart=25;
  timerSeconds=timerSecondsStart=0;
  updateTimerUI();
  renderExpenses();
  renderNotes();
  renderWorkChart();
  renderExpensePie();
  updateDailyGoalUI();
  updateWeekSummary();
}
boot();
