function goTo(id){
  document.querySelectorAll('.screen').forEach(a=>a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({top:0, behavior:'instant'});
}
function setRoleTab(role){
  document.getElementById('role-tab-teacher').classList.toggle('active', role==='teacher');
  document.getElementById('role-tab-student').classList.toggle('active', role==='student');
  document.getElementById('teacher-login-form').classList.toggle('hidden', role!=='teacher');
  document.getElementById('student-login-form').classList.toggle('hidden', role!=='student');
}
(function(){
  const params = new URLSearchParams(location.search);
  setRoleTab(params.get('role')==='student' ? 'student' : 'teacher');
})();
function loginAs(role){
  goTo(role);
  document.getElementById('app-topnav').classList.remove('hidden');
  document.getElementById('teacher-section-nav').classList.toggle('hidden', role!=='teacher');
  document.getElementById('student-section-nav').classList.toggle('hidden', role!=='student');
  const who = document.getElementById('whoami');
  who.innerHTML = role==='teacher'
    ? '<div class="avatar">LA</div><div class="who"><b>Cô Lan Anh</b><small>Giáo viên Toán</small></div>'
    : '<div class="avatar">MN</div><div class="who"><b>Minh Nhật</b><small>Lớp 8A2</small></div>';
  if(role==='student'){ setTimeout(drawHomeChart, 50); }
}
function logout(){
  document.getElementById('app-topnav').classList.add('hidden');
  location.href='/';
}

function setTeacherView(id, btn){
  document.querySelectorAll('.tview').forEach(v=>v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('#teacher-section-nav .nav-item').forEach(n=>n.classList.remove('active'));
  btn.classList.add('active');
}
function setStudentView(id, btn){
  document.querySelectorAll('.sview').forEach(v=>v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('#student-section-nav .nav-item').forEach(n=>n.classList.remove('active'));
  btn.classList.add('active');
}
function toggle(id){ document.getElementById(id).classList.toggle('hidden'); }
function setAddTab(which, btn){
  document.querySelectorAll('#add-student-panel .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('add-csv').classList.toggle('hidden', which!=='csv');
  document.getElementById('add-manual').classList.toggle('hidden', which!=='manual');
}
function selectClass(name){
  document.querySelectorAll('.class-chip').forEach(c=>c.classList.toggle('active', c.dataset.class===name));
  document.getElementById('students-class-label').textContent = name;
  document.getElementById('student-detail-panel').classList.add('hidden');
}
function openStudentDetail(name, initials){
  document.getElementById('student-detail-panel').classList.remove('hidden');
  document.getElementById('sd-name').textContent = name;
  document.getElementById('sd-avatar').textContent = initials;
  document.getElementById('student-detail-panel').scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(drawProgressChart, 60);
}
function setExamType(type, btn){
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('mcq-questions').classList.toggle('hidden', type!=='mcq');
  document.getElementById('essay-questions').classList.toggle('hidden', type!=='essay');
}
function exportExam(){
  document.getElementById('exam-exported').classList.remove('hidden');
}

let progressChartInst=null, homeChartInst=null;
function drawProgressChart(){
  const ctx = document.getElementById('progressChart');
  if(!ctx) return;
  if(progressChartInst) progressChartInst.destroy();
  progressChartInst = new Chart(ctx, {
    type:'line',
    data:{ labels:['Đầu năm','Chương 1','Chương 2','Chương 3','Hiện tại'],
      datasets:[{ label:'Điểm', data:[6.9,7.2,7.5,7.8,8.5], borderColor:'#B23328',
        backgroundColor:'rgba(178,51,40,0.08)', fill:true, tension:.35,
        pointBackgroundColor:'#B23328', pointRadius:4 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ min:0, max:10, ticks:{stepSize:2} } } }
  });
}
function drawHomeChart(){
  const ctx = document.getElementById('studentHomeChart');
  if(!ctx || homeChartInst) return;
  homeChartInst = new Chart(ctx, {
    type:'line',
    data:{ labels:['T2','T3','T4','T5','T6'],
      datasets:[{ label:'Tiến độ', data:[40,48,55,60,64], borderColor:'#1F7A5C',
        backgroundColor:'rgba(31,122,92,0.08)', fill:true, tension:.35,
        pointBackgroundColor:'#1F7A5C', pointRadius:4 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ min:0, max:100, ticks:{stepSize:25} } } }
  });
}
