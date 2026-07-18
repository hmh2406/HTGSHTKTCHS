function genCode(){
  const letters='ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s='';
  for(let i=0;i<3;i++) s+=letters[Math.floor(Math.random()*letters.length)];
  s+='-'+Math.floor(1000+Math.random()*9000);
  return s;
}

const TOPICS = ['Phân số','Số thập phân','Hình học','Phương trình','Đại lượng tỉ lệ','Giải toán có lời văn'];

function mkStudent(name, dob){
  const scores = [];
  for(let i=0;i<5;i++){
    scores.push({
      test:'Bài kiểm tra '+(i+1),
      score:+(4+Math.random()*6).toFixed(1),
      date:`${10+i}/0${Math.min(6,i+1)}/2026`,
      duration:(20+Math.floor(Math.random()*20))+' phút'
    });
  }
  const lessons = [
    {name:'Ôn tập '+TOPICS[Math.floor(Math.random()*TOPICS.length)], status:'Đã hoàn thành'},
    {name:'Luyện tập '+TOPICS[Math.floor(Math.random()*TOPICS.length)], status:'Đang thực hiện'},
    {name:'Bài tập về nhà tuần 6', status:'Chưa bắt đầu'},
  ];
  return {
    id:'hs_'+Math.random().toString(36).slice(2,9),
    name, dob,
    note:'',
    scores, lessons,
    progress: scores.map(s=>s.score)
  };
}

function mkClass(name, studentNames){
  return {
    id:'lop_'+Math.random().toString(36).slice(2,9),
    name,
    code: genCode(),
    createdAt:'12/07/2026',
    students: studentNames.map(mkStudent),
    gaps: TOPICS.map(t=>({topic:t, percent: Math.floor(15+Math.random()*70)}))
  };
}

const SESSION_KEY = 'edutrack_teacher_session';
const API_SESSION_KEY = 'edutrack_session';

function saveSession(data){
  try{ localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }catch(e){}
}
function loadSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function clearSession(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
}

const savedSession = loadSession();
let apiSession = null;
try {
  const candidate = JSON.parse(localStorage.getItem(API_SESSION_KEY));
  if(candidate?.role === 'teacher' && candidate?.user) apiSession = candidate;
} catch (_error) {}

let state = {
  screen:'app', // 'app' | 'auth'
  auth:{ mode:'login', form:{email:'', password:'', name:''} },
  loggedIn: !!apiSession || !!(savedSession && savedSession.loggedIn),
  teacherName: (apiSession && apiSession.user.name) || (savedSession && savedSession.teacherName) || 'Giáo viên',
  teacherDob: (savedSession && savedSession.teacherDob) || '',
  profileMenuOpen:false,
  accountSettings:{ open:false, error:'' },
  tab:'home',
  libTab:'videos',
  classesSubTab:'manage',
  selectedClassId:null,
  selectedStudentId:null,
  wizard:{ step:1, name:'', count:3, students:['','',''], code:null },
  classes:[
    mkClass('Toán 6A - Chiều thứ 3/5', ['Nguyễn Minh An','Trần Bảo Châu','Lê Gia Hân','Phạm Đức Huy','Vũ Thảo My']),
    mkClass('Toán 7B - Sáng thứ 7', ['Đỗ Quang Khải','Hoàng Yến Nhi','Bùi Anh Tuấn'])
  ],
  studentMeta:{}, 
  library:{
    videos:[
      {name:'Bài 4: Phân số bằng nhau', meta:'18 phút · Toán 6'},
      {name:'Chuyên đề phương trình bậc nhất', meta:'32 phút · Toán 7'},
    ],
    docs:[
      {name:'Giáo án tuần 6 - Hình học', meta:'PDF · 1.2MB'},
      {name:'Phiếu bài tập - Đại lượng tỉ lệ', meta:'DOCX · 340KB'},
    ],
    exams:[
      {name:'Đề kiểm tra giữa kỳ - Toán 6', meta:'PDF · 15 câu'},
      {name:'Đề luyện thi - Toán 7', meta:'PDF · 20 câu'},
    ]
  },
  toast:null,
  confirmDelete:null,
  filePreview:null,
  studentImport:{ open:false, mode:'manual', csvRows:[], csvFileName:null },
  uploadModal:{ open:false, type:'videos' }
};
state.classes.forEach(c => c.students.forEach(s => { s.classId = c.id; }));

let charts = {};

function showToast(msg){
  state.toast = msg;
  render();
  setTimeout(()=>{ state.toast=null; render(); }, 2200);
}

/* =========================================================
   RENDER: AUTH
========================================================= */
function openAuth(mode){
  state.auth.mode = mode;
  state.screen='auth';
  render();
}

function renderAuth(){
  const m = state.auth.mode;
  return `
  <div class="auth-wrap">
    <div>
      <button class="auth-back" onclick="backToApp()">← Quay lại</button>
      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-mark">E</div>
          <div class="auth-brand-name">EduTrack</div>
        </div>
        <div class="tabbtns">
          <button class="${m==='login'?'active':''}" onclick="setAuthMode('login')">Đăng nhập</button>
          <button class="${m==='register'?'active':''}" onclick="setAuthMode('register')">Đăng ký</button>
        </div>
        ${m==='register' ? `
        <div class="field">
          <label>Họ và tên giáo viên</label>
          <input id="auth-name" placeholder="Nguyễn Văn A" value="${state.auth.form.name}">
        </div>` : ``}
        <div class="field">
          <label>Email</label>
          <input id="auth-email" placeholder="lananh@truong.edu.vn" value="${state.auth.form.email}">
        </div>
        <div class="field">
          <label>Mật khẩu</label>
          <input id="auth-password" type="password" placeholder="••••••••">
        </div>
        <button class="btn btn-accent btn-block" onclick="submitAuth()">${m==='login'?'Đăng nhập →':'Tạo tài khoản →'}</button>
        <div class="auth-foot">${m==='login' ? `Chưa có tài khoản? <strong onclick="setAuthMode('register')" style="cursor:pointer;">Đăng ký ngay</strong>` : `Đã có tài khoản? <strong onclick="setAuthMode('login')" style="cursor:pointer;">Đăng nhập</strong>`}</div>
      </div>
    </div>
  </div>`;
}

function backToApp(){ state.screen='app'; render(); }

function setAuthMode(m){ state.auth.mode=m; render(); }

function submitAuth(){
  const email = document.getElementById('auth-email').value.trim();
  const name = state.auth.mode==='register' ? document.getElementById('auth-name').value.trim() : '';
  state.teacherName = name || (email ? email.split('@')[0] : 'Giáo viên');
  state.loggedIn = true;
  state.screen='app';
  state.tab='home';
  saveSession({ loggedIn:true, teacherName:state.teacherName, teacherDob:state.teacherDob, email });
  showToast('Đăng nhập thành công');
}

function logout(){
  clearSession();
  try{ localStorage.removeItem(API_SESSION_KEY); }catch(e){}
  location.replace('login.html?role=teacher');
}

function toggleProfileMenu(){ state.profileMenuOpen = !state.profileMenuOpen; render(); }

function openAccountSettings(){
  state.profileMenuOpen = false;
  state.accountSettings = { open:true, error:'' };
  render();
}

function closeAccountSettings(){ state.accountSettings = { open:false, error:'' }; render(); }

function renderAccountSettingsModal(){
  const err = state.accountSettings.error;
  return `
  <div class="modal-backdrop" onclick="if(event.target===this) closeAccountSettings()">
    <div class="modal" style="max-width:440px;">
      <h3>Cài đặt tài khoản</h3>
      <p>Cập nhật thông tin cá nhân và mật khẩu đăng nhập của bạn.</p>
      <div class="field">
        <label>Họ và tên</label>
        <input id="acc-name" placeholder="Nguyễn Văn A" value="${state.teacherName}">
      </div>
      <div class="field">
        <label>Ngày sinh</label>
        <input id="acc-dob" type="date" value="${state.teacherDob||''}">
      </div>
      <div class="field">
        <label>Mật khẩu mới</label>
        <input id="acc-password" type="password" placeholder="Để trống nếu không đổi mật khẩu">
      </div>
      <div class="field">
        <label>Nhập lại mật khẩu</label>
        <input id="acc-password2" type="password" placeholder="Nhập lại mật khẩu mới">
      </div>
      ${err ? `<div style="color:var(--coral); font-size:12.5px; font-weight:700; margin:-6px 0 14px;">${err}</div>` : ''}
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeAccountSettings()">Hủy</button>
        <button class="btn btn-accent" onclick="saveAccountSettings()">Lưu tài khoản</button>
      </div>
    </div>
  </div>`;
}

function saveAccountSettings(){
  const name = document.getElementById('acc-name').value.trim();
  const dob = document.getElementById('acc-dob').value;
  const pass = document.getElementById('acc-password').value;
  const pass2 = document.getElementById('acc-password2').value;

  if(!name){
    state.accountSettings.error = 'Vui lòng nhập họ và tên.';
    render(); return;
  }
  if(pass || pass2){
    if(pass.length < 6){
      state.accountSettings.error = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      render(); return;
    }
    if(pass !== pass2){
      state.accountSettings.error = 'Mật khẩu nhập lại không khớp.';
      render(); return;
    }
  }

  state.teacherName = name;
  state.teacherDob = dob;
  state.accountSettings = { open:false, error:'' };
  if(state.loggedIn){
    const existing = loadSession() || {};
    saveSession({ ...existing, loggedIn:true, teacherName:name, teacherDob:dob });
  }
  showToast('Đã lưu thông tin tài khoản');
}

/* =========================================================
   RENDER: SHELL
========================================================= */
function initials(name){
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length-1]||'G').slice(0,1).toUpperCase();
}

function renderShell(){
  return `
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand" onclick="setTab('home')" style="cursor:pointer;">
          <div class="brand-mark">E</div>
          <div class="brand-name">EduTrack</div>
        </div>
        <nav class="topbar-nav">
          <button class="nav-item ${state.tab==='home'?'active':''}" onclick="setTab('home')"><span class="nav-ico">🏠</span><span class="nav-label">Trang chủ</span></button>
          <button class="nav-item ${state.tab==='classes'?'active':''}" onclick="setTab('classes')"><span class="nav-ico">📚</span><span class="nav-label">Quản lý lớp học</span></button>
          <button class="nav-item ${state.tab==='students'?'active':''}" onclick="setTab('students')"><span class="nav-ico">🧑‍🎓</span><span class="nav-label">Quản lý học sinh</span></button>
          <button class="nav-item ${state.tab==='library'?'active':''}" onclick="setTab('library')"><span class="nav-ico">🗂️</span><span class="nav-label">Kho tài liệu</span></button>
        </nav>
        <div class="topbar-right">
          ${state.loggedIn ? `
            <div class="profile-wrap">
              ${state.profileMenuOpen ? `<div class="profile-overlay" onclick="toggleProfileMenu()"></div>` : ''}
              <button class="teacher-chip" onclick="toggleProfileMenu()">
                <div class="avatar">${initials(state.teacherName)}</div>
                <div class="teacher-name">${state.teacherName}</div>
              </button>
              ${state.profileMenuOpen ? `
              <div class="profile-dropdown">
                <button class="pd-item" onclick="openAccountSettings()">
                  <span class="pd-ico">⚙️</span>
                  <span class="pd-text">
                    <span class="pd-title">Cài đặt tài khoản</span>
                    <span class="pd-sub">Cập nhật thông tin cá nhân & mật khẩu</span>
                  </span>
                </button>
                <div class="pd-sep"></div>
                <button class="pd-item" onclick="logout()">
                  <span class="pd-ico">🚪</span>
                  <span class="pd-text">
                    <span class="pd-title">Đăng xuất</span>
                  </span>
                </button>
              </div>` : ''}
            </div>
          ` : `
            <button class="auth-link-btn" onclick="openAuth('login')">Đăng nhập</button>
            <button class="auth-link-btn filled" onclick="openAuth('register')">Đăng ký</button>
          `}
        </div>
      </div>
    </header>
    <main class="main" id="main">${renderMain()}</main>
    <nav class="bottom-nav">
      <button class="bottom-nav-item ${state.tab==='home'?'active':''}" onclick="setTab('home')"><span class="bn-ico">🏠</span>Trang chủ</button>
      <button class="bottom-nav-item ${state.tab==='classes'?'active':''}" onclick="setTab('classes')"><span class="bn-ico">📚</span>Quản lý lớp học</button>
      <button class="bottom-nav-item ${state.tab==='students'?'active':''}" onclick="setTab('students')"><span class="bn-ico">🧑‍🎓</span>Học sinh</button>
      <button class="bottom-nav-item ${state.tab==='library'?'active':''}" onclick="setTab('library')"><span class="bn-ico">🗂️</span>Tài liệu</button>
    </nav>
  </div>
  ${state.confirmDelete ? renderConfirmModal() : ''}
  ${state.filePreview ? renderFilePreviewModal() : ''}
  ${state.studentImport.open ? renderStudentImportModal() : ''}
  ${state.accountSettings.open ? renderAccountSettingsModal() : ''}
  ${state.uploadModal && state.uploadModal.open ? renderUploadModal() : ''}
  ${state.toast ? `<div class="toast">✓ ${state.toast}</div>` : ''}
  `;
}

function setTab(t){ state.tab=t; state.selectedClassId=null; state.selectedStudentId=null; render(); }

function renderMain(){
  if(state.tab==='home') return renderHomeTab();
  if(state.tab==='classes') return renderClassesTab();
  if(state.tab==='students') return renderStudentsTab();
  if(state.tab==='library') return renderLibraryTab();
  return '';
}

/* =========================================================
   TAB: TRANG CHỦ
========================================================= */
function greetingByHour(){
  const h = new Date().getHours();
  if(h < 11) return 'Chào buổi sáng';
  if(h < 13) return 'Chào buổi trưa';
  if(h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function renderHomeTab(){
  const totalClasses = state.classes.length;
  const totalStudents = state.classes.reduce((a,c)=>a+c.students.length, 0);
  const totalDocs = state.library.videos.length + state.library.docs.length + state.library.exams.length;
  return `
  <div class="home-hero">
    <div class="home-hero-greeting">${greetingByHour()}, ${state.teacherName} 👋</div>
    <div class="home-hero-sub">Đây là trang chủ EduTrack — chọn một mục bên dưới để bắt đầu, hoặc bấm logo EduTrack ở góc trên để quay lại đây bất cứ lúc nào.</div>
  </div>

  <div class="stat-row">
    <div class="stat"><div class="stat-num">${totalClasses}</div><div class="stat-label">Quản lý lớp học</div></div>
    <div class="stat"><div class="stat-num">${totalStudents}</div><div class="stat-label">Học sinh</div></div>
    <div class="stat"><div class="stat-num">${totalDocs}</div><div class="stat-label">Tài liệu trong kho</div></div>
  </div>

  <div class="home-feature-grid">
    <button class="home-feature-card" onclick="setTab('classes')">
      <div class="home-feature-ico">📚</div>
      <div class="home-feature-name">Quản lý lớp học</div>
      <div class="home-feature-desc">Tạo lớp mới, quản lý danh sách lớp, xem biểu đồ lỗ hổng kiến thức và tiến bộ từng học sinh.</div>
      <div class="home-feature-cta">Vào Lớp học →</div>
    </button>
    <button class="home-feature-card" onclick="setTab('students')">
      <div class="home-feature-ico">🧑‍🎓</div>
      <div class="home-feature-name">Quản lý học sinh</div>
      <div class="home-feature-desc">Xem thông tin học sinh, thêm học sinh thủ công hoặc bằng file CSV, ghi chú và hỗ trợ qua Zalo.</div>
      <div class="home-feature-cta">Vào Học sinh →</div>
    </button>
    <button class="home-feature-card" onclick="setTab('library')">
      <div class="home-feature-ico">🗂️</div>
      <div class="home-feature-name">Kho tài liệu</div>
      <div class="home-feature-desc">Video bài giảng, tài liệu dạy học và đề thi — bấm vào để xem trước trực tiếp.</div>
      <div class="home-feature-cta">Vào Kho tài liệu →</div>
    </button>
  </div>

  <div class="card card-pad">
    <div class="section-title">Thao tác nhanh</div>
    <div class="section-sub">Các việc giáo viên hay làm nhất.</div>
    <div class="home-quick-actions">
      <button class="btn btn-ghost" onclick="setTab('classes'); setClassesSubTab('add');">+ Thêm lớp học</button>
      <button class="btn btn-ghost" onclick="setTab('students'); openStudentImport();">+ Thêm học sinh</button>
      <button class="btn btn-ghost" onclick="mockUpload()">⬆ Tải lên tài liệu</button>
    </div>
  </div>
  `;
}

/* =========================================================
   TAB: LỚP HỌC
========================================================= */
function renderClassesTab(){
  if(state.selectedClassId){
    return renderClassDetail();
  }
  return `
  <div class="page-head">
    <div>
      <div class="page-eyebrow">Quản lý lớp lớp học</div>
      <h1 class="page-title">Quản lý lớp học</h1>
      <p class="page-desc">Tạo lớp mới, theo dõi lỗ hổng kiến thức và tiến bộ của từng học sinh.</p>
    </div>
  </div>
  <div class="subtabs">
    <button class="${state.classesSubTab==='manage'?'active':''}" onclick="setClassesSubTab('manage')">Quản lý lớp học</button>
    <button class="${state.classesSubTab==='add'?'active':''}" onclick="setClassesSubTab('add')">+ Thêm lớp học</button>
  </div>
  ${state.classesSubTab==='manage' ? renderManageClasses() : renderAddClassWizard()}
  `;
}

function setClassesSubTab(t){
  state.classesSubTab=t;
  if(t==='add'){ state.wizard = { step:1, name:'', count:3, students:['','',''], code:null }; }
  render();
}

/* ---- Quản lý lớp học (danh sách) ---- */
function renderManageClasses(){
  if(state.classes.length===0){
    return `<div class="card"><div class="empty">
      <div class="empty-ico">📭</div>
      <div class="empty-title">Chưa có lớp học nào</div>
      <div>Bấm "+ Thêm lớp học" ở trên để tạo lớp đầu tiên.</div>
    </div></div>`;
  }
  return `
  <div class="class-grid">
    ${state.classes.map(c => `
      <div class="class-card" onclick="openClass('${c.id}')">
        <div class="class-card-top">
          <div>
            <div class="class-card-name">${c.name}</div>
            <div class="class-card-meta">${c.students.length} học sinh · Tạo ${c.createdAt}</div>
          </div>
          <button class="icon-btn" title="Xóa lớp" onclick="event.stopPropagation(); askDeleteClass('${c.id}')">✕</button>
        </div>
        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <span class="class-code-pill">${c.code}</span>
          <span style="font-size:12px; color:var(--slate); font-weight:700;">Xem lớp →</span>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function openClass(id){ state.selectedClassId=id; state.selectedStudentId=null; render(); setTimeout(drawGapChart, 30); }

function askDeleteClass(id){
  const c = state.classes.find(x=>x.id===id);
  state.confirmDelete = { type:'class', id, label: c.name };
  render();
}

function confirmDeleteNow(){
  const d = state.confirmDelete;
  if(d.type==='class'){
    state.classes = state.classes.filter(c=>c.id!==d.id);
    if(state.selectedClassId===d.id) state.selectedClassId=null;
    showToast('Đã xóa lớp học');
  }
  state.confirmDelete=null;
  render();
}
function cancelDelete(){ state.confirmDelete=null; render(); }

function renderConfirmModal(){
  const d = state.confirmDelete;
  return `
  <div class="modal-backdrop" onclick="if(event.target===this) cancelDelete()">
    <div class="modal">
      <h3>Xóa lớp học?</h3>
      <p>Bạn có chắc muốn xóa <strong>${d.label}</strong>? Toàn bộ dữ liệu học sinh trong lớp sẽ bị xóa khỏi lớp này. Thao tác không thể hoàn tác.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="cancelDelete()">Hủy</button>
        <button class="btn" style="background:var(--coral); color:#fff;" onclick="confirmDeleteNow()">Xóa lớp</button>
      </div>
    </div>
  </div>`;
}

function renderAddClassWizard(){
  const w = state.wizard;
  const steps = ['Tên lớp','Số lượng HS','Thêm học sinh','Xác nhận'];
  if(w.step===5){
    return `
    <div class="card card-pad">
      <div class="section-title">🎉 Lớp học đã được tạo!</div>
      <div class="section-sub">Gửi mã lớp bên dưới cho học sinh để các em tham gia lớp học.</div>
      <div class="ticket">
        <div class="ticket-main">
          <div class="ticket-eyebrow">Mã lớp học</div>
          <div class="ticket-code">${w.code}</div>
          <div class="ticket-name">${w.name}</div>
        </div>
        <div class="ticket-stub">🎫<br>VÉ<br>LỚP</div>
      </div>
      <div style="display:flex; gap:10px; margin-top:18px;">
        <button class="btn btn-ghost" onclick="copyCode('${w.code}')">📋 Sao chép mã lớp</button>
        <button class="btn btn-accent" onclick="goToCreateTest('${w.createdClassId}')">📝 Tạo bài kiểm tra</button>
        <button class="btn btn-primary" onclick="finishWizard()">Xong, về danh sách lớp</button>
      </div>
    </div>`;
  }
  return `
  <div class="card card-pad">
    <div class="stepper">
      ${steps.map((label,i)=>{
        const n=i+1;
        const cls = w.step>n ? 'done' : (w.step===n ? 'current':'');
        return `<div class="step ${cls}"><div class="step-num">${w.step>n?'✓':n}</div><div class="step-label">${label}</div></div>`;
      }).join('')}
    </div>
    ${w.step===1 ? renderWizardStep1() : ''}
    ${w.step===2 ? renderWizardStep2() : ''}
    ${w.step===3 ? renderWizardStep3() : ''}
    ${w.step===4 ? renderWizardStep4() : ''}
  </div>`;
}

function renderWizardStep1(){
  return `
  <div style="max-width:420px;">
    <div class="section-title">Tên lớp học</div>
    <div class="section-sub">Đặt tên dễ nhận biết, ví dụ theo môn học và buổi học.</div>
    <div class="field">
      <label>Tên lớp</label>
      <input id="w-name" placeholder="VD: Toán 6A - Chiều thứ 3/5" value="${state.wizard.name}">
    </div>
    <button class="btn btn-primary" onclick="wizardNext1()">Tiếp tục →</button>
  </div>`;
}
function wizardNext1(){
  const v = document.getElementById('w-name').value.trim();
  if(!v){ showToast('Vui lòng nhập tên lớp'); return; }
  state.wizard.name=v; state.wizard.step=2; render();
}

function renderWizardStep2(){
  return `
  <div style="max-width:420px;">
    <div class="section-title">Số lượng học sinh</div>
    <div class="section-sub">Nhập sĩ số dự kiến của lớp "${state.wizard.name}".</div>
    <div class="field">
      <label>Số lượng học sinh</label>
      <input id="w-count" type="number" min="1" max="60" value="${state.wizard.count}">
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-ghost" onclick="wizardBack()">← Quay lại</button>
      <button class="btn btn-primary" onclick="wizardNext2()">Tiếp tục →</button>
    </div>
  </div>`;
}
function wizardBack(){ state.wizard.step -= 1; render(); }
function wizardNext2(){
  let n = parseInt(document.getElementById('w-count').value,10);
  if(!n || n<1){ showToast('Số lượng học sinh không hợp lệ'); return; }
  n = Math.min(n,60);
  const cur = state.wizard.students;
  const arr = [];
  for(let i=0;i<n;i++) arr.push(cur[i]||'');
  state.wizard.count=n; state.wizard.students=arr; state.wizard.step=3; render();
}

function renderWizardStep3(){
  return `
  <div style="max-width:480px;">
    <div class="section-title">Thêm học sinh</div>
    <div class="section-sub">Nhập họ tên cho ${state.wizard.count} học sinh trong lớp.</div>
    <div style="max-height:320px; overflow-y:auto; padding-right:4px; margin-bottom:14px;">
      ${state.wizard.students.map((s,i)=>`
        <div class="stu-row">
          <div class="stu-idx">${i+1}</div>
          <input placeholder="Họ và tên học sinh ${i+1}" value="${s}" oninput="updateWizardStudent(${i}, this.value)">
          <div></div>
        </div>
      `).join('')}
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-ghost" onclick="wizardBack()">← Quay lại</button>
      <button class="btn btn-primary" onclick="wizardNext3()">Tiếp tục →</button>
    </div>
  </div>`;
}
function updateWizardStudent(i,val){ state.wizard.students[i]=val; }
function wizardNext3(){
  const filled = state.wizard.students.filter(s=>s.trim()!=='');
  if(filled.length===0){ showToast('Vui lòng nhập ít nhất 1 học sinh'); return; }
  state.wizard.step=4; render();
}

function renderWizardStep4(){
  const names = state.wizard.students.filter(s=>s.trim()!=='');
  return `
  <div style="max-width:480px;">
    <div class="section-title">Xác nhận thông tin lớp</div>
    <div class="section-sub">Kiểm tra lại thông tin trước khi tạo lớp.</div>
    <table style="margin-bottom:16px;">
      <tr><td style="color:var(--slate); width:140px;">Tên lớp</td><td style="font-weight:700;">${state.wizard.name}</td></tr>
      <tr><td style="color:var(--slate);">Số học sinh</td><td style="font-weight:700;">${names.length}</td></tr>
      <tr><td style="color:var(--slate); vertical-align:top;">Danh sách</td><td>${names.map(n=>`<div>${n}</div>`).join('')}</td></tr>
    </table>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-ghost" onclick="wizardBack()">← Quay lại</button>
      <button class="btn btn-accent" onclick="wizardConfirmCreate()">✓ Xác nhận & Tạo lớp</button>
    </div>
  </div>`;
}

function wizardConfirmCreate(){
  const names = state.wizard.students.filter(s=>s.trim()!=='');
  const c = mkClass(state.wizard.name, names);
  c.students.forEach(s=>s.classId=c.id);
  state.classes.push(c);
  state.wizard.code = c.code;
  state.wizard.createdClassId = c.id;
  state.wizard.step = 5;
  render();
}

function copyCode(code){ showToast('Đã sao chép mã lớp: '+code); }
function goToCreateTest(classId){
  showToast('Đang mở trình tạo bài kiểm tra…');
  state.classesSubTab='manage';
  state.selectedClassId = classId;
  render();
}
function finishWizard(){
  state.classesSubTab='manage';
  render();
}

/* ---- Chi tiết lớp: danh sách HS + biểu đồ hổng kiến thức ---- */
function renderClassDetail(){
  const c = state.classes.find(x=>x.id===state.selectedClassId);
  if(!c){ state.selectedClassId=null; return renderClassesTab(); }

  if(state.selectedStudentId){
    return renderStudentDetail(c);
  }

  return `
  <div class="breadcrumb">
    <button onclick="backToClassList()">Quản lý lớp học</button>
    <span class="sep">/</span>
    <span class="current">${c.name}</span>
  </div>
  <div class="page-head">
    <div>
      <h1 class="page-title">${c.name}</h1>
      <p class="page-desc">Mã lớp <span class="class-code-pill">${c.code}</span> · ${c.students.length} học sinh</p>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-ghost" onclick="setClassesSubTab('add')">+ Thêm lớp</button>
      <button class="btn btn-danger" onclick="askDeleteClass('${c.id}')">Xóa lớp này</button>
    </div>
  </div>

  <div class="grid-2" style="align-items:start; margin-bottom:18px;">
    <div class="card card-pad">
      <div class="section-title">Biểu đồ lỗ hổng kiến thức</div>
      <div class="section-sub">Tỉ lệ % câu hỏi sai theo từng chủ đề, tính trên toàn lớp.</div>
      <div class="chart-wrap"><canvas id="gapChart"></canvas></div>
    </div>
    <div class="card card-pad">
      <div class="section-title">Tổng quan lớp học</div>
      <div class="section-sub">Số liệu nhanh về hoạt động của lớp.</div>
      <div class="stat-row" style="grid-template-columns:1fr 1fr;">
        <div class="stat"><div class="stat-num">${c.students.length}</div><div class="stat-label">Học sinh</div></div>
        <div class="stat"><div class="stat-num">${avgClassScore(c)}</div><div class="stat-label">Điểm TB gần nhất</div></div>
        <div class="stat"><div class="stat-num">${c.students[0]?c.students[0].lessons.length:0}</div><div class="stat-label">Bài học đã giao</div></div>
        <div class="stat"><div class="stat-num">${weakestTopic(c)}</div><div class="stat-label" style="font-size:10.5px;">Chủ đề yếu nhất</div></div>
      </div>
    </div>
  </div>

  <div class="card card-pad">
    <div class="section-title">Danh sách học sinh</div>
    <div class="section-sub">Bấm vào một học sinh để xem điểm số và tiến bộ chi tiết.</div>
    <table>
      <thead><tr><th>Họ và tên</th><th>Điểm gần nhất</th><th>Bài học đang giao</th><th></th></tr></thead>
      <tbody>
      ${c.students.map(s=>{
        const last = s.scores[s.scores.length-1];
        const tagClass = last.score>=8?'tag-green':(last.score<5?'tag-coral':'tag-navy');
        return `
        <tr class="stu-tr" onclick="openStudent('${s.id}')">
          <td style="font-weight:700;">${s.name}</td>
          <td><span class="tag ${tagClass}">${last.score}/10</span></td>
          <td>${s.lessons.filter(l=>l.status!=='Đã hoàn thành').length} bài đang thực hiện</td>
          <td style="text-align:right; color:var(--slate); font-weight:700;">Xem chi tiết →</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>
  `;
}

function avgClassScore(c){
  const vals = c.students.map(s=>s.scores[s.scores.length-1].score);
  if(!vals.length) return '—';
  return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
}
function weakestTopic(c){
  if(!c.gaps.length) return '—';
  return c.gaps.reduce((a,b)=> a.percent>b.percent?a:b).topic;
}

function backToClassList(){ state.selectedClassId=null; render(); }

function openStudent(id){ state.selectedStudentId=id; render(); setTimeout(drawProgressChart, 30); }
function backToClass(){ state.selectedStudentId=null; render(); setTimeout(drawGapChart, 30); }

/* ---- Chi tiết học sinh ---- */
function renderStudentDetail(c){
  const s = c.students.find(x=>x.id===state.selectedStudentId);
  if(!s){ state.selectedStudentId=null; return renderClassDetail(); }
  return `
  <div class="breadcrumb">
    <button onclick="backToClassList()">Quản lý lớp học</button>
    <span class="sep">/</span>
    <button onclick="backToClass()">${c.name}</button>
    <span class="sep">/</span>
    <span class="current">${s.name}</span>
  </div>
  <div class="page-head">
    <div>
      <h1 class="page-title">${s.name}</h1>
      <p class="page-desc">Học sinh lớp ${c.name}</p>
    </div>
  </div>

  <div class="grid-2" style="align-items:start; margin-bottom:18px;">
    <div class="card card-pad">
      <div class="section-title">Điểm & thời gian kiểm tra</div>
      <div class="section-sub">Lịch sử làm bài kiểm tra gần đây.</div>
      <table>
        <thead><tr><th>Bài kiểm tra</th><th>Điểm</th><th>Ngày</th><th>Thời gian làm</th></tr></thead>
        <tbody>
        ${s.scores.map(sc=>{
          const tagClass = sc.score>=8?'tag-green':(sc.score<5?'tag-coral':'tag-navy');
          return `<tr><td style="font-weight:700;">${sc.test}</td><td><span class="tag ${tagClass}">${sc.score}</span></td><td>${sc.date}</td><td>${sc.duration}</td></tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
    <div class="card card-pad">
      <div class="section-title">Biểu đồ tiến bộ</div>
      <div class="section-sub">Điểm số qua từng bài kiểm tra.</div>
      <div class="chart-wrap"><canvas id="progressChart"></canvas></div>
    </div>
  </div>

  <div class="card card-pad">
    <div class="section-title">Bài học được giao</div>
    <div class="section-sub">Danh sách bài học và trạng thái hoàn thành.</div>
    ${s.lessons.map(l=>{
      const tagClass = l.status==='Đã hoàn thành'?'tag-green':(l.status==='Đang thực hiện'?'tag-navy':'tag-coral');
      return `<div class="lesson-item"><div class="lesson-name">${l.name}</div><span class="tag ${tagClass}">${l.status}</span></div>`;
    }).join('')}
  </div>
  `;
}

/* charts */
function drawGapChart(){
  const canvas = document.getElementById('gapChart');
  if(!canvas) return;
  const c = state.classes.find(x=>x.id===state.selectedClassId);
  if(!c) return;
  if(charts.gap) charts.gap.destroy();
  charts.gap = new Chart(canvas.getContext('2d'), {
    type:'bar',
    data:{
      labels: c.gaps.map(g=>g.topic),
      datasets:[{
        data: c.gaps.map(g=>g.percent),
        backgroundColor: c.gaps.map(g=> g.percent>50 ? '#AC3125' : '#8FA89B'),
        borderRadius:6,
        maxBarThickness:34
      }]
    },
    options:{
      indexAxis:'y',
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(ctx)=>ctx.raw+'% câu sai'}}},
      scales:{ x:{ max:100, grid:{color:'#DAD7C7'}, ticks:{callback:v=>v+'%'} }, y:{grid:{display:false}} }
    }
  });
}

function drawProgressChart(){
  const canvas = document.getElementById('progressChart');
  if(!canvas) return;
  const c = state.classes.find(x=>x.id===state.selectedClassId);
  const s = c && c.students.find(x=>x.id===state.selectedStudentId);
  if(!s) return;
  if(charts.progress) charts.progress.destroy();
  charts.progress = new Chart(canvas.getContext('2d'), {
    type:'line',
    data:{
      labels: s.scores.map((_,i)=>'Bài '+(i+1)),
      datasets:[{
        data: s.progress,
        borderColor:'#2C2C2A',
        backgroundColor:'rgba(172,49,37,0.14)',
        pointBackgroundColor:'#AC3125',
        pointBorderColor:'#2C2C2A',
        borderWidth:2.5,
        tension:.35,
        fill:true
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{ y:{min:0,max:10, grid:{color:'#DAD7C7'}}, x:{grid:{display:false}} }
    }
  });
}

/* =========================================================
   TAB: QUẢN LÝ TÀI KHOẢN HỌC SINH
========================================================= */
function allStudentsFlat(){
  const arr=[];
  state.classes.forEach(c=> c.students.forEach(s=> arr.push({...s, className:c.name})));
  return arr;
}

function renderStudentsTab(){
  const all = allStudentsFlat();
  return `
  <div class="page-head">
    <div>
      <div class="page-eyebrow">Tài khoản</div>
      <h1 class="page-title">Quản lý tài khoản học sinh</h1>
      <p class="page-desc">Xem thông tin, ghi chú riêng và hỗ trợ phụ huynh/học sinh nhanh qua Zalo.</p>
    </div>
    <button class="btn btn-accent" onclick="openStudentImport()">+ Thêm học sinh</button>
  </div>
  <div class="card card-pad">
    ${all.length===0 ? `
      <div class="empty">
        <div class="empty-ico">🧑‍🎓</div>
        <div class="empty-title">Chưa có học sinh nào</div>
        <div>Bấm "+ Thêm học sinh" để nhập thủ công hoặc tải lên file CSV.</div>
      </div>
    ` : `
    <table>
      <thead><tr><th>Họ và tên</th><th>Ngày sinh</th><th>Lớp học</th><th>Ghi chú</th><th>Hỗ trợ</th></tr></thead>
      <tbody>
      ${all.map(s=>`
        <tr>
          <td style="font-weight:700;">${s.name}</td>
          <td>${s.dob}</td>
          <td><span class="tag tag-navy">${s.className}</span></td>
          <td><input class="note-input" placeholder="Thêm ghi chú…" value="${(state.studentMeta[s.id]||s.note||'')}" onchange="updateNote('${s.id}', this.value)"></td>
          <td><button class="zalo-btn" onclick="contactZalo('${s.name}')">💬 Zalo</button></td>
        </tr>
      `).join('')}
      </tbody>
    </table>
    `}
  </div>`;
}

function updateNote(id, val){
  state.studentMeta[id]=val;
  state.classes.forEach(c=> c.students.forEach(s=>{ if(s.id===id) s.note=val; }));
}
function contactZalo(name){ showToast('Đang mở Zalo để hỗ trợ '+name+'…'); }

/* ---- Thêm học sinh: thủ công hoặc từ file CSV ---- */
function openStudentImport(){
  state.studentImport = { open:true, mode:'manual', csvRows:[], csvFileName:null };
  render();
}
function closeStudentImport(){ state.studentImport.open=false; render(); }
function setImportMode(mode){ state.studentImport.mode=mode; render(); }

function renderStudentImportModal(){
  const si = state.studentImport;
  return `
  <div class="modal-backdrop" onclick="if(event.target===this) closeStudentImport()">
    <div class="modal" style="max-width:560px;">
      <h3>+ Thêm học sinh</h3>
      <div class="tabbtns" style="margin-bottom:18px;">
        <button class="${si.mode==='manual'?'active':''}" onclick="setImportMode('manual')">✍️ Nhập thủ công</button>
        <button class="${si.mode==='csv'?'active':''}" onclick="setImportMode('csv')">📄 Nhập từ file CSV</button>
      </div>
      ${si.mode==='manual' ? renderManualImportForm() : renderCsvImportForm()}
    </div>
  </div>`;
}

function renderManualImportForm(){
  const classOptions = state.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  return `
    <div class="field">
      <label>Họ và tên học sinh</label>
      <input id="imp-name" placeholder="Nguyễn Văn A">
    </div>
    <div class="field">
      <label>Ngày sinh</label>
      <input id="imp-dob" placeholder="VD: 12/05/2014">
    </div>
    <div class="field">
      <label>Lớp học</label>
      <select id="imp-class">${classOptions || '<option value="">Chưa có lớp nào — hãy tạo lớp trước</option>'}</select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeStudentImport()">Hủy</button>
      <button class="btn btn-accent" onclick="submitManualAdd()">+ Thêm học sinh</button>
    </div>
  `;
}

function submitManualAdd(){
  const nameEl = document.getElementById('imp-name');
  const dobEl = document.getElementById('imp-dob');
  const classEl = document.getElementById('imp-class');
  const name = nameEl.value.trim();
  const dob = dobEl.value.trim();
  const classId = classEl.value;
  if(!name){ showToast('Vui lòng nhập họ tên học sinh'); return; }
  if(!classId){ showToast('Vui lòng chọn lớp học'); return; }
  const c = state.classes.find(x=>x.id===classId);
  if(!c) return;
  const s = mkStudent(name, dob || '—');
  s.classId = c.id;
  c.students.push(s);
  state.studentImport.open=false;
  showToast('Đã thêm học sinh '+name);
  render();
}

function renderCsvImportForm(){
  const si = state.studentImport;
  return `
    <p style="font-size:12.5px; color:var(--slate); line-height:1.6; margin:0 0 14px; font-family: Georgia, serif;">
      Mỗi dòng trong file gồm: <b>Họ và tên, Ngày sinh, Tên lớp</b><br>
      VD: <span style="font-family:'JetBrains Mono',monospace; font-size:11.5px;">Nguyễn Văn A, 12/05/2014, Toán 6A - Chiều thứ 3/5</span>
    </p>
    <div class="field">
      <label>Chọn file CSV</label>
      <input type="file" accept=".csv,text/csv" onchange="handleCsvFile(this)">
      ${si.csvFileName ? `<div style="font-size:12px; color:var(--slate); margin-top:6px;">Đã tải: <b>${si.csvFileName}</b></div>` : ''}
    </div>
    ${si.csvRows.length ? `
    <div class="section-sub" style="margin-bottom:8px; font-family: Georgia, serif;">Kiểm tra và chọn lớp cho từng dòng trước khi nhập.</div>
    <div style="max-height:220px; overflow-y:auto; border:1px solid var(--line); border-radius:10px; margin-bottom:16px;">
      <table style="font-family: Georgia, serif;">
        <thead><tr><th>Họ tên</th><th>Ngày sinh</th><th>Lớp</th><th></th></tr></thead>
        <tbody>
        ${si.csvRows.map((r,i)=>`
          <tr>
            <td style="font-weight:700;">${r.name}</td>
            <td>${r.dob||'—'}</td>
            <td>
              <select onchange="updateCsvRowClass(${i}, this.value)" style="border:1px solid var(--line); border-radius:6px; padding:5px 6px; font-size:12.5px; width:100%; font-family: Georgia, serif;">
                <option value="">— Chọn lớp —</option>
                ${state.classes.map(c=>`<option value="${c.id}" ${r.classId===c.id?'selected':''}>${c.name}</option>`).join('')}
              </select>
            </td>
            <td><button class="icon-btn" title="Bỏ dòng này" onclick="removeCsvRow(${i})">✕</button></td>
          </tr>
        `).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeStudentImport()">Hủy</button>
      <button class="btn btn-accent" onclick="confirmCsvImport()">Nhập ${si.csvRows.length} học sinh</button>
    </div>
    ` : `
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeStudentImport()">Đóng</button>
    </div>
    `}
  `;
}

function handleCsvFile(inputEl){
  const file = inputEl.files && inputEl.files[0];
  if(!file) return;
  state.studentImport.csvFileName = file.name;
  const reader = new FileReader();
  reader.onload = (e)=>{
    state.studentImport.csvRows = parseStudentCsv(String(e.target.result||''));
    render();
  };
  reader.onerror = ()=> showToast('Không đọc được file CSV');
  reader.readAsText(file, 'utf-8');
}

function parseStudentCsv(text) {
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
  let startIdx = 0;
  if(lines.length && /h[oọ]\s*(và)?\s*t[eê]n|name/i.test(lines[0])) startIdx = 1;
  const rows = [];
  for(let i=startIdx;i<lines.length;i++){
    const cols = lines[i].split(',').map(c=>c.trim().replace(/^"|"$/g,''));
    const name = cols[0] || '';
    if(!name) continue;
    const dob = cols[1] || '';
    const classNameRaw = (cols[2] || '').trim();
    const matched = state.classes.find(c => c.name.toLowerCase() === classNameRaw.toLowerCase());
    rows.push({ name, dob, classId: matched ? matched.id : '' });
  }
  return rows;
}

function updateCsvRowClass(idx, classId){ state.studentImport.csvRows[idx].classId = classId; }
function removeCsvRow(idx){ state.studentImport.csvRows.splice(idx,1); render(); }

function confirmCsvImport(){
  const rows = state.studentImport.csvRows;
  let added=0, skipped=0;
  rows.forEach(r=>{
    const c = state.classes.find(x=>x.id===r.classId);
    if(!r.name || !c){ skipped++; return; }
    const s = mkStudent(r.name, r.dob || '—');
    s.classId = c.id;
    c.students.push(s);
    added++;
  });
  state.studentImport.open=false;
  showToast(`Đã thêm ${added} học sinh${skipped ? ', bỏ qua '+skipped+' dòng chưa chọn lớp' : ''}`);
  render();
}

/* =========================================================
   TAB: KHO TÀI LIỆU
========================================================= */
function renderLibraryTab(){
  if(!state.libTab) state.libTab = 'videos';
  const active = state.libTab;
  const map = {videos:'Video bài giảng', docs:'Tài liệu dạy', exams:'Đề thi'};
  const icoMap = {videos:'🎬', docs:'📄', exams:'📝'};
  const items = state.library[active] || [];
  
  return `
  <div class="page-head">
    <div>
      <div class="page-eyebrow">Kho tài liệu</div>
      <h1 class="page-title">Kho tài liệu giảng dạy</h1>
      <p class="page-desc">Lưu trữ video bài giảng, tài liệu dạy học và đề thi. Bấm vào một tài liệu để xem trước.</p>
    </div>
    <button class="btn btn-accent" onclick="mockUpload()">⬆ Tải lên tài liệu</button>
  </div>
  <div class="lib-tabs">
    ${Object.keys(map).map(k=>`<button class="lib-tab ${active===k?'active':''}" onclick="setLibTab('${k}')">${icoMap[k]} ${map[k]}</button>`).join('')}
  </div>
  <div class="lib-grid">
    ${items.map((it,i)=>`
      <div class="lib-card" onclick="openFilePreview('${active}', ${i})" style="cursor:pointer;">
        <div class="lib-thumb">${icoMap[active]}</div>
        <div class="lib-name">${it.name}</div>
        <div class="lib-meta">${it.meta}</div>
      </div>
    `).join('')}
  </div>
  `;
}

function setLibTab(k){ 
  state.libTab = k; 
  render(); 
}

function mockUpload(){ 
  state.uploadModal = { open: true, type: state.libTab || 'videos', name: '' };
  render();
}

function closeUploadModal(){ 
  state.uploadModal = { open: false }; 
  render(); 
}

function submitUpload(){
  const name = document.getElementById('up-name').value.trim();
  const type = document.getElementById('up-type').value;
  
  if(!name){ 
    showToast('Vui lòng nhập tên tài liệu'); 
    return; 
  }
  
  let meta = 'Mới tải lên';
  if(type === 'videos') meta = '15 phút · Toán';
  else if(type === 'docs') meta = 'PDF · 1.5MB';
  else if(type === 'exams') meta = 'PDF · 20 câu';

  state.library[type].unshift({ name: name, meta: meta });
  
  closeUploadModal();
  showToast('Đã tải lên tài liệu thành công');
  render();
}

function renderUploadModal(){
  if(!state.uploadModal || !state.uploadModal.open) return '';
  return `
  <div class="modal-backdrop" onclick="if(event.target===this) closeUploadModal()">
    <div class="modal" style="max-width:440px;">
      <h3>Tải lên tài liệu mới</h3>
      <p style="font-size:13px; color:var(--slate); margin-bottom:16px;">Tài liệu tải lên sẽ được hiển thị ngay trong kho.</p>
      <div class="field">
        <label>Phân loại</label>
        <select id="up-type">
          <option value="videos" ${state.uploadModal.type==='videos'?'selected':''}>🎬 Video bài giảng</option>
          <option value="docs" ${state.uploadModal.type==='docs'?'selected':''}>📄 Tài liệu dạy</option>
          <option value="exams" ${state.uploadModal.type==='exams'?'selected':''}>📝 Đề thi</option>
        </select>
      </div>
      <div class="field">
        <label>Tên tài liệu</label>
        <input id="up-name" placeholder="VD: Bài tập cuối tuần 6...">
      </div>
      <div class="field">
        <label>Chọn file</label>
        <input type="file" style="background:#fff; border:1.5px dashed var(--line); padding:10px; cursor:pointer;">
      </div>
      <div class="modal-actions" style="margin-top:20px;">
        <button class="btn btn-ghost" onclick="closeUploadModal()">Hủy</button>
        <button class="btn btn-accent" onclick="submitUpload()">Tải lên</button>
      </div>
    </div>
  </div>`;
}

function openFilePreview(type, index){
  state.filePreview = { type, index, item: state.library[type][index] };
  render();
}
function closeFilePreview(){ state.filePreview = null; render(); }

function renderFilePreviewModal(){
  if (!state.filePreview) return '';
  const { type, item } = state.filePreview;
  const icoMap = {videos:'🎬', docs:'📄', exams:'📝'};
  let body;
  if(type==='videos'){
    body = `
    <div class="video-frame" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center; height:200px; color:#fff; border-radius:8px; position:relative;">
      <div class="video-play-btn" style="font-size:36px; cursor:pointer;">▶</div>
      <div class="vf-duration" style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.6); padding:2px 6px; font-size:12px; border-radius:4px;">${item.meta.split('·')[0].trim()}</div>
    </div>`;
  } else {
    body = `
    <div class="doc-page" style="background:#fff; border:1px solid var(--line); padding:20px; border-radius:8px;">
      <div class="doc-page-title" style="font-weight:700; margin-bottom:12px;">${item.name}</div>
      <div class="doc-line med" style="height:8px; background:#f0f0f0; margin-bottom:8px; width:80%;"></div>
      <div class="doc-line" style="height:8px; background:#f0f0f0; margin-bottom:8px; width:100%;"></div>
      <div class="doc-line short" style="height:8px; background:#f0f0f0; margin-bottom:8px; width:40%;"></div>
    </div>`;
  }
  return `
  <div class="modal-backdrop" onclick="if(event.target===this) closeFilePreview()">
    <div class="modal file-modal" style="max-width:500px; background:#fff; padding:20px; border-radius:12px;">
      <div class="file-modal-head" style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
        <div>
          <div class="file-modal-title" style="font-size:18px; font-weight:700;">${icoMap[type]} ${item.name}</div>
          <div class="file-modal-meta" style="font-size:13px; color:var(--slate);">${item.meta}</div>
        </div>
        <button class="file-modal-close" onclick="closeFilePreview()" style="background:none; border:none; font-size:18px; cursor:pointer;">✕</button>
      </div>
      <div class="file-modal-body">${body}</div>
      <div class="file-modal-foot" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
        <button class="btn btn-ghost" onclick="closeFilePreview()">Đóng</button>
        <button class="btn btn-accent" onclick="showToast('Đang tải xuống '+ '${item.name.replace(/'/g,"")}' +'…')">⬇ Tải xuống</button>
      </div>
    </div>
  </div>`;
}

function render(){
  const app = document.getElementById('app');
  if(app) app.innerHTML = state.screen==='auth' ? renderAuth() : renderShell();
}

render();
try {
  const loginNotice = sessionStorage.getItem('edutrack_login_notice');
  if(loginNotice){
    sessionStorage.removeItem('edutrack_login_notice');
    showToast(loginNotice);
  }
} catch (_error) {}
