shared/* ============================================================
   SỔ TAY SƯ PHẠM — lõi dữ liệu & điều hướng dùng chung
   Mọi file HTML (trangchu, baitanghoc, kiemtra, lophoc, nhantin)
   đều nạp file này để đọc/ghi chung một vùng localStorage.
   ============================================================ */

const SoTay = (() => {

  const KEYS = {
    ten:            'hocSinh_ten',
    lop:            'hocSinh_lop',
    tienDo:         'tienDoBaiHoc',
    videoMax:       'videoDaXemGiay',
    videoTienDoTheoBai: 'videoTienDoTheoBai',
    videoHoanThanhTheoBai: 'videoHoanThanhTheoBai',
    daHoanThanhAI:  'daHoanThanhBaiAI',
    diemGanNhat:    'diemKiemTraGanNhat',
    lichSuKiemTra:  'lichSuKiemTra',
    lichThi:        'lichThi',
    dsLop:          'danhSachLop',
    bxhTheoLop:     'bangXepHangTheoLop',
    noiQuyTheoLop:  'noiQuyThongBaoTheoLop',
    ngayHoanThanh:  'ngayHoanThanhChuoi',
    dongBang:       'soLuongDongBang',
    linkLienLac:    'linkLienLac',
    thongBao:       'thongBaoMoiNhat',
  };

  function seed(){
    const defaults = {
      [KEYS.ten]: 'Nguyễn An',
      [KEYS.lop]: '8A2',
      [KEYS.tienDo]: '0',
      [KEYS.videoMax]: '0',
      [KEYS.videoTienDoTheoBai]: JSON.stringify({}),
      [KEYS.videoHoanThanhTheoBai]: JSON.stringify([]),
      [KEYS.daHoanThanhAI]: 'false',
      [KEYS.diemGanNhat]: '',
      [KEYS.lichSuKiemTra]: JSON.stringify([]),
      [KEYS.lichThi]: JSON.stringify([
        { mon:'Toán học', ngay:'22/07' },
        { mon:'Ngữ văn',  ngay:'25/07' },
      ]),
      [KEYS.dsLop]: JSON.stringify(['8A1', '8A2', '8A3']),
      [KEYS.bxhTheoLop]: JSON.stringify({
        '8A1': [
          { ten:'Vũ Hoàng Long',  diem:9.2 },
          { ten:'Ngô Thuỳ Linh',  diem:8.8 },
          { ten:'Bùi Đức Anh',    diem:8.1 },
          { ten:'Hoàng Yến Nhi',  diem:7.6 },
        ],
        '8A2': [
          { ten:'Trần Bảo Châu', diem:9.5 },
          { ten:'Lê Minh Quân',  diem:9.0 },
          { ten:'Nguyễn An',     diem:8.5 },
          { ten:'Phạm Gia Hân',  diem:8.0 },
          { ten:'Đỗ Tuấn Kiệt',  diem:7.5 },
        ],
        '8A3': [
          { ten:'Đặng Khánh Vy', diem:9.4 },
          { ten:'Trịnh Nam Khoa',diem:8.6 },
          { ten:'Lý Gia Bảo',    diem:8.2 },
          { ten:'Phan Thu Trang',diem:7.9 },
        ],
      }),
      [KEYS.noiQuyTheoLop]: JSON.stringify({
        '8A1': [
          'Đi học đúng giờ, vào lớp trước 7h15.',
          'Không sử dụng điện thoại trong giờ học.',
          'Thứ Sáu hàng tuần nộp bài tập tuần qua nhóm Zalo.',
        ],
        '8A2': [
          'Trực nhật theo tổ, đổi tổ mỗi thứ Hai.',
          'Mang đủ sách vở các môn theo thời khoá biểu.',
          'Kiểm tra 15 phút môn Toán vào thứ Hai tuần sau.',
        ],
        '8A3': [
          'Đồng phục thể dục vào thứ Ba, thứ Năm.',
          'Không ăn quà vặt trong lớp.',
          'Họp phụ huynh dự kiến cuối tháng.',
        ],
      }),
      // chuỗi ngày học: tài khoản mới bắt đầu từ 0 — chỉ tăng khi học sinh thực sự hoàn thành trong ngày
      [KEYS.ngayHoanThanh]: JSON.stringify({}),
      [KEYS.dongBang]: '0',
      [KEYS.linkLienLac]: 'https://zalo.me/g/hocsinh8a2',
      [KEYS.thongBao]: 'Thứ Hai tuần sau lớp kiểm tra 15 phút môn Toán, chương Hàm số.',
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
    });
  }

  const get = (key) => localStorage.getItem(key);
  const set = (key, val) => localStorage.setItem(key, val);
  const getJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const setJSON = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  /* ---------- Chuỗi ngày học (streak) ---------- */
  function danhDauHomNayHoanThanh(){
    const map = getJSON(KEYS.ngayHoanThanh, {});
    const homNay = new Date().toISOString().slice(0,10);
    if (!map[homNay]){
      map[homNay] = true;
      setJSON(KEYS.ngayHoanThanh, map);
    }
  }
  function tinhChuoiNgay(){
    const map = getJSON(KEYS.ngayHoanThanh, {});
    const fmt = (d) => d.toISOString().slice(0,10);
    let d = new Date();
    let soNgay = 0;
    if (!map[fmt(d)]) d.setDate(d.getDate() - 1); // nếu hôm nay chưa học, tính chuỗi tới hôm qua
    while (map[fmt(d)]){
      soNgay++;
      d.setDate(d.getDate() - 1);
    }
    return soNgay;
  }

  /* ---------- Bảng xếp hạng theo lớp ---------- */
  function layBangXepHang(lop){
    const bxh = getJSON(KEYS.bxhTheoLop, {});
    return bxh[lop] || [];
  }
  function capNhatDiem(lop, ten, diem){
    const bxh = getJSON(KEYS.bxhTheoLop, {});
    if (!bxh[lop]) bxh[lop] = [];
    const idx = bxh[lop].findIndex(x => x.ten === ten);
    if (idx >= 0) bxh[lop][idx].diem = diem;
    else bxh[lop].push({ ten, diem });
    setJSON(KEYS.bxhTheoLop, bxh);
  }
  function layNoiQuy(lop){
    const nq = getJSON(KEYS.noiQuyTheoLop, {});
    return nq[lop] || [];
  }

  /* ---------- Chỉnh sửa thông tin tài khoản ---------- */
  function capNhatThongTinHocSinh(tenMoi, lopMoi){
    const tenCu = get(KEYS.ten);
    const lopCu = get(KEYS.lop);
    tenMoi = (tenMoi || '').trim();
    if (!tenMoi) tenMoi = tenCu;

    const bxh = getJSON(KEYS.bxhTheoLop, {});
    // gỡ bản ghi cũ khỏi lớp cũ (nếu có)
    let diemCu = null;
    if (bxh[lopCu]){
      const idx = bxh[lopCu].findIndex(x => x.ten === tenCu);
      if (idx >= 0){ diemCu = bxh[lopCu][idx].diem; bxh[lopCu].splice(idx, 1); }
    }
    // thêm/di chuyển bản ghi vào lớp mới với tên mới
    if (!bxh[lopMoi]) bxh[lopMoi] = [];
    const idxMoi = bxh[lopMoi].findIndex(x => x.ten === tenCu || x.ten === tenMoi);
    if (idxMoi >= 0){
      bxh[lopMoi][idxMoi].ten = tenMoi;
      if (diemCu !== null) bxh[lopMoi][idxMoi].diem = diemCu;
    } else {
      bxh[lopMoi].push({ ten: tenMoi, diem: diemCu !== null ? diemCu : 0 });
    }
    setJSON(KEYS.bxhTheoLop, bxh);

    set(KEYS.ten, tenMoi);
    set(KEYS.lop, lopMoi);
  }

  const NAV_ITEMS = [
    { href:'trangchu.html',   num:'01', label:'Trang chủ' },
    { href:'baitanghoc.html', num:'02', label:'Bài tăng học' },
    { href:'kiemtra.html',    num:'03', label:'Làm bài kiểm tra' },
    { href:'lophoc.html',     num:'04', label:'Lớp học' },
    { href:'nhantin.html',    num:'05', label:'Nhắn tin' },
  ];

  function renderNav(activeHref){
    const ten = get(KEYS.ten) || 'Học sinh';
    const lop = get(KEYS.lop) || '';
    const tabs = NAV_ITEMS.map(item => {
      const isActive = item.href === activeHref;
      return `<a href="${item.href}" class="${isActive ? 'active' : ''}">
        <span class="so-tay-tabs__num">${item.num}</span>${item.label}
      </a>`;
    }).join('');

    const nav = document.createElement('nav');
    nav.className = 'so-tay-nav';
    nav.innerHTML = `
      <div class="so-tay-nav__top">
        <div class="so-tay-nav__brand">Sổ Tay Sư Phạm <small>Không gian học tập</small></div>
        <div class="so-tay-nav__student"><b>${ten}</b> · Lớp ${lop}</div>
      </div>
      <ul class="so-tay-tabs">${tabs}</ul>
    `;
    document.body.prepend(nav);
  }

  function init(activeHref){
    seed();
    renderNav(activeHref);
  }

  return {
    KEYS, seed, get, set, getJSON, setJSON, init,
    danhDauHomNayHoanThanh, tinhChuoiNgay,
    layBangXepHang, capNhatDiem, layNoiQuy, capNhatThongTinHocSinh,
  };
})();
