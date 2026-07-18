const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'edutrack.sqlite');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_FILE);
db.pragma('foreign_keys = ON');

// Must be registered before routes: browsers send OPTIONS before JSON requests.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'html')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, username TEXT UNIQUE,
  password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')),
  dob TEXT, class_id TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, name TEXT NOT NULL, subject TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
  FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notes (
  student_id TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL,
  FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY, teacher_id TEXT, type TEXT NOT NULL CHECK(type IN ('videos','docs','exams')),
  name TEXT NOT NULL, meta TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, class_id TEXT NOT NULL, title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('mcq','essay','placement')), duration_minutes INTEGER,
  opens_at TEXT, questions_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL, student_id TEXT NOT NULL, answers_json TEXT NOT NULL,
  score REAL, submitted_at TEXT NOT NULL, UNIQUE(assessment_id, student_id)
);
CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL, lesson_name TEXT NOT NULL, completion INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL, UNIQUE(student_id, lesson_name)
);`);

const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const publicUser = (u) => u && ({ id: u.id, name: u.name, email: u.email, username: u.username, role: u.role, dob: u.dob, classId: u.class_id });
const bad = (res, message) => res.status(400).json({ error: message });

function seed() {
  if (db.prepare('SELECT COUNT(*) count FROM users').get().count) return;
  const teacher = { id: 't_demo', name: 'Lan Anh', email: 'lananh@truong.edu.vn', password: '123456', role: 'teacher' };
  db.prepare('INSERT INTO users (id,name,email,password,role,created_at) VALUES (@id,@name,@email,@password,@role,@created_at)')
    .run({ ...teacher, created_at: now() });
  db.prepare('INSERT INTO classes VALUES (?,?,?,?,?,?)').run('class_8a2', teacher.id, '8A2', 'Toán 8', '8A2-2026', now());
  db.prepare('INSERT INTO classes VALUES (?,?,?,?,?,?)').run('class_8a3', teacher.id, '8A3', 'Toán 8', '8A3-2026', now());
  const students = [
    ['s_minhnhat', 'Minh Nhật', 'minhnhat.8a2', 'Nhat14032012', '2012-03-14', 'class_8a2'],
    ['s_thuha', 'Thu Hà', 'thuha.8a2', 'Ha02052012', '2012-05-02', 'class_8a2'],
    ['s_quocbao', 'Quốc Bảo', 'quocbao.8a2', 'Bao19112011', '2011-11-19', 'class_8a2']
  ];
  const insert = db.prepare('INSERT INTO users (id,name,username,password,role,dob,class_id,created_at) VALUES (?,?,?,?,?,?,?,?)');
  students.forEach(([sid, name, username, password, dob, classId]) => insert.run(sid, name, username, password, 'student', dob, classId, now()));
  db.prepare('INSERT INTO notes VALUES (?,?,?)').run('s_minhnhat', 'Tiếp thu tốt phần lý thuyết, cần luyện thêm bài tập ứng dụng.', now());
  db.prepare('INSERT INTO materials VALUES (?,?,?,?,?,?)').run('mat_1', teacher.id, 'videos', 'Bài 4: Phân số bằng nhau', '18 phút · Toán 6', now());
}
seed();

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'sqlite' }));

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return bad(res, 'name, email, password are required');
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'Email đã tồn tại' });
  const user = { id: id('t'), name: name.trim(), email: email.trim().toLowerCase(), password, role: 'teacher', created_at: now() };
  db.prepare('INSERT INTO users (id,name,email,password,role,created_at) VALUES (@id,@name,@email,@password,@role,@created_at)').run(user);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { email, password, role, classCode } = req.body;
  if (!email || !password || !role) return bad(res, 'email, password, role are required');
  const field = role === 'student' ? 'username' : 'email';
  const user = db.prepare(`SELECT * FROM users WHERE ${field}=? AND password=? AND role=?`).get(email.trim(), password, role);
  if (!user) return res.status(401).json({ error: 'Thông tin đăng nhập không đúng' });
  if (role === 'student' && classCode) {
    const cls = db.prepare('SELECT 1 FROM classes WHERE id=? AND code=?').get(user.class_id, classCode.trim());
    if (!cls) return res.status(401).json({ error: 'Mã lớp không đúng' });
  }
  res.json({ user: publicUser(user) });
});

app.get('/api/teacher/:id/classes', (req, res) => {
  const classes = db.prepare(`SELECT c.*, COUNT(u.id) studentCount FROM classes c LEFT JOIN users u ON u.class_id=c.id AND u.role='student' WHERE c.teacher_id=? GROUP BY c.id ORDER BY c.created_at DESC`).all(req.params.id);
  res.json({ classes });
});
app.post('/api/classes', (req, res) => {
  const { teacherId, name, subject, code } = req.body;
  if (!teacherId || !name || !subject || !code) return bad(res, 'teacherId, name, subject, code are required');
  if (!db.prepare("SELECT 1 FROM users WHERE id=? AND role='teacher'").get(teacherId)) return res.status(404).json({ error: 'Giáo viên không tồn tại' });
  if (db.prepare('SELECT 1 FROM classes WHERE code=?').get(code.trim())) return res.status(409).json({ error: 'Mã lớp đã tồn tại' });
  const cls = { id: id('class'), teacherId, name: name.trim(), subject: subject.trim(), code: code.trim(), createdAt: now() };
  db.prepare('INSERT INTO classes VALUES (@id,@teacherId,@name,@subject,@code,@createdAt)').run(cls);
  res.status(201).json({ class: cls });
});
app.delete('/api/classes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM classes WHERE id=?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Lớp học không tồn tại' });
  res.sendStatus(204);
});
app.get('/api/classes/:id/students', (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id=?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Lớp học không tồn tại' });
  const students = db.prepare(`SELECT u.id,u.name,u.username,u.dob,u.class_id classId,COALESCE(n.content,'') note FROM users u LEFT JOIN notes n ON n.student_id=u.id WHERE u.class_id=? AND u.role='student' ORDER BY u.name`).all(cls.id);
  res.json({ class: cls, students });
});
app.post('/api/classes/:id/students', (req, res) => {
  const { name, dob, username, password } = req.body;
  if (!name || !dob || !username || !password) return bad(res, 'name, dob, username, password are required');
  if (!db.prepare('SELECT 1 FROM classes WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Lớp học không tồn tại' });
  if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username.trim())) return res.status(409).json({ error: 'Tên đăng nhập học sinh đã tồn tại' });
  const student = { id: id('s'), name: name.trim(), username: username.trim(), password, role: 'student', dob, classId: req.params.id, createdAt: now() };
  db.prepare('INSERT INTO users (id,name,username,password,role,dob,class_id,created_at) VALUES (@id,@name,@username,@password,@role,@dob,@classId,@createdAt)').run(student);
  res.status(201).json({ student: publicUser({ ...student, class_id: student.classId }) });
});
app.put('/api/students/:id/note', (req, res) => {
  if (typeof req.body.note !== 'string') return bad(res, 'note is required');
  if (!db.prepare("SELECT 1 FROM users WHERE id=? AND role='student'").get(req.params.id)) return res.status(404).json({ error: 'Học sinh không tồn tại' });
  db.prepare('INSERT INTO notes (student_id,content,updated_at) VALUES (?,?,?) ON CONFLICT(student_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at').run(req.params.id, req.body.note, now());
  res.json({ studentId: req.params.id, note: req.body.note });
});
app.post('/api/students/:id/note', (req, res) => { req.method = 'PUT'; app.handle(req, res); });
app.patch('/api/students/:id/profile', (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id=? AND role='student'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Học sinh không tồn tại' });
  const name = req.body.name?.trim() || u.name, dob = req.body.dob || u.dob, password = req.body.password || u.password;
  db.prepare('UPDATE users SET name=?,dob=?,password=? WHERE id=?').run(name, dob, password, u.id);
  res.json({ user: publicUser({ ...u, name, dob, password }) });
});

app.get('/api/materials', (req, res) => {
  const rows = db.prepare('SELECT * FROM materials ORDER BY created_at DESC').all();
  const materials = { videos: [], docs: [], exams: [] }; rows.forEach(x => materials[x.type].push(x));
  res.json(materials);
});
app.post('/api/materials', (req, res) => {
  const { teacherId = null, type, name, meta } = req.body;
  if (!['videos', 'docs', 'exams'].includes(type) || !name || !meta) return bad(res, 'type, name, meta are required');
  const item = { id: id('mat'), teacherId, type, name: name.trim(), meta: meta.trim(), createdAt: now() };
  db.prepare('INSERT INTO materials VALUES (@id,@teacherId,@type,@name,@meta,@createdAt)').run(item);
  res.status(201).json({ item });
});
app.delete('/api/materials/:id', (req, res) => res.status(db.prepare('DELETE FROM materials WHERE id=?').run(req.params.id).changes ? 204 : 404).send());

app.get('/api/messages/:userId', (req, res) => res.json({ messages: db.prepare('SELECT * FROM messages WHERE sender_id=? OR receiver_id=? ORDER BY created_at').all(req.params.userId, req.params.userId) }));
app.post('/api/messages', (req, res) => {
  const { from, to, body } = req.body; if (!from || !to || !body?.trim()) return bad(res, 'from, to, body are required');
  const message = { id: id('msg'), from, to, body: body.trim(), createdAt: now() };
  db.prepare('INSERT INTO messages VALUES (@id,@from,@to,@body,@createdAt)').run(message); res.status(201).json({ message });
});

app.post('/api/assessments', (req, res) => {
  const { teacherId, classId, title, type = 'mcq', durationMinutes, opensAt, questions = [] } = req.body;
  if (!teacherId || !classId || !title) return bad(res, 'teacherId, classId, title are required');
  const assessment = { id: id('exam'), teacherId, classId, title: title.trim(), type, durationMinutes: Number(durationMinutes) || null, opensAt: opensAt || null, questionsJson: JSON.stringify(questions), createdAt: now() };
  db.prepare('INSERT INTO assessments VALUES (@id,@teacherId,@classId,@title,@type,@durationMinutes,@opensAt,@questionsJson,@createdAt)').run(assessment);
  res.status(201).json({ assessment });
});
app.get('/api/students/:id/assessments', (req, res) => {
  const u = db.prepare('SELECT class_id FROM users WHERE id=?').get(req.params.id); if (!u) return res.status(404).json({ error: 'Học sinh không tồn tại' });
  res.json({ assessments: db.prepare('SELECT * FROM assessments WHERE class_id=? ORDER BY created_at DESC').all(u.class_id) });
});
app.post('/api/assessments/:id/submissions', (req, res) => {
  const { studentId, answers = [], score = null } = req.body; if (!studentId) return bad(res, 'studentId is required');
  const submission = { id: id('sub'), assessmentId: req.params.id, studentId, answersJson: JSON.stringify(answers), score, submittedAt: now() };
  db.prepare('INSERT INTO submissions VALUES (@id,@assessmentId,@studentId,@answersJson,@score,@submittedAt) ON CONFLICT(assessment_id,student_id) DO UPDATE SET answers_json=excluded.answers_json,score=excluded.score,submitted_at=excluded.submitted_at').run(submission);
  res.status(201).json({ submission });
});
app.put('/api/students/:id/progress', (req, res) => {
  const { lessonName, completion } = req.body; if (!lessonName || !Number.isFinite(completion)) return bad(res, 'lessonName and completion are required');
  db.prepare('INSERT INTO progress VALUES (?,?,?,?,?) ON CONFLICT(student_id,lesson_name) DO UPDATE SET completion=excluded.completion,updated_at=excluded.updated_at').run(id('progress'), req.params.id, lessonName, Math.max(0, Math.min(100, completion)), now());
  res.json({ studentId: req.params.id, lessonName, completion: Math.max(0, Math.min(100, completion)) });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy API' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'html', 'index.html')));
app.listen(PORT, () => console.log(`EduTrack running at http://localhost:${PORT} (SQLite: ${DB_FILE})`));
