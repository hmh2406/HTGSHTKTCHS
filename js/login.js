function goTo(id){
  document.querySelectorAll('.screen').forEach(a=>a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({top:0, behavior:'auto'});
}
const SESSION_KEY = 'edutrack_session';

function saveSession(role, user){
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, user }));
}

function loadSession(){
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session?.role && session?.user ? session : null;
  } catch (_error) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function showAuthNotice(message){
  let notice = document.getElementById('auth-notice');
  if(!notice){
    notice = document.createElement('div');
    notice.id = 'auth-notice';
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:100;color:#fff;background:#1F7A5C;padding:12px 16px;border-radius:10px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.16);';
    document.body.appendChild(notice);
  }
  notice.textContent = message;
  notice.classList.remove('hidden');
  clearTimeout(showAuthNotice.timer);
  showAuthNotice.timer = setTimeout(() => notice.classList.add('hidden'), 2600);
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

async function submitAuth(role){
  try{
    const payload = { role };
    if(role==='teacher'){
      payload.email = document.getElementById('teacher-email').value.trim();
      payload.password = document.getElementById('teacher-password').value;
      if(!payload.email || !payload.password){ alert('Vui lòng nhập email và mật khẩu'); return; }
    } else {
      payload.email = document.getElementById('student-username').value.trim();
      payload.password = document.getElementById('student-password').value;
      payload.classCode = document.getElementById('student-class-code').value.trim();
      if(!payload.email || !payload.password || !payload.classCode){ alert('Vui lòng nhập tên đăng nhập, mật khẩu và mã lớp'); return; }
    }

    const response = await fetch('/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if(!response.ok){ alert(result.error || 'Đăng nhập không thành công'); return; }
    saveSession(role, result.user);
    if(role === 'teacher'){
      sessionStorage.setItem('edutrack_login_notice', 'Đăng nhập thành công. Chào mừng bạn trở lại!');
      location.replace('gv.html');
      return;
    }
    
    sessionStorage.setItem('edutrack_login_notice', 'Đăng nhập thành công. Chào mừng bạn trở lại!');
    location.replace('trangchu.html');
    return;
  } catch(err){
    console.error(err);
    alert('Lỗi mạng, vui lòng thử lại');
  }
}

function applyUserSession(role, user){
  goTo(role);
  document.getElementById('app-topnav').classList.remove('hidden');
  document.getElementById('teacher-section-nav').classList.toggle('hidden', role!=='teacher');
  document.getElementById('student-section-nav').classList.toggle('hidden', role!=='student');
  const who = document.getElementById('whoami');
  if(role==='teacher'){
    who.innerHTML = `<div class="avatar">${user.name.slice(0,1).toUpperCase()}</div><div class="who"><b>${user.name}</b><small>Giáo viên</small></div>`;
    const title = document.getElementById('teacher-home-title');
    if(title) title.textContent = `Chào ${user.name} 👋`;
  } else {
    who.innerHTML = `<div class="avatar">${user.name.slice(0,1).toUpperCase()}</div><div class="who"><b>${user.name}</b><small>Học sinh</small></div>`;
    setTimeout(drawHomeChart, 50);
  }
}

function logout(){
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('app-topnav').classList.add('hidden');
  location.href='index.html';
}

window.addEventListener('DOMContentLoaded', () => {
  const session = loadSession();
  if(session) applyUserSession(session.role, session.user);
});

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