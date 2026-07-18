/* ============================================================
   EduTrack — lớp dữ liệu dùng chung (mock, lưu localStorage)
   Đây là bản mô phỏng phía client để demo luồng nghiệp vụ.
   Khi có backend thật, thay các hàm get/save bên dưới bằng
   các lệnh gọi API tương ứng — phần giao diện (gv.js, trangchu.js,
   hocbai.js) sẽ không cần đổi vì đều đi qua các hàm DB.* này.
   ============================================================ */

const DB_KEY = 'edutrack_db_v1';
const SESSION_KEY = 'edutrack_session';

function seedDB() {
  return {
    students: [
      { id: 'hs1', name: 'Nguyễn Văn An', username: 'nguyenvanan', password: '123456', classIds: ['l1'] },
      { id: 'hs2', name: 'Trần Thị Bình', username: 'tranthibinh', password: '123456', classIds: ['l1'] },
      { id: 'hs3', name: 'Lê Minh Chi', username: 'leminhchi', password: '123456', classIds: ['l1', 'l2'] },
    ],
    classes: [
      {
        id: 'l1', name: 'Toán 5A', code: 'TOAN5A-8821',
        videos: [
          { id: 'v1', title: 'Bài 1: Khái niệm phân số', url: 'https://www.w3schools.com/html/mov_bbb.mp4', topicId: 't1', order: 1, published: true },
          { id: 'v2', title: 'Bài 2: So sánh phân số', url: 'https://www.w3schools.com/html/mov_bbb.mp4', topicId: 't1', order: 2, published: true },
          { id: 'v3', title: 'Bài 3: Quy đồng mẫu số', url: 'https://www.w3schools.com/html/mov_bbb.mp4', topicId: 't1', order: 3, published: false },
        ],
        topics: [
          { id: 't1', title: 'Chương 1: Phân số', videoIds: ['v1', 'v2', 'v3'], published: true },
        ],
        testIds: ['bt1'],
      },
      {
        id: 'l2', name: 'Toán 5B', code: 'TOAN5B-4410',
        videos: [], topics: [], testIds: [],
      },
    ],
    tests: [
      {
        id: 'bt1', title: 'Kiểm tra Chương 1: Phân số',
        examFileName: 'de-chuong1-phanso.pdf',
        answerKey: ['A', 'C', 'B', 'D', 'A'],
        classIds: ['l1'],
        createdAt: '2026-07-10',
      },
    ],
    // studentId -> { videoId: { watchedSeconds, duration, completed } }
    progress: {
      hs1: { v1: { watchedSeconds: 300, duration: 300, completed: true } },
    },
    // { studentId, testId, topicId, score } — score 0-10, dùng để suy ra mức độ học sinh
    testResults: [
      { studentId: 'hs1', testId: 'bt1', topicId: 't1', score: 6 },
    ],
    // ngân hàng bài tập theo chủ đề + mức độ, gắn nhãn chương trình GDPT 2018
    exerciseBank: [
      { id: 'ex1', topicId: 't1', level: 'basic', program: 'GDPT 2018 — Toán 5', title: 'Nhận biết phân số', desc: 'Đọc, viết phân số và xác định tử số, mẫu số.' },
      { id: 'ex2', topicId: 't1', level: 'medium', program: 'GDPT 2018 — Toán 5', title: 'So sánh hai phân số', desc: 'So sánh phân số cùng mẫu và khác mẫu số.' },
      { id: 'ex3', topicId: 't1', level: 'advanced', program: 'GDPT 2018 — Toán 5', title: 'Quy đồng và bài toán có lời văn', desc: 'Quy đồng mẫu số nhiều phân số và áp dụng vào bài toán thực tế.' },
    ],
  };
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seed = seedDB();
    localStorage.setItem(DB_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDB() {
  localStorage.removeItem(DB_KEY);
  return loadDB();
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

const DB = {
  load: loadDB,
  save: saveDB,
  reset: resetDB,
  session: { get: getSession, set: setSession },
  uid,
};
