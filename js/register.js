async function submitRegister(){
  const button = document.querySelector('.auth-submit');
  const name = document.querySelector('#register-name')?.value.trim();
  const email = document.querySelector('#register-email')?.value.trim();
  const password = document.querySelector('#register-password')?.value;
  const message = document.getElementById('reg-success');
  const error = document.getElementById('reg-error');

  error.classList.add('hidden');
  if(!name || !email || !password){
    error.textContent = 'Vui lòng điền đầy đủ thông tin.';
    error.classList.remove('hidden');
    return;
  }

  button.disabled = true;
  try{
    const res = await fetch('/api/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if(!res.ok){
      error.textContent = data.error || 'Đăng ký không thành công';
      error.classList.remove('hidden');
      button.disabled = false;
      return;
    }
    message.textContent = '✓ Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập...';
    message.classList.remove('hidden');
    setTimeout(() => { location.href = 'login.html?role=teacher'; }, 1200);
  } catch(err){
    console.error(err);
    error.textContent = 'Lỗi mạng, vui lòng thử lại.';
    error.classList.remove('hidden');
    button.disabled = false;
  }
}
