/* ============================================================
   EduTrack — Trang giáo viên (gv.js)
   ============================================================ */

let db = DB.load();
let currentClassId = null;
let editingStudentId = null;
let selectedVideoIds = new Set();
let selectedTopicIds = new Set();
let pendingTest = null; // { title, examFileName, answerKey }

function save() { DB.save(db); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function classById(id) { return db.classes.find(c => c.id === id); }
function studentsOfClass(classId) { return db.students.filter(s => s.classIds.includes(classId)); }

/* ---------------- NAV TABS ---------------- */
document.querySelectorAll('.so-tay-tabs a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.so-tay-tabs a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('main > .tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + a.dataset.tab).classList.add('active');
  });
});

/* ================================================================
   01. TỔNG QUAN
   ================================================================ */
function renderOverview() {
  const wrap = document.getElementById('overviewCards');
  const totalStudents = db.students.length;
  const totalClasses = db.classes.length;
  const pendingTests = db.tests.length;
  wrap.innerHTML = `
    <div class="card card--pinned">
      <p class="card__label">Học sinh</p>
      <h2 style="font-family:var(--font-display); font-size:2rem; margin:0;">${totalStudents}</h2>
      <p class="footnote">đang có tài khoản</p>
    </div>
    <div class="card card--pinned">
      <p class="card__label">Lớp học</p>
      <h2 style="font-family:var(--font-display); font-size:2rem; margin:0;">${totalClasses}</h2>
      <p class="footnote">${pendingTests} đề kiểm tra đã tạo</p>
    </div>`;
}

/* ================================================================
   02. TÀI KHOẢN HỌC SINH
   ================================================================ */
function renderStudentClassOptions() {
  const sel = document.getElementById('studentClass');
  sel.innerHTML = db.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderStudentTable() {
  const body = document.getElementById('studentTableBody');
  if (db.students.length === 0) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty-state">Chưa có học sinh nào.</div></td></tr>`;
    return;
  }
  body.innerHTML = db.students.map(s => {
    const classNames = s.classIds.map(id => classById(id)?.name).filter(Boolean).join(', ') || '—';
    return `
      <tr>
        <td>${s.name}</td>
        <td><span class="tag tag--moss">${classNames}</span></td>
        <td class="rank">${s.username}</td>
        <td>
          <div class="row-actions">
            <span class="rank" id="pw-${s.id}">••••••</span>
            <button class="icon-btn" title="Hiện/ẩn mật khẩu" onclick="togglePassword('${s.id}')">👁</button>
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="Sửa" onclick="openEditStudent('${s.id}')">✎</button>
            <button class="icon-btn icon-btn--danger" title="Xóa" onclick="deleteStudent('${s.id}')">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function togglePassword(id) {
  const s = db.students.find(x => x.id === id);
  const el = document.getElementById('pw-' + id);
  el.textContent = el.textContent === '••••••' ? s.password : '••••••';
}

document.getElementById('btnAddStudent').addEventListener('click', () => openStudentModal());

function openStudentModal() {
  editingStudentId = null;
  document.getElementById('studentModalLabel').textContent = 'Thêm học sinh';
  document.getElementById('studentName').value = '';
  document.getElementById('studentUsername').value = '';
  document.getElementById('studentPassword').value = '';
  renderStudentClassOptions();
  document.getElementById('studentModalBackdrop').classList.add('open');
}

function openEditStudent(id) {
  const s = db.students.find(x => x.id === id);
  editingStudentId = id;
  document.getElementById('studentModalLabel').textContent = 'Sửa thông tin học sinh';
  document.getElementById('studentName').value = s.name;
  document.getElementById('studentUsername').value = s.username;
  document.getElementById('studentPassword').value = s.password;
  renderStudentClassOptions();
  document.getElementById('studentClass').value = s.classIds[0] || '';
  document.getElementById('studentModalBackdrop').classList.add('open');
}

function deleteStudent(id) {
  const s = db.students.find(x => x.id === id);
  if (!confirm(`Xóa tài khoản của "${s.name}"? Thao tác không thể hoàn tác.`)) return;
  db.students = db.students.filter(x => x.id !== id);
  save();
  renderStudentTable();
  renderOverview();
  showToast('Đã xóa học sinh.');
}

document.getElementById('studentModalClose').addEventListener('click', () => {
  document.getElementById('studentModalBackdrop').classList.remove('open');
});

document.getElementById('btnSaveStudent').addEventListener('click', () => {
  const name = document.getElementById('studentName').value.trim();
  const username = document.getElementById('studentUsername').value.trim();
  const password = document.getElementById('studentPassword').value.trim();
  const classId = document.getElementById('studentClass').value;
  if (!name || !username || !password) { showToast('Vui lòng nhập đầy đủ thông tin.'); return; }

  if (editingStudentId) {
    const s = db.students.find(x => x.id === editingStudentId);
    s.name = name; s.username = username; s.password = password;
    s.classIds = [classId];
    showToast('Đã cập nhật học sinh.');
  } else {
    db.students.push({ id: DB.uid('hs'), name, username, password, classIds: [classId] });
    showToast('Đã thêm học sinh.');
  }
  save();
  document.getElementById('studentModalBackdrop').classList.remove('open');
  renderStudentTable();
  renderOverview();
});

/* ================================================================
   03. LỚP HỌC
   ================================================================ */
function renderClassList() {
  const wrap = document.getElementById('classList');
  wrap.innerHTML = db.classes.map(c => {
    const n = studentsOfClass(c.id).length;
    return `
      <div class="class-tile" onclick="openClassDetail('${c.id}')">
        <h3>${c.name}</h3>
        <div class="code">Mã lớp: ${c.code}</div>
        <div class="stat-line">${n} học sinh · ${c.videos.length} video · ${c.testIds.length} đề kiểm tra</div>
      </div>`;
  }).join('');
}

function openClassDetail(classId) {
  currentClassId = classId;
  selectedVideoIds.clear();
  selectedTopicIds.clear();
  document.getElementById('classListView').style.display = 'none';
  document.getElementById('classDetailView').style.display = 'block';
  const c = classById(classId);
  document.getElementById('classDetailName').textContent = c.name;
  document.getElementById('classDetailCode').textContent = `Mã lớp: ${c.code} · ${studentsOfClass(classId).length} học sinh`;
  renderVideoList();
  renderTopicList();
  renderClassTestList();
}

document.getElementById('btnBackToClasses').addEventListener('click', () => {
  currentClassId = null;
  document.getElementById('classDetailView').style.display = 'none';
  document.getElementById('classListView').style.display = 'block';
  renderClassList();
});

document.querySelectorAll('.subtabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#classDetailView > .tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('subtab-' + btn.dataset.subtab).classList.add('active');
  });
});

/* ---- Video ---- */
function renderVideoList() {
  const c = classById(currentClassId);
  const wrap = document.getElementById('videoItemList');
  if (c.videos.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có video nào. Tải video đầu tiên ở trên.</div>`;
  } else {
    wrap.innerHTML = c.videos.slice().sort((a, b) => a.order - b.order).map(v => `
      <div class="item-row">
        <div class="item-row__main">
          <input type="checkbox" ${selectedVideoIds.has(v.id) ? 'checked' : ''} onchange="toggleVideoSelect('${v.id}', this.checked)">
          <div>
            <div class="item-row__title">Bài ${v.order}: ${v.title}</div>
            <div class="item-row__meta">${v.published ? '✅ Đã gửi cho học sinh' : '— chưa gửi'}</div>
          </div>
        </div>
      </div>`).join('');
  }
  updateVideoSelectCount();
}

function toggleVideoSelect(id, checked) {
  checked ? selectedVideoIds.add(id) : selectedVideoIds.delete(id);
  updateVideoSelectCount();
}
function updateVideoSelectCount() {
  document.getElementById('videoSelectCount').textContent =
    selectedVideoIds.size ? `Đã chọn ${selectedVideoIds.size} video` : 'Chưa chọn video nào';
}

document.getElementById('btnAddVideo').addEventListener('click', () => {
  const title = document.getElementById('newVideoTitle').value.trim();
  const fileInput = document.getElementById('newVideoFile');
  if (!title) { showToast('Nhập tên bài học trước đã.'); return; }
  const c = classById(currentClassId);
  const fileUrl = fileInput.files[0] ? URL.createObjectURL(fileInput.files[0]) : 'https://www.w3schools.com/html/mov_bbb.mp4';
  c.videos.push({
    id: DB.uid('v'), title, url: fileUrl,
    topicId: null, order: c.videos.length + 1, published: false,
  });
  save();
  document.getElementById('newVideoTitle').value = '';
  fileInput.value = '';
  renderVideoList();
  renderClassList();
  showToast('Đã tải video lên (chưa gửi cho học sinh).');
});

document.getElementById('btnSendVideos').addEventListener('click', () => {
  if (selectedVideoIds.size === 0) { showToast('Chọn ít nhất 1 video để gửi.'); return; }
  const c = classById(currentClassId);
  c.videos.forEach(v => { if (selectedVideoIds.has(v.id)) v.published = true; });
  save();
  selectedVideoIds.clear();
  renderVideoList();
  showToast(`Đã gửi video cho ${studentsOfClass(currentClassId).length} học sinh trong lớp.`);
});

/* ---- Chủ đề ---- */
function renderTopicList() {
  const c = classById(currentClassId);
  const wrap = document.getElementById('topicItemList');
  if (c.topics.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có chủ đề nào.</div>`;
  } else {
    wrap.innerHTML = c.topics.map(t => {
      const vCount = t.videoIds.length;
      return `
      <div class="item-row">
        <div class="item-row__main">
          <input type="checkbox" ${selectedTopicIds.has(t.id) ? 'checked' : ''} onchange="toggleTopicSelect('${t.id}', this.checked)">
          <div>
            <div class="item-row__title">${t.title}</div>
            <div class="item-row__meta">${vCount} video gắn kèm · ${t.published ? '✅ Đã gửi' : '— chưa gửi'}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  updateTopicSelectCount();
}
function toggleTopicSelect(id, checked) {
  checked ? selectedTopicIds.add(id) : selectedTopicIds.delete(id);
  updateTopicSelectCount();
}
function updateTopicSelectCount() {
  document.getElementById('topicSelectCount').textContent =
    selectedTopicIds.size ? `Đã chọn ${selectedTopicIds.size} chủ đề` : 'Chưa chọn chủ đề nào';
}

document.getElementById('btnAddTopic').addEventListener('click', () => {
  const title = document.getElementById('newTopicTitle').value.trim();
  if (!title) { showToast('Nhập tên chủ đề trước đã.'); return; }
  const c = classById(currentClassId);
  c.topics.push({ id: DB.uid('t'), title, videoIds: [], published: false });
  save();
  document.getElementById('newTopicTitle').value = '';
  renderTopicList();
  showToast('Đã tạo chủ đề mới.');
});

document.getElementById('btnSendTopics').addEventListener('click', () => {
  if (selectedTopicIds.size === 0) { showToast('Chọn ít nhất 1 chủ đề để gửi.'); return; }
  const c = classById(currentClassId);
  c.topics.forEach(t => { if (selectedTopicIds.has(t.id)) t.published = true; });
  save();
  selectedTopicIds.clear();
  renderTopicList();
  showToast(`Đã gửi chủ đề cho ${studentsOfClass(currentClassId).length} học sinh trong lớp.`);
});

/* ---- Bài kiểm tra sắp tới (chỉ xem, tạo ở mục 04) ---- */
function renderClassTestList() {
  const c = classById(currentClassId);
  const wrap = document.getElementById('classTestList');
  const tests = db.tests.filter(t => c.testIds.includes(t.id));
  if (tests.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có đề kiểm tra nào được gửi tới lớp này.</div>`;
  } else {
    wrap.innerHTML = tests.map(t => `
      <div class="item-row">
        <div class="item-row__main">
          <div>
            <div class="item-row__title">${t.title}</div>
            <div class="item-row__meta">Tệp: ${t.examFileName} · gửi ngày ${t.createdAt}</div>
          </div>
        </div>
        <span class="tag tag--accent">${t.answerKey.length} câu</span>
      </div>`).join('');
  }
}

/* ================================================================
   04. NGÂN HÀNG ĐỀ THI
   ================================================================ */
document.getElementById('btnConfirmTest').addEventListener('click', () => {
  const title = document.getElementById('testTitle').value.trim();
  const fileInput = document.getElementById('testFile');
  const answersRaw = document.getElementById('testAnswers').value.trim();
  if (!title || !fileInput.files[0] || !answersRaw) {
    showToast('Vui lòng nhập tên đề, tệp đề thi và đáp án.');
    return;
  }
  pendingTest = {
    title,
    examFileName: fileInput.files[0].name,
    answerKey: answersRaw.split(',').map(s => s.trim()).filter(Boolean),
  };
  document.getElementById('pendingTestSummary').innerHTML =
    `<b>${pendingTest.title}</b> · ${pendingTest.examFileName} · đáp án: ${pendingTest.answerKey.join(', ')}`;
  renderTestClassCheckboxes();
  document.getElementById('testAssignCard').style.display = 'block';
  showToast('Đã xác nhận đề — chọn lớp bên dưới để gửi.');
});

function renderTestClassCheckboxes() {
  const wrap = document.getElementById('testClassCheckboxes');
  wrap.innerHTML = db.classes.map(c => `
    <label class="checkbox-tile">
      <input type="checkbox" value="${c.id}"> ${c.name} <span class="footnote" style="margin:0;">(${studentsOfClass(c.id).length} hs)</span>
    </label>`).join('');
}

document.getElementById('btnSendTest').addEventListener('click', () => {
  const checked = Array.from(document.querySelectorAll('#testClassCheckboxes input:checked')).map(el => el.value);
  if (checked.length === 0) { showToast('Chọn ít nhất 1 lớp.'); return; }
  const newTest = {
    id: DB.uid('bt'),
    ...pendingTest,
    classIds: checked,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  db.tests.push(newTest);
  checked.forEach(cid => classById(cid).testIds.push(newTest.id));
  save();

  const totalStudents = checked.reduce((sum, cid) => sum + studentsOfClass(cid).length, 0);
  showToast(`Đã gửi đề cho ${checked.length} lớp (${totalStudents} học sinh).`);

  pendingTest = null;
  document.getElementById('testTitle').value = '';
  document.getElementById('testFile').value = '';
  document.getElementById('testAnswers').value = '';
  document.getElementById('testAssignCard').style.display = 'none';
  renderTestHistory();
  renderOverview();
});

function renderTestHistory() {
  const wrap = document.getElementById('testHistoryList');
  if (db.tests.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa gửi đề kiểm tra nào.</div>`;
    return;
  }
  wrap.innerHTML = db.tests.slice().reverse().map(t => {
    const classNames = t.classIds.map(id => classById(id)?.name).filter(Boolean).join(', ');
    return `
      <div class="item-row">
        <div class="item-row__main">
          <div>
            <div class="item-row__title">${t.title}</div>
            <div class="item-row__meta">Gửi ngày ${t.createdAt} → lớp: ${classNames}</div>
          </div>
        </div>
        <span class="tag tag--moss">${t.answerKey.length} câu</span>
      </div>`;
  }).join('');
}

/* ---------------- INIT ---------------- */
renderOverview();
renderStudentTable();
renderClassList();
renderTestHistory();
