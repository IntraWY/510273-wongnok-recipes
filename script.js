// -------------------- LocalStorage Helper --------------------
const LS = {
  get: (k, def) => JSON.parse(localStorage.getItem(k)) || def,
  set: (k, v)   => localStorage.setItem(k, JSON.stringify(v)),
};

// -------------------- Recipe Model --------------------
class Recipe {
  constructor({id, name, img, time, diff, ingredients, steps, owner, rating=0, count=0}) {
    Object.assign(this, {id, name, img, time, diff, ingredients, steps, owner, rating, count});
  }
}

// -------------------- Global State --------------------
let currentUser = null, editTargetId = null;

// -------------------- AUTH --------------------
// เปิด modal ล็อกอิน
function openAuthModal() {
  document.getElementById('authModal').style.display = 'block';
}
// ปิด modal ล็อกอิน
function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}
// ล็อกอิน/สมัครสมาชิก
function doLogin() {
  const u = document.getElementById('usernameInput').value.trim();
  if (!u) { alert('กรุณากรอกชื่อผู้ใช้'); return; }
  const users = LS.get('users', []);
  if (!users.includes(u)) { users.push(u); LS.set('users', users); }
  currentUser = u;
  document.getElementById('usernameShow').textContent = u;
  closeAuthModal(); updateNav(); renderRecipes(); alert(`สวัสดี ${u}`);
}
// ออกจากระบบ
function logout() {
  currentUser = null; updateNav(); renderRecipes();
}
// อัปเดต navbar ตามสถานะผู้ใช้
function updateNav() {
  document.getElementById('loginBtn').classList.toggle('hide', !!currentUser);
  document.getElementById('logoutBtn').classList.toggle('hide', !currentUser);
  document.getElementById('addBtn').classList.toggle('hide', !currentUser);
  document.getElementById('userDisplay').classList.toggle('hide', !currentUser);
}

// -------------------- UTIL --------------------
// ดึงสูตรอาหารทั้งหมด
function getRecipes() { return LS.get('recipes', []); }
// บันทึกสูตรอาหาร
function saveRecipes(a) { LS.set('recipes', a); }
// ตรวจสอบช่วงเวลาในการทำอาหาร
function timeMatch(t, r) {
  switch(r) {
    case 'r1': return t >= 5 && t <= 10;
    case 'r2': return t >= 11 && t <= 30;
    case 'r3': return t >= 31 && t <= 60;
    case 'r4': return t > 60;
    default: return true;
  }
}

// -------------------- RENDER --------------------
// แสดงรายการสูตรอาหารทั้งหมด (พร้อมฟิลเตอร์)
function renderRecipes() {
  const kw = document.getElementById('searchInput').value.toLowerCase();
  const tf = document.getElementById('timeFilter').value;
  const df = document.getElementById('diffFilter').value;
  const uf = document.getElementById('userFilter') ? document.getElementById('userFilter').value.trim().toLowerCase() : '';
  const rf = document.getElementById('ratingFilter') ? document.getElementById('ratingFilter').value : '';
  const list = document.getElementById('recipeList');
  list.innerHTML = '';
  getRecipes()
    // ฟิลเตอร์ชื่อเมนู
    .filter(r => !kw || r.name.toLowerCase().includes(kw))
    // ฟิลเตอร์เวลา
    .filter(r => timeMatch(r.time, tf))
    // ฟิลเตอร์ระดับความยาก
    .filter(r => !df || r.diff === df)
    // ฟิลเตอร์ชื่อผู้ใช้
    .filter(r => !uf || (r.owner && r.owner.toLowerCase().includes(uf)))
    // ฟิลเตอร์เรตติ้ง
    .filter(r => {
      if (!rf) return true;
      const rating = r.count ? r.rating : 0;
      switch(rf) {
        case '5': return rating >= 5;
        case '4': return rating >= 4;
        case '3': return rating >= 3;
        case '2': return rating >= 2;
        case '1': return rating >= 1;
        default: return true;
      }
    })
    // วาดแต่ละ card
    .forEach(r => {
      const avg = r.count ? `${r.rating.toFixed(1)} ⭐` : 'ยังไม่มีคะแนน';
      const ingreds = r.ingredients.join(', ');
      const steps = r.steps.join('. ');
      const imageUrl = r.img && r.img.trim()
        ? r.img
        : `https://source.unsplash.com/600x400/?${encodeURIComponent(r.name)}`;
      list.innerHTML += `
<div class="card">
  ${(r.owner === currentUser || currentUser === 'admin') ? '<span class="owner-badge">ของฉัน</span>' : ''}
  <img src="${imageUrl}" alt="${r.name}">
  <div class="card-body">
    <h3>${r.name}</h3>
    <p class="creator">สร้างโดย: ${r.owner}</p>
    <ul class="meta">
      <li><i class="fa-regular fa-clock"></i> ${r.time} นาที</li>
      <li><i class="fa-solid fa-bolt"></i> ${r.diff}</li>
      <li><i class="fa-solid fa-star"></i> ${avg}</li>
    </ul>
    <div class="ingredients"><strong>วัตถุดิบ:</strong> ${ingreds}</div>
    <div class="steps"><strong>ขั้นตอน:</strong> ${steps}</div>
    ${
      (r.owner === currentUser || currentUser === 'admin')
        ? `<button class="btn-outline rate-btn edit-btn" onclick="openRecipeModal(${r.id})">แก้ไข</button>
           <button class="btn-outline rate-btn delete-btn" onclick="deleteRecipe(${r.id})">ลบ</button>`
        : `<button class="btn-fill rate-btn" onclick="rateRecipe(${r.id})">ให้คะแนน</button>`
    }
  </div>
</div>`;
    });
}

// -------------------- MODAL: เพิ่ม/แก้ไขสูตร --------------------
// เปิด modal เพิ่ม/แก้ไขสูตร
function openRecipeModal(id = null) {
  editTargetId = id;
  document.getElementById('recipeModalTitle').textContent = id ? 'แก้ไขสูตร' : 'เพิ่มสูตรอาหาร';
  if (id) {
    const r = getRecipes().find(x => x.id === id);
    // ตรวจสอบสิทธิ์: เจ้าของหรือ admin เท่านั้น
    if (r.owner !== currentUser && currentUser !== 'admin') {
      alert('คุณไม่มีสิทธิ์แก้ไขสูตรนี้');
      return;
    }
    document.getElementById('recipeName').value = r.name;
    document.getElementById('recipeImg').value = r.img;
    document.getElementById('recipeTime').value = r.time;
    document.getElementById('recipeDiff').value = r.diff;
    document.getElementById('recipeIngr').value = r.ingredients.join('\n');
    document.getElementById('recipeSteps').value = r.steps.join('\n');
  } else {
    // ล้างค่าในฟอร์ม
    ['recipeName','recipeImg','recipeTime','recipeDiff','recipeIngr','recipeSteps']
      .forEach(id => document.getElementById(id).value = '');
  }
  document.getElementById('recipeModal').style.display = 'block';
}
// ปิด modal เพิ่ม/แก้ไขสูตร
function closeRecipeModal() {
  document.getElementById('recipeModal').style.display = 'none';
  editTargetId = null;
}
// บันทึกสูตรอาหาร (เพิ่ม/แก้ไข)
function saveRecipe() {
  const name = document.getElementById('recipeName').value.trim();
  const img = document.getElementById('recipeImg').value.trim();
  const time = parseInt(document.getElementById('recipeTime').value);
  const diff = document.getElementById('recipeDiff').value;
  const ingredients = document.getElementById('recipeIngr').value.split('\n').map(x=>x.trim()).filter(Boolean);
  const steps = document.getElementById('recipeSteps').value.split('\n').map(x=>x.trim()).filter(Boolean);
  // ตรวจสอบความถูกต้องของข้อมูล
  if (!name) { alert('กรุณากรอกชื่อเมนู'); document.getElementById('recipeName').focus(); return; }
  if (!img) { alert('กรุณากรอกลิงก์รูปภาพ'); document.getElementById('recipeImg').focus(); return; }
  if (!time || isNaN(time) || time <= 0) { alert('กรุณากรอกเวลาในการทำ (ตัวเลขมากกว่า 0)'); document.getElementById('recipeTime').focus(); return; }
  if (!diff) { alert('กรุณาเลือกระดับความยาก'); document.getElementById('recipeDiff').focus(); return; }
  if (ingredients.length === 0) { alert('กรุณากรอกวัตถุดิบอย่างน้อย 1 รายการ'); document.getElementById('recipeIngr').focus(); return; }
  if (steps.length === 0) { alert('กรุณากรอกขั้นตอนอย่างน้อย 1 ขั้นตอน'); document.getElementById('recipeSteps').focus(); return; }
  let arr = getRecipes();
  if (editTargetId) {
    // แก้ไขสูตรเดิม
    arr = arr.map(r => r.id === editTargetId ? {...r, name, img, time, diff, ingredients, steps} : r);
  } else {
    // เพิ่มสูตรใหม่
    const id = Date.now();
    arr.push(new Recipe({id, name, img, time, diff, ingredients, steps, owner: currentUser}));
  }
  saveRecipes(arr);
  closeRecipeModal();
  renderRecipes();
}

// -------------------- ลบสูตรอาหาร --------------------
function deleteRecipe(id) {
  const arr = getRecipes();
  const recipe = arr.find(x => x.id === id);
  // ตรวจสอบสิทธิ์: เจ้าของหรือ admin เท่านั้น
  if (recipe.owner !== currentUser && currentUser !== 'admin') {
    alert('คุณสามารถลบได้เฉพาะสูตรของตัวเอง');
    return;
  }
  if (confirm('ลบสูตรนี้หรือไม่?')) {
    saveRecipes(arr.filter(x => x.id !== id));
    renderRecipes();
  }
}

// -------------------- ให้คะแนนสูตรอาหาร --------------------
function rateRecipe(id) {
  if (!currentUser) {
    alert('กรุณาเข้าสู่ระบบก่อนให้คะแนน');
    return;
  }
  const recipes = getRecipes();
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  if (recipe.owner === currentUser) {
    alert('ไม่สามารถให้คะแนนสูตรของตัวเองได้');
    return;
  }
  // ตรวจสอบว่าเคยให้คะแนนสูตรนี้แล้วหรือยัง
  const rated = LS.get('ratedByUser_' + currentUser, []);
  if (rated.includes(id)) {
    alert('คุณได้ให้คะแนนสูตรนี้ไปแล้ว');
    return;
  }
  // ขอคะแนนจากผู้ใช้
  let score = prompt('ให้คะแนนสูตรนี้ (1-5 ดาว):');
  if (!score) return;
  score = parseInt(score);
  if (isNaN(score) || score < 1 || score > 5) {
    alert('กรุณากรอกคะแนน 1-5');
    return;
  }
  // อัปเดตคะแนนเฉลี่ย
  recipe.rating = ((recipe.rating * recipe.count) + score) / (recipe.count + 1);
  recipe.count += 1;
  // บันทึกว่า user นี้ให้คะแนนสูตรนี้แล้ว
  rated.push(id);
  LS.set('ratedByUser_' + currentUser, rated);
  saveRecipes(recipes);
  renderRecipes();
  alert('ขอบคุณสำหรับการให้คะแนน!');
}

// -------------------- STARTUP --------------------
window.addEventListener('DOMContentLoaded', () => {
  // Event ปุ่ม navbar
  document.getElementById('loginBtn').onclick = openAuthModal;
  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('addBtn').onclick = () => openRecipeModal();
  // Event modal ล็อกอิน
  document.getElementById('usernameInput').addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });
  // Event ค้นหา/ฟิลเตอร์
  document.getElementById('btnSearch').onclick = renderRecipes;
  document.getElementById('searchInput').onkeyup = renderRecipes;
  document.getElementById('timeFilter').onchange = renderRecipes;
  document.getElementById('diffFilter').onchange = renderRecipes;
  // Event ฟอร์มเพิ่ม/แก้ไขสูตร
  document.getElementById('saveRecipeBtn').onclick = saveRecipe;
  document.querySelectorAll('.close').forEach(el => {
    if (el.closest('#recipeModal')) el.onclick = closeRecipeModal;
  });
  // Event ฟิลเตอร์ชื่อผู้ใช้/เรตติ้ง
  if (document.getElementById('userFilter'))
    document.getElementById('userFilter').onkeyup = renderRecipes;
  if (document.getElementById('ratingFilter'))
    document.getElementById('ratingFilter').onchange = renderRecipes;
  // อัปเดต navbar และแสดงสูตรอาหาร
  updateNav(); renderRecipes();
});

// *** ไม่มีโค้ดเกี่ยวกับ login-form, username, password, login-message ***

