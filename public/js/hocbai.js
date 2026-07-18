/* ============================================================
   EduTrack — Xem bài giảng (hocbai.js)

   Quy tắc:
   - Video được sắp thứ tự trong lớp; chỉ xem video kế tiếp khi
     video trước đó đã xem xong (completed).
   - Video đã hoàn thành thì có thể xem lại tự do.
   - Trong 1 video, không được tua tới phần chưa xem — chỉ được
     tua lùi lại phần đã xem.
   - Tiến độ = 70% theo số video đã hoàn thành + 30% theo số bài
     tập đề xuất đã làm.
   - Bài tập đề xuất lọc theo: chủ đề của video đang xem (GDPT 2018)
     + mức độ của học sinh, suy ra từ điểm các bài kiểm tra trước.
   ============================================================ */

let db = DB.load();
let currentStudent = null;
let currentClass = null;
let videos = [];        // video đã published, sắp theo order
let activeVideo = null;
let player = document.getElementById('player');

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function ensureStudentProgress(studentId) {
  if (!db.progress[studentId]) db.progress[studentId] = {};
  if (!db.progress[studentId].exercisesDone) db.progress[studentId].exercisesDone = [];
  return db.progress[studentId];
}

function init() {
  const session = DB.session.get();
  if (session && session.role === 'student') {
    currentStudent = db.students.find(s => s.id === session.id);
  }
  if (!currentStudent) {
    window.location.href = 'trangchu.html';
    return;
  }

  const classId = qs('class');
  currentClass = db.classes.find(c => c.id === classId);
  if (!currentClass || !currentStudent.classIds.includes(classId)) {
    window.location.href = 'trangchu.html';
    return;
  }

  videos = currentClass.videos.filter(v => v.published).sort((a, b) => a.order - b.order);
  ensureStudentProgress(currentStudent.id);

  document.getElementById('className').textContent = currentClass.name;
  document.getElementById('topicName').textContent = 'Video bài giảng';

  renderVideoNav();
  const firstPlayable = videos.find(v => videoState(v.id) !== 'locked') || videos[0];
  if (firstPlayable) loadVideo(firstPlayable.id);
  renderProgress();
}

/* ---- Trạng thái video: locked / unlocked / completed ---- */
function videoState(videoId) {
  const prog = db.progress[currentStudent.id] || {};
  const idx = videos.findIndex(v => v.id === videoId);
  if (idx === 0) return prog[videoId]?.completed ? 'completed' : 'unlocked';
  const prevId = videos[idx - 1].id;
  const prevDone = !!prog[prevId]?.completed;
  if (!prevDone) return 'locked';
  return prog[videoId]?.completed ? 'completed' : 'unlocked';
}

function renderVideoNav() {
  const wrap = document.getElementById('videoNav');
  wrap.innerHTML = videos.map(v => {
    const state = videoState(v.id);
    const badge = state === 'completed' ? '✅' : state === 'locked' ? '🔒' : '▶';
    return `
      <div class="video-nav__item ${state === 'locked' ? 'locked' : ''} ${activeVideo === v.id ? 'active' : ''}"
           onclick="${state === 'locked' ? '' : `loadVideo('${v.id}')`}">
        <span class="video-nav__badge">${badge}</span>
        <span>Bài ${v.order}: ${v.title}</span>
      </div>`;
  }).join('');
}

/* ---- Nạp video vào player, khôi phục vị trí đã xem ---- */
function loadVideo(videoId) {
  activeVideo = videoId;
  const v = videos.find(x => x.id === videoId);
  const prog = ensureStudentProgress(currentStudent.id);
  if (!prog[videoId]) prog[videoId] = { watchedSeconds: 0, duration: 0, completed: false };

  player.src = v.url;
  player.load();

  const maxWatched = prog[videoId].watchedSeconds || 0;

  player.addEventListener('loadedmetadata', function onMeta() {
    if (maxWatched > 0 && maxWatched < player.duration - 1) {
      player.currentTime = maxWatched;
    }
    player.removeEventListener('loadedmetadata', onMeta);
  });

  // chặn tua tới phần chưa xem
  player.onseeking = () => {
    const allowed = Math.max(prog[videoId].watchedSeconds || 0, 0.5);
    if (player.currentTime > allowed + 0.75) {
      player.currentTime = allowed;
    }
  };

  player.ontimeupdate = () => {
    const p = ensureStudentProgress(currentStudent.id);
    if (!p[videoId]) p[videoId] = { watchedSeconds: 0, duration: 0, completed: false };
    if (player.currentTime > p[videoId].watchedSeconds) {
      p[videoId].watchedSeconds = player.currentTime;
      p[videoId].duration = player.duration || p[videoId].duration;
    }
    if (player.duration && player.currentTime >= player.duration - 0.5 && !p[videoId].completed) {
      markVideoCompleted(videoId);
    }
    DB.save(db);
  };

  player.onended = () => markVideoCompleted(videoId);

  renderVideoNav();
  renderExercises(v.topicId);
  renderProgress();
}

function markVideoCompleted(videoId) {
  const prog = ensureStudentProgress(currentStudent.id);
  if (prog[videoId].completed) return;
  prog[videoId].completed = true;
  DB.save(db);
  renderVideoNav();
  renderProgress();
}

/* ---- Tiến độ tổng (video + bài tập) ---- */
function renderProgress() {
  const prog = ensureStudentProgress(currentStudent.id);
  const completedVideos = videos.filter(v => prog[v.id]?.completed).length;
  const videoFrac = videos.length ? completedVideos / videos.length : 0;

  const allExerciseIds = new Set();
  videos.forEach(v => {
    exercisesForTopic(v.topicId).forEach(ex => allExerciseIds.add(ex.id));
  });
  const doneExerciseCount = prog.exercisesDone.filter(id => allExerciseIds.has(id)).length;
  const exFrac = allExerciseIds.size ? doneExerciseCount / allExerciseIds.size : 0;

  const overall = Math.round((videoFrac * 0.7 + exFrac * 0.3) * 100);
  document.getElementById('progressPct').textContent = overall + '%';
  const fill = document.getElementById('progressFill');
  fill.style.width = overall + '%';
  fill.classList.toggle('full', overall >= 100);
  document.getElementById('progressDetail').textContent =
    `${completedVideos}/${videos.length} video đã xem xong · ${doneExerciseCount}/${allExerciseIds.size} bài tập đã làm`;
}

/* ---- Mức độ học sinh theo chủ đề, dựa vào điểm kiểm tra trước ---- */
function studentLevelForTopic(topicId) {
  const results = db.testResults.filter(r => r.studentId === currentStudent.id && r.topicId === topicId);
  if (results.length === 0) return 'medium'; // chưa có dữ liệu -> mặc định trung bình
  const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
  if (avg >= 8) return 'advanced';
  if (avg >= 5) return 'medium';
  return 'basic';
}

function exercisesForTopic(topicId) {
  if (!topicId) return [];
  const level = studentLevelForTopic(topicId);
  let list = db.exerciseBank.filter(ex => ex.topicId === topicId && ex.level === level);
  if (list.length === 0) list = db.exerciseBank.filter(ex => ex.topicId === topicId); // dự phòng nếu chưa có bài đúng mức độ
  return list;
}

const levelLabel = { basic: 'Cơ bản', medium: 'Trung bình', advanced: 'Nâng cao' };

function renderExercises(topicId) {
  const wrap = document.getElementById('exerciseList');
  const list = exercisesForTopic(topicId);
  const prog = ensureStudentProgress(currentStudent.id);

  if (!topicId || list.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Chưa có bài tập đề xuất cho video này.</div>`;
    return;
  }

  const level = studentLevelForTopic(topicId);
  wrap.innerHTML = `<p class="footnote" style="margin-bottom:10px;">Mức độ đề xuất theo kết quả kiểm tra gần nhất: <b>${levelLabel[level]}</b></p>` +
    list.map(ex => {
      const done = prog.exercisesDone.includes(ex.id);
      return `
      <div class="exercise-card">
        <span class="tag tag--ink">${ex.program}</span>
        <span class="tag level-tag-${ex.level}" style="border:none; padding:3px 0;">· Mức ${levelLabel[ex.level]}</span>
        <h4>${ex.title}</h4>
        <p>${ex.desc}</p>
        <button class="btn btn--sm ${done ? '' : 'btn--accent'}" onclick="toggleExerciseDone('${ex.id}')">
          ${done ? '✓ Đã hoàn thành' : 'Đánh dấu đã làm'}
        </button>
      </div>`;
    }).join('');
}

function toggleExerciseDone(exId) {
  const prog = ensureStudentProgress(currentStudent.id);
  const idx = prog.exercisesDone.indexOf(exId);
  if (idx === -1) prog.exercisesDone.push(exId); else prog.exercisesDone.splice(idx, 1);
  DB.save(db);
  renderExercises(activeVideo ? videos.find(v => v.id === activeVideo).topicId : null);
  renderProgress();
}

init();
