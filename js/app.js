/* ============ ตัวช่วย ============ */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baht=n=>'฿'+Number(n||0).toLocaleString('th-TH',{maximumFractionDigits:2});
const thDate=d=>new Date(d).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'});
const thDateTime=d=>new Date(d).toLocaleString('th-TH',{year:'2-digit',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const CAT={flower:'ดอก',oil:'น้ำมัน',edible:'อาหาร',accessory:'อุปกรณ์'};
const STRAIN={indica:'Indica',sativa:'Sativa',hybrid:'Hybrid'};
const TOPIC={strains:'สายพันธุ์',compounds:'สาร THC/CBD',safety:'ความปลอดภัย',law:'กฎหมาย'};
const STATUS={Pending:'รอดำเนินการ',Paid:'ชำระแล้ว',Shipped:'จัดส่งแล้ว',Cancelled:'ยกเลิก'};
const LOW=3;
const tintOf=p=>({indica:'#6A4F8C',sativa:'#7C8B23',hybrid:'#2F7A5E'}[p.strain_type]||'#7A6E60');
function ageFrom(d){const b=new Date(d);if(isNaN(b))return -1;const n=new Date();let a=n.getFullYear()-b.getFullYear();const m=n.getMonth()-b.getMonth();if(m<0||(m===0&&n.getDate()<b.getDate()))a--;return a}
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2400)}

function art(p){
  const c=tintOf(p);let g='';
  if(p.category==='flower'){const L=[18,26,32,38,32,26,18];
    g=`<g transform="translate(60,86)" fill="${c}"><rect x="-1.6" y="0" width="3.2" height="20" rx="1.6"/>${[-78,-52,-26,0,26,52,78].map((a,i)=>`<ellipse cx="0" cy="${-L[i]}" rx="6.5" ry="${L[i]}" transform="rotate(${a})"/>`).join('')}</g>`}
  else if(p.category==='oil'){g=`<g fill="${c}"><rect x="53" y="10" width="14" height="14" rx="7"/><rect x="47" y="22" width="26" height="10" rx="3"/><rect x="40" y="32" width="40" height="64" rx="9"/><rect x="47" y="52" width="26" height="24" rx="3" fill="var(--surface)" opacity=".85"/></g>`}
  else if(p.category==='edible'){g=`<circle cx="60" cy="60" r="36" fill="${c}"/><g fill="var(--surface)" opacity=".8"><circle cx="48" cy="48" r="4"/><circle cx="70" cy="52" r="3.5"/><circle cx="56" cy="70" r="4.5"/><circle cx="74" cy="72" r="3"/><circle cx="44" cy="66" r="3"/></g>`}
  else {g=`<g fill="${c}"><rect x="28" y="30" width="64" height="18" rx="6"/><rect x="28" y="52" width="64" height="18" rx="4" opacity=".8"/><rect x="28" y="74" width="64" height="18" rx="6" opacity=".65"/></g>`}
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${g}</svg>`;
}
const pic=p=>p.cover_image_url&&p.cover_image_url.startsWith('data:image/')?`<img src="${p.cover_image_url}" alt="">`:art(p);
function meter(l,v,max){if(v==null||v==='')return '';const w=Math.min(100,v/max*100);return `<div class="meter"><span>${l}</span><div class="bar"><i style="width:${w}%"></i></div><b>${v}%</b></div>`}
function md(t){
  const out=[];let list=false;
  for(const raw of String(t||'').split('\n')){const l=raw.trim();
    if(l.startsWith('- ')){if(!list){out.push('<ul>');list=true}out.push(`<li>${esc(l.slice(2))}</li>`);continue}
    if(list){out.push('</ul>');list=false}
    if(!l)continue;
    out.push(l.startsWith('## ')?`<h2>${esc(l.slice(3))}</h2>`:`<p>${esc(l)}</p>`)}
  if(list)out.push('</ul>');return out.join('');
}
const excerpt=t=>{const s=String(t||'').split('\n').find(l=>l.trim()&&!l.startsWith('#')&&!l.startsWith('-'))||'';return s.length>110?s.slice(0,110)+'…':s};

/* ============ สถานะแอป ============ */
let db;
const S={view:'shop',q:'',cat:'all',strain:'all',adminTab:'overview',articleId:null,lastOrder:null,authMsg:''};
const me=()=>{const id=load(SESSION_KEY);return db.users.find(u=>u.id===id)||null};
const cart=()=>load(CART_KEY)||[];
const setCart=c=>store(CART_KEY,c);
const cartCount=()=>cart().reduce((s,i)=>s+i.qty,0);

function go(v,extra={}){Object.assign(S,{view:v},extra);render();window.scrollTo(0,0);$('#app').focus({preventScroll:true})}

function renderNav(){
  const u=me();const items=[['shop','ร้านค้า'],['learn','ความรู้'],['cart',`ตะกร้า<span class="count">${cartCount()}</span>`],['account',u?'บัญชีของฉัน':'เข้าสู่ระบบ']];
  if(u?.role==='admin')items.push(['admin','หลังบ้าน']);
  const cur=S.view==='article'?'learn':S.view==='checkout'||S.view==='done'?'cart':S.view;
  const navBtns=items.map(([v,l])=>`<button data-act="go" data-view="${v}" ${cur===v?'aria-current="page"':''}>${l}</button>`).join('');
  const adminBtn=`<a href="admin.html" class="btn small" style="margin-left:6px;text-decoration:none;display:inline-flex;align-items:center;gap:4px" title="เปิดหน้าจัดการแอดมิน">⚙️ แอดมิน</a>`;
  $('#nav').innerHTML=navBtns+adminBtn;
}

function render(){
  renderNav();
  const V={shop:vShop,learn:vLearn,article:vArticle,cart:vCart,checkout:vCheckout,done:vDone,account:vAccount,admin:vAdmin}[S.view]||vShop;
  $('#app').innerHTML=V();
  if(S.view==='shop')renderGrid();
}

/* ============ หน้าร้าน ============ */
function vShop(){
  const chips=(name,cur,opts)=>opts.map(([v,l])=>`<button class="chip" data-act="${name}" data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join('');
  return `<section class="hero">
    <div><h1>เลือกจากค่าสารจริง ไม่ใช่แค่ชื่อสายพันธุ์</h1>
    <p>ทุกสินค้าแสดงประเภท สายพันธุ์ และสัดส่วน THC/CBD ไว้บนฉลาก อ่านบทความด้านข้างก่อนเลือก เพื่อให้รู้ว่าตัวเลขเหล่านี้หมายถึงอะไร</p></div>
    <aside class="readfirst"><h2>อ่านก่อนเลือก</h2><ul>${db.articles.slice(0,3).map(a=>`<li><button class="linkbtn" data-act="article" data-id="${a.id}">${esc(a.title)}</button></li>`).join('')}</ul></aside>
  </section>
  <div class="filters">
    <div class="search"><input id="q" type="search" placeholder="ค้นหาชื่อสินค้า" aria-label="ค้นหาสินค้า" value="${esc(S.q)}"></div>
    <div class="chipgroup"><span>ประเภท</span><div class="chips">${chips('cat',S.cat,[['all','ทั้งหมด'],...Object.entries(CAT)])}</div></div>
    <div class="chipgroup"><span>สายพันธุ์</span><div class="chips">${chips('strain',S.strain,[['all','ทั้งหมด'],...Object.entries(STRAIN)])}</div></div>
  </div>
  <div class="grid" id="grid"></div>`;
}
function renderGrid(){
  const q=S.q.trim().toLowerCase();
  const list=db.products.filter(p=>(S.cat==='all'||p.category===S.cat)&&(S.strain==='all'||p.strain_type===S.strain)&&(!q||p.name.toLowerCase().includes(q)||CAT[p.category].includes(q)||(p.strain_type||'').includes(q)));
  const g=$('#grid');if(!g)return;
  if(!list.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1">ไม่พบสินค้าที่ตรงกับตัวกรองนี้ ลองล้างคำค้นหรือเลือก “ทั้งหมด”</div>`;return}
  g.innerHTML=list.map(card).join('');
}
function card(p){
  const out=p.stock_quantity<=0;
  return `<article class="spec" style="--tint:${tintOf(p)}">
    <button class="plate" data-act="detail" data-id="${p.id}" aria-label="ดูรายละเอียด ${esc(p.name)}">${pic(p)}</button>
    <div class="label">
      <h3><button data-act="detail" data-id="${p.id}">${esc(p.name)}</button></h3>
      <div class="tags"><span class="tag">${CAT[p.category]}</span>${p.strain_type?`<span class="tag strain">${STRAIN[p.strain_type]}</span>`:''}${out?'<span class="tag low">สินค้าหมด</span>':p.stock_quantity<LOW?`<span class="tag low">เหลือ ${p.stock_quantity}</span>`:''}</div>
      ${meter('THC',p.thc_percent,30)}${meter('CBD',p.cbd_percent,20)}
      <div class="buyrow"><span class="price">${baht(p.price)} <small>/ ${esc(p.unit_size)}</small></span>
      <button class="btn small" data-act="add" data-id="${p.id}" ${out?'disabled':''}>ใส่ตะกร้า</button></div>
    </div></article>`;
}
function relatedArticles(p){
  const want=p.category==='flower'?['strains','safety','law']:p.category==='accessory'?['safety','law']:['compounds','safety','law'];
  return db.articles.filter(a=>want.includes(a.topic));
}
function showDetail(id){
  const p=db.products.find(x=>x.id===id);if(!p)return;
  const rel=relatedArticles(p);
  openDlg(p.name,`<div class="detail" style="--tint:${tintOf(p)}">
    <div class="plate">${pic(p)}</div>
    <div>
      <div class="tags" style="margin-bottom:10px"><span class="tag">${CAT[p.category]}</span>${p.strain_type?`<span class="tag strain">${STRAIN[p.strain_type]}</span>`:''}<span class="tag">${esc(p.unit_size)}</span></div>
      ${meter('THC',p.thc_percent,30)}${meter('CBD',p.cbd_percent,20)}
      <p style="margin-top:12px"><span class="price">${baht(p.price)}</span> <span class="muted">· คงเหลือ ${p.stock_quantity} ชิ้น</span></p>
      ${p.category==='flower'?'<div class="notice">การซื้อช่อดอกอาจต้องมีใบสั่งจากแพทย์ตามกฎหมายปัจจุบัน โปรดตรวจสอบข้อกำหนดล่าสุด</div>':''}
      <button class="btn" data-act="add" data-id="${p.id}" ${p.stock_quantity<=0?'disabled':''}>ใส่ตะกร้า</button>
      ${rel.length?`<h3 style="margin:20px 0 6px;font-size:1rem;font-family:var(--sans)">บทความที่เกี่ยวข้อง</h3><ul style="margin:0;padding-left:1.2em">${rel.map(a=>`<li><button class="linkbtn" data-act="article" data-id="${a.id}">${esc(a.title)}</button></li>`).join('')}</ul>`:''}
    </div></div>`);
}

/* ============ ความรู้ ============ */
function vLearn(){
  return `<h1 style="margin-bottom:6px">คลังความรู้เรื่องกัญชา</h1>
  <p class="muted" style="max-width:60ch;margin-bottom:24px">ข้อมูลพื้นฐานที่เป็นกลาง เรื่องสายพันธุ์ สาร THC/CBD ข้อควรระวัง และกฎหมายเบื้องต้น ไม่ใช่คำแนะนำทางการแพทย์</p>
  ${db.articles.length?`<div class="artlist">${[...db.articles].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(a=>`
    <button class="artcard" data-act="article" data-id="${a.id}">
      ${a.cover_image_url?.startsWith('data:image/')?`<div class="artcover"><img src="${a.cover_image_url}" alt=""></div>`:''}
      <span class="topic">${TOPIC[a.topic]||esc(a.topic)}</span><h3>${esc(a.title)}</h3><span class="muted">${esc(excerpt(a.content))}</span>
      <small class="muted">${thDate(a.created_at)}</small></button>`).join('')}</div>`:'<div class="empty">ยังไม่มีบทความ ผู้ดูแลสามารถเพิ่มได้จากหน้าหลังบ้าน</div>'}`;
}
function vArticle(){
  const a=db.articles.find(x=>x.id===S.articleId);if(!a)return vLearn();
  return `<article class="read">
    <button class="linkbtn" data-act="go" data-view="learn">กลับไปหน้าความรู้</button>
    <p class="topic" style="margin-top:20px">${TOPIC[a.topic]||esc(a.topic)}</p>
    <h1>${esc(a.title)}</h1>
    ${a.cover_image_url?.startsWith('data:image/')?`<div class="artcover" style="margin-bottom:20px"><img src="${a.cover_image_url}" alt=""></div>`:''}
    ${md(a.content)}
    <p class="muted" style="font-family:var(--sans);font-size:.9rem;margin-top:30px">เผยแพร่ ${thDate(a.created_at)} · เนื้อหานี้เพื่อการศึกษา ไม่ใช่คำแนะนำทางการแพทย์</p>
    <button class="btn ghost" data-act="go" data-view="shop">ไปหน้าร้าน</button>
  </article>`;
}

/* ============ ตะกร้าและสั่งซื้อ ============ */
function addToCart(id){
  const p=db.products.find(x=>x.id===id);if(!p)return;
  const c=cart();const it=c.find(i=>i.product_id===id);const cur=it?it.qty:0;
  if(cur+1>p.stock_quantity){toast(`สต็อก ${p.name} มีเพียง ${p.stock_quantity} ชิ้น`);return}
  if(it)it.qty++;else c.push({product_id:id,qty:1});
  setCart(c);renderNav();toast(`เพิ่ม ${p.name} ลงตะกร้าแล้ว`);
}
function cartLines(){return cart().map(i=>({...i,p:db.products.find(x=>x.id===i.product_id)})).filter(i=>i.p)}
const cartTotal=()=>cartLines().reduce((s,i)=>s+i.p.price*i.qty,0);
function vCart(){
  const lines=cartLines();
  if(!lines.length)return `<h1 style="margin-bottom:20px">ตะกร้าสินค้า</h1><div class="empty">ตะกร้ายังว่างอยู่ <button class="linkbtn" data-act="go" data-view="shop">เลือกสินค้าจากหน้าร้าน</button></div>`;
  return `<h1 style="margin-bottom:20px">ตะกร้าสินค้า</h1>
  <div class="cartlayout"><div class="panel" style="padding-top:6px;padding-bottom:6px">${lines.map(i=>`
    <div class="cartitem" style="--tint:${tintOf(i.p)}">
      <div class="thumb">${pic(i.p)}</div>
      <div><b>${esc(i.p.name)}</b><br><span class="muted" style="font-size:.88rem">${baht(i.p.price)} / ${esc(i.p.unit_size)}</span><br>
        <button class="linkbtn" style="font-size:.85rem;color:var(--danger)" data-act="remove" data-id="${i.p.id}">นำออก</button></div>
      <div style="text-align:right"><div class="qty"><button data-act="qty" data-id="${i.p.id}" data-d="-1" aria-label="ลดจำนวน">−</button><span>${i.qty}</span><button data-act="qty" data-id="${i.p.id}" data-d="1" aria-label="เพิ่มจำนวน">+</button></div>
        <div style="margin-top:6px;font-weight:600">${baht(i.p.price*i.qty)}</div></div>
    </div>`).join('')}</div>
    <aside class="panel"><h2 style="font-size:1.15rem;margin-bottom:12px">สรุปคำสั่งซื้อ</h2>
      <div class="sumrow"><span>จำนวนสินค้า</span><span>${cartCount()} ชิ้น</span></div>
      <div class="sumrow total"><span>ยอดรวม</span><span>${baht(cartTotal())}</span></div>
      <button class="btn" style="width:100%;margin-top:16px" data-act="checkout">ไปกรอกที่อยู่จัดส่ง</button>
    </aside></div>`;
}
function changeQty(id,d){
  const c=cart();const it=c.find(i=>i.product_id===id);const p=db.products.find(x=>x.id===id);if(!it||!p)return;
  const n=it.qty+d;if(n>p.stock_quantity){toast(`สต็อกมีเพียง ${p.stock_quantity} ชิ้น`);return}
  if(n<=0)c.splice(c.indexOf(it),1);else it.qty=n;setCart(c);render();
}
function vCheckout(){
  const u=me();if(!u)return vAccount();
  if(u.role!=='customer')return `<div class="empty">บัญชีผู้ดูแลสั่งซื้อไม่ได้ กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชีลูกค้า <button class="linkbtn" data-act="logout">ออกจากระบบ</button></div>`;
  const lines=cartLines();if(!lines.length)return vCart();
  return `<h1 style="margin-bottom:20px">ที่อยู่จัดส่ง</h1>
  <div class="cartlayout"><form class="panel form" data-form="order">
    <div class="field"><label for="ship_name">ชื่อผู้รับ</label><input id="ship_name" name="name" required value="${esc(u.name)}"></div>
    <div class="field"><label for="ship_addr">ที่อยู่สำหรับจัดส่ง</label><textarea id="ship_addr" name="address" required>${esc(u.address)}</textarea><span class="hint">ระบบจะจำที่อยู่นี้ไว้ใช้ครั้งถัดไป</span></div>
    <p class="err" id="orderErr" role="alert"></p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">ยืนยันสั่งซื้อ ${baht(cartTotal())}</button><button class="btn ghost" type="button" data-act="go" data-view="cart">กลับไปแก้ตะกร้า</button></div>
  </form>
  <aside class="panel"><h2 style="font-size:1.15rem;margin-bottom:12px">รายการ</h2>
    ${lines.map(i=>`<div class="sumrow"><span>${esc(i.p.name)} × ${i.qty}</span><span>${baht(i.p.price*i.qty)}</span></div>`).join('')}
    <div class="sumrow total"><span>ยอดรวม</span><span>${baht(cartTotal())}</span></div></aside></div>`;
}
function placeOrder(f){
  const u=me();const lines=cartLines();const err=$('#orderErr');
  const addr=f.address.value.trim(), name=f.name.value.trim();
  if(!name||!addr){err.textContent='กรุณากรอกชื่อผู้รับและที่อยู่ให้ครบ';return}
  for(const i of lines){if(i.qty>i.p.stock_quantity){err.textContent=`${i.p.name} เหลือเพียง ${i.p.stock_quantity} ชิ้น กรุณาแก้จำนวนในตะกร้า`;return}}
  const order={id:nextId('orders'),user_id:u.id,total_amount:cartTotal(),status:'Pending',shipping_address:`${name}\n${addr}`,created_at:nowISO()};
  db.orders.push(order);
  for(const i of lines){
    db.order_items.push({id:nextId('order_items'),order_id:order.id,product_id:i.p.id,quantity:i.qty,price:i.p.price});
    i.p.stock_quantity=i.p.stock_quantity-i.qty; // ตัดสต็อกทันที
  }
  u.address=addr;save();setCart([]);go('done',{lastOrder:order.id});
}
function vDone(){
  const o=db.orders.find(x=>x.id===S.lastOrder);
  return `<div class="panel" style="max-width:560px;margin:0 auto;text-align:center;padding:36px">
    <h1 style="font-size:1.8rem;margin-bottom:10px">สั่งซื้อเรียบร้อย</h1>
    <p>หมายเลขคำสั่งซื้อ <b>#${o?.id??'-'}</b> ยอดรวม <b>${baht(o?.total_amount)}</b></p>
    <p class="muted">สถานะปัจจุบันคือ “รอดำเนินการ” ติดตามได้ที่หน้าบัญชีของฉัน</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px"><button class="btn" data-act="go" data-view="account">ดูประวัติการสั่งซื้อ</button><button class="btn ghost" data-act="go" data-view="shop">เลือกสินค้าต่อ</button></div></div>`;
}

/* ============ บัญชีลูกค้า ============ */
function vAccount(){
  const u=me();
  if(!u)return `<h1 style="margin-bottom:6px">เข้าสู่ระบบหรือสมัครสมาชิก</h1>
  ${S.authMsg?`<div class="notice">${esc(S.authMsg)}</div>`:'<p class="muted" style="margin-bottom:20px">บัญชีทดลอง: ลูกค้า customer@demo.th / demo1234 และผู้ดูแล admin@demo.th / admin123</p>'}
  <div class="two">
    <form class="panel form" data-form="login"><h2 style="font-size:1.2rem">เข้าสู่ระบบ</h2>
      <div class="field"><label for="li_email">อีเมล</label><input id="li_email" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="li_pw">รหัสผ่าน</label><input id="li_pw" name="password" type="password" required autocomplete="current-password"></div>
      <p class="err" id="loginErr" role="alert"></p><button class="btn" type="submit">เข้าสู่ระบบ</button></form>
    <form class="panel form" data-form="register"><h2 style="font-size:1.2rem">สมัครสมาชิก</h2>
      <div class="field"><label for="rg_name">ชื่อ-นามสกุล</label><input id="rg_name" name="name" required autocomplete="name"></div>
      <div class="field"><label for="rg_email">อีเมล</label><input id="rg_email" name="email" type="email" required autocomplete="email"></div>
      <div class="row2"><div class="field"><label for="rg_pw">รหัสผ่าน</label><input id="rg_pw" name="password" type="password" required minlength="6" autocomplete="new-password"><span class="hint">อย่างน้อย 6 ตัวอักษร</span></div>
      <div class="field"><label for="rg_dob">วันเกิด</label><input id="rg_dob" name="dob" type="date" required><span class="hint">ต้องอายุ 20 ปีขึ้นไป</span></div></div>
      <div class="field"><label for="rg_addr">ที่อยู่ (ไม่บังคับ)</label><textarea id="rg_addr" name="address" style="min-height:70px"></textarea></div>
      <p class="err" id="regErr" role="alert"></p><button class="btn" type="submit">สมัครสมาชิก</button></form>
  </div>`;
  const mine=db.orders.filter(o=>o.user_id===u.id).sort((a,b)=>b.id-a.id);
  return `<div class="headrow"><div><h1>สวัสดี ${esc(u.name)}</h1><p class="muted" style="margin:0">${esc(u.email)} · ${u.role==='admin'?'ผู้ดูแลระบบ':'ลูกค้า'} · อายุ ${ageFrom(u.date_of_birth)} ปี</p></div>
    <div style="display:flex;gap:8px">${u.role==='admin'?'<button class="btn" data-act="go" data-view="admin">ไปหน้าหลังบ้าน</button>':''}<button class="btn ghost" data-act="logout">ออกจากระบบ</button></div></div>
  ${u.role==='customer'?`<h2 style="margin:24px 0 12px">ประวัติการสั่งซื้อ</h2>
  ${mine.length?`<div class="tablewrap"><table><thead><tr><th>เลขที่</th><th>วันที่</th><th>รายการ</th><th class="num">ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>
  ${mine.map(o=>`<tr><td>#${o.id}</td><td>${thDateTime(o.created_at)}</td><td>${itemsText(o.id)}</td><td class="num">${baht(o.total_amount)}</td><td><span class="status ${o.status}">${STATUS[o.status]}</span></td></tr>`).join('')}
  </tbody></table></div>`:'<div class="empty">ยังไม่มีคำสั่งซื้อ <button class="linkbtn" data-act="go" data-view="shop">เริ่มเลือกสินค้า</button></div>'}`:''}`;
}
function itemsText(oid){return db.order_items.filter(i=>i.order_id===oid).map(i=>{const p=db.products.find(x=>x.id===i.product_id);return `${esc(p?p.name:'(สินค้าถูกลบ)')} × ${i.quantity}`}).join('<br>')}
async function doLogin(f){
  const u=db.users.find(x=>x.email.toLowerCase()===f.email.value.trim().toLowerCase());
  if(!u||u.password!==await hash(f.password.value)){$('#loginErr').textContent='อีเมลหรือรหัสผ่านไม่ถูกต้อง';return}
  store(SESSION_KEY,u.id);const back=S.authMsg;S.authMsg='';toast(`เข้าสู่ระบบในชื่อ ${u.name}`);
  go(back&&u.role==='customer'?'checkout':u.role==='admin'?'admin':'account');
}
async function doRegister(f){
  const e=$('#regErr');const email=f.email.value.trim().toLowerCase();
  if(!f.name.value.trim()||!email||!f.dob.value){e.textContent='กรุณากรอกชื่อ อีเมล รหัสผ่าน และวันเกิดให้ครบ';return}
  if(!/^\S+@\S+\.\S+$/.test(email)){e.textContent='รูปแบบอีเมลไม่ถูกต้อง';return}
  if(f.password.value.length<6){e.textContent='รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';return}
  if(db.users.some(u=>u.email.toLowerCase()===email)){e.textContent='อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน';return}
  if(ageFrom(f.dob.value)<20){e.textContent='สมัครได้เฉพาะผู้ที่มีอายุ 20 ปีขึ้นไป';return}
  const u={id:nextId('users'),name:f.name.value.trim(),email,password:await hash(f.password.value),role:'customer',address:f.address.value.trim(),date_of_birth:f.dob.value,age_verified:true};
  db.users.push(u);save();store(SESSION_KEY,u.id);const back=S.authMsg;S.authMsg='';toast('สมัครสมาชิกเรียบร้อย');go(back?'checkout':'account');
}

/* ============ หลังบ้าน ============ */
function vAdmin(){
  const u=me();
  if(u?.role!=='admin')return `<div class="panel" style="max-width:540px;margin:24px auto;text-align:center;padding:36px">
    <h2 style="font-size:1.4rem;margin-bottom:12px">ระบบผู้ดูแลร้านค้า (Admin Portal)</h2>
    <p class="muted" style="margin-bottom:24px">หน้านี้สำหรับการจัดการสต็อก สินค้า และคำสั่งซื้อ คุณสามารถกดเข้าสู่ระบบแอดมินทดลองได้ทันที หรือเปิดหน้าแดชบอร์ดเต็มรูปแบบ</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button class="btn" data-act="quick-admin">เข้าสู่ระบบแอดมินทันที (admin@demo.th)</button>
      <a href="admin.html" class="btn ghost" style="text-decoration:none">เปิดหน้า Admin Portal (admin.html) ↗</a>
    </div>
  </div>`;
  const tabs=[['overview','ภาพรวม'],['products','สินค้าและสต็อก'],['orders','คำสั่งซื้อ'],['articles','บทความ']];
  const body={overview:aOverview,products:aProducts,orders:aOrders,articles:aArticles}[S.adminTab]();
  return `<div class="headrow" style="margin-bottom:16px">
    <div><h1>หลังบ้าน</h1><p class="muted" style="margin:0">ยินดีต้อนรับ ${esc(u.name)} (${esc(u.email)})</p></div>
    <a href="admin.html" class="btn" style="text-decoration:none">🚀 เปิดหน้า Admin Portal เต็มรูปแบบ (พร้อมกราฟและใบเสร็จ) ↗</a>
  </div>
  <div class="admintabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${S.adminTab===k}" data-act="atab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}
function aOverview(){
  const valid=db.orders.filter(o=>o.status!=='Cancelled');
  const revenue=valid.reduce((s,o)=>s+o.total_amount,0);
  const low=db.products.filter(p=>p.stock_quantity<LOW);
  const pending=db.orders.filter(o=>o.status==='Pending').length;
  const recent=[...db.orders].sort((a,b)=>b.id-a.id).slice(0,5);
  return `<div class="stats">
    <div class="stat"><span>ยอดขายรวม (ไม่นับที่ยกเลิก)</span><b>${baht(revenue)}</b></div>
    <div class="stat"><span>คำสั่งซื้อทั้งหมด</span><b>${db.orders.length}</b></div>
    <div class="stat"><span>รอดำเนินการ</span><b>${pending}</b></div>
    <div class="stat ${low.length?'warn':''}"><span>สินค้าสต็อกต่ำ (น้อยกว่า ${LOW})</span><b>${low.length}</b></div></div>
  ${low.length?`<div class="panel" style="border-color:var(--danger);margin-bottom:20px"><h2 style="font-size:1.1rem;color:var(--danger);margin-bottom:8px">ต้องเติมสต็อก</h2>
    ${low.map(p=>`<div class="sumrow"><span>${esc(p.name)}</span><span>เหลือ ${p.stock_quantity} · <button class="linkbtn" data-act="edit-product" data-id="${p.id}">แก้ไข</button></span></div>`).join('')}</div>`:''}
  <h2 style="font-size:1.2rem;margin-bottom:10px">คำสั่งซื้อล่าสุด</h2>
  ${recent.length?orderTable(recent):'<div class="empty">ยังไม่มีคำสั่งซื้อ ลองเข้าสู่ระบบเป็นลูกค้าแล้วสั่งซื้อเพื่อทดสอบ</div>'}`;
}
function aProducts(){
  return `<div class="headrow"><p class="muted" style="margin:0">${db.products.length} รายการ · แถวสีแดงคือสต็อกน้อยกว่า ${LOW}</p><button class="btn" data-act="new-product">เพิ่มสินค้า</button></div>
  ${db.products.length?`<div class="tablewrap"><table><thead><tr><th>สินค้า</th><th>ประเภท</th><th>สายพันธุ์</th><th class="num">THC</th><th class="num">CBD</th><th class="num">ราคา</th><th class="num">สต็อก</th><th></th></tr></thead><tbody>
  ${db.products.map(p=>`<tr class="${p.stock_quantity<LOW?'lowrow':''}"><td><b>${esc(p.name)}</b><br><small class="muted">${esc(p.unit_size)}</small></td><td>${CAT[p.category]}</td><td>${STRAIN[p.strain_type]||'-'}</td>
    <td class="num">${p.thc_percent??'-'}${p.thc_percent!=null?'%':''}</td><td class="num">${p.cbd_percent??'-'}${p.cbd_percent!=null?'%':''}</td><td class="num">${baht(p.price)}</td>
    <td class="num">${p.stock_quantity<LOW?`<span class="tag low">${p.stock_quantity}</span>`:p.stock_quantity}</td>
    <td><div class="actions"><button class="btn ghost small" data-act="edit-product" data-id="${p.id}">แก้ไข</button><button class="btn danger small" data-act="del-product" data-id="${p.id}">ลบ</button></div></td></tr>`).join('')}
  </tbody></table></div>`:'<div class="empty">ยังไม่มีสินค้า กด “เพิ่มสินค้า” เพื่อเริ่ม</div>'}`;
}
function orderTable(list){
  return `<div class="tablewrap"><table><thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>วันที่</th><th>รายการ</th><th class="num">ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>
  ${list.map(o=>{const c=db.users.find(u=>u.id===o.user_id);return `<tr><td>#${o.id}</td><td>${esc(c?.name||'-')}<br><small class="muted" style="white-space:pre-line">${esc(o.shipping_address)}</small></td><td>${thDateTime(o.created_at)}</td><td>${itemsText(o.id)}</td><td class="num">${baht(o.total_amount)}</td>
  <td>${o.status==='Cancelled'?'<span class="status Cancelled">ยกเลิก</span>':`<select data-act="status" data-id="${o.id}" aria-label="สถานะคำสั่งซื้อ #${o.id}" style="padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface)">${Object.entries(STATUS).map(([k,l])=>`<option value="${k}" ${o.status===k?'selected':''}>${l}</option>`).join('')}</select>`}</td></tr>`}).join('')}
  </tbody></table></div>`;
}
function aOrders(){
  const list=[...db.orders].sort((a,b)=>b.id-a.id);
  return `<p class="muted">เปลี่ยนสถานะได้จากช่องเลือก หากยกเลิก ระบบจะคืนสต็อกสินค้าให้อัตโนมัติ</p>${list.length?orderTable(list):'<div class="empty">ยังไม่มีคำสั่งซื้อ</div>'}`;
}
function aArticles(){
  return `<div class="headrow"><p class="muted" style="margin:0">${db.articles.length} บทความ</p><button class="btn" data-act="new-article">เขียนบทความ</button></div>
  ${db.articles.length?`<div class="tablewrap"><table><thead><tr><th>หัวข้อ</th><th>หมวด</th><th>วันที่</th><th></th></tr></thead><tbody>
  ${db.articles.map(a=>`<tr><td><b>${esc(a.title)}</b></td><td>${TOPIC[a.topic]||esc(a.topic)}</td><td>${thDate(a.created_at)}</td>
  <td><div class="actions"><button class="btn ghost small" data-act="article" data-id="${a.id}">ดู</button><button class="btn ghost small" data-act="edit-article" data-id="${a.id}">แก้ไข</button><button class="btn danger small" data-act="del-article" data-id="${a.id}">ลบ</button></div></td></tr>`).join('')}
  </tbody></table></div>`:'<div class="empty">ยังไม่มีบทความ</div>'}`;
}
const opt=(obj,cur,extra='')=>extra+Object.entries(obj).map(([k,l])=>`<option value="${k}" ${cur===k?'selected':''}>${l}</option>`).join('');
function productForm(id){
  const p=db.products.find(x=>x.id===id)||{name:'',category:'flower',strain_type:'hybrid',thc_percent:'',cbd_percent:'',unit_size:'',price:'',stock_quantity:'',cover_image_url:''};
  openDlg(id?'แก้ไขสินค้า':'เพิ่มสินค้า',`<form class="form" data-form="product" data-id="${id||''}">
    <div class="field"><label for="pf_name">ชื่อสินค้า</label><input id="pf_name" name="name" required value="${esc(p.name)}"></div>
    <div class="row2"><div class="field"><label for="pf_cat">ประเภท</label><select id="pf_cat" name="category">${opt(CAT,p.category)}</select></div>
    <div class="field"><label for="pf_strain">สายพันธุ์</label><select id="pf_strain" name="strain_type">${opt(STRAIN,p.strain_type,`<option value="" ${!p.strain_type?'selected':''}>ไม่ระบุ</option>`)}</select></div></div>
    <div class="row2"><div class="field"><label for="pf_thc">THC (%)</label><input id="pf_thc" name="thc_percent" type="number" step="0.01" min="0" max="100" value="${p.thc_percent??''}"><span class="hint">เว้นว่างได้สำหรับอุปกรณ์</span></div>
    <div class="field"><label for="pf_cbd">CBD (%)</label><input id="pf_cbd" name="cbd_percent" type="number" step="0.01" min="0" max="100" value="${p.cbd_percent??''}"></div></div>
    <div class="row2"><div class="field"><label for="pf_unit">ขนาดบรรจุ</label><input id="pf_unit" name="unit_size" required placeholder="เช่น 1 กรัม, 10 มล." value="${esc(p.unit_size)}"></div>
    <div class="field"><label for="pf_price">ราคา (บาท)</label><input id="pf_price" name="price" type="number" min="0" step="1" required value="${p.price}"></div></div>
    <div class="field"><label for="pf_stock">จำนวนในสต็อก</label><input id="pf_stock" name="stock_quantity" type="number" min="0" step="1" required value="${p.stock_quantity}"></div>
    ${imgField(p.cover_image_url)}
    <p class="err" id="formErr" role="alert"></p>
    <div style="display:flex;gap:10px"><button class="btn" type="submit">${id?'บันทึกการแก้ไข':'เพิ่มสินค้า'}</button><button class="btn ghost" type="button" data-act="close-dlg">ยกเลิก</button></div></form>`);
}
function imgField(v){return `<div class="field"><label for="img_in">รูปปก (ไม่บังคับ)</label><input id="img_in" type="file" accept="image/*" data-img>
  <input type="hidden" name="cover_image_url" value="${esc(v||'')}"><span class="hint" id="imgHint">${v?'มีรูปอยู่แล้ว เลือกไฟล์ใหม่เพื่อแทนที่ · <button type="button" class="linkbtn" data-act="clear-img">ลบรูป</button>':'ถ้าไม่ใส่ จะใช้ภาพประกอบอัตโนมัติ'}</span></div>`}
function articleForm(id){
  const a=db.articles.find(x=>x.id===id)||{title:'',topic:'strains',content:'',cover_image_url:''};
  openDlg(id?'แก้ไขบทความ':'เขียนบทความ',`<form class="form" data-form="article" data-id="${id||''}">
    <div class="field"><label for="af_title">หัวข้อ</label><input id="af_title" name="title" required value="${esc(a.title)}"></div>
    <div class="field"><label for="af_topic">หมวด</label><select id="af_topic" name="topic">${opt(TOPIC,a.topic)}</select></div>
    <div class="field"><label for="af_content">เนื้อหา</label><textarea id="af_content" name="content" required style="min-height:220px">${esc(a.content)}</textarea>
      <span class="hint">ขึ้นบรรทัดว่างเพื่อแบ่งย่อหน้า ใช้ “## ” นำหน้าเพื่อทำหัวข้อย่อย และ “- ” นำหน้าเพื่อทำรายการ เนื้อหาควรเป็นกลาง ไม่โฆษณาสรรพคุณเกินจริง</span></div>
    ${imgField(a.cover_image_url)}
    <p class="err" id="formErr" role="alert"></p>
    <div style="display:flex;gap:10px"><button class="btn" type="submit">${id?'บันทึกการแก้ไข':'เผยแพร่บทความ'}</button><button class="btn ghost" type="button" data-act="close-dlg">ยกเลิก</button></div></form>`);
}
function saveProduct(f){
  const id=Number(f.dataset.id)||0;const num=v=>v===''?null:Number(v);
  const d={name:f.name.value.trim(),category:f.category.value,strain_type:f.strain_type.value,thc_percent:num(f.thc_percent.value),cbd_percent:num(f.cbd_percent.value),
    unit_size:f.unit_size.value.trim(),price:Number(f.price.value),stock_quantity:Math.floor(Number(f.stock_quantity.value)),cover_image_url:f.cover_image_url.value};
  if(!d.name||!d.unit_size||f.price.value===''||f.stock_quantity.value===''){$('#formErr').textContent='กรุณากรอกชื่อ ขนาดบรรจุ ราคา และสต็อกให้ครบ';return}
  if(d.price<0||d.stock_quantity<0){$('#formErr').textContent='ราคาและสต็อกต้องไม่ติดลบ';return}
  if(id)Object.assign(db.products.find(x=>x.id===id),d);else db.products.push({id:nextId('products'),...d});
  save();closeDlg();toast(id?'บันทึกสินค้าแล้ว':'เพิ่มสินค้าแล้ว');render();
}
function saveArticle(f){
  const id=Number(f.dataset.id)||0;
  const d={title:f.title.value.trim(),topic:f.topic.value,content:f.content.value.trim(),cover_image_url:f.cover_image_url.value};
  if(!d.title||!d.content){$('#formErr').textContent='กรุณากรอกหัวข้อและเนื้อหา';return}
  if(id)Object.assign(db.articles.find(x=>x.id===id),d);else db.articles.push({id:nextId('articles'),...d,created_at:nowISO()});
  save();closeDlg();toast(id?'บันทึกบทความแล้ว':'เผยแพร่บทความแล้ว');render();
}
function setStatus(id,st){
  const o=db.orders.find(x=>x.id===id);if(!o||o.status==='Cancelled')return;
  if(st==='Cancelled'){
    confirmDlg(`ยกเลิกคำสั่งซื้อ #${id}? ระบบจะคืนสต็อกสินค้าทั้งหมดในคำสั่งซื้อนี้ และเปลี่ยนกลับไม่ได้`,'ยกเลิกคำสั่งซื้อ',()=>{
      db.order_items.filter(i=>i.order_id===id).forEach(i=>{const p=db.products.find(x=>x.id===i.product_id);if(p)p.stock_quantity+=i.quantity});
      o.status='Cancelled';save();toast(`ยกเลิกคำสั่งซื้อ #${id} และคืนสต็อกแล้ว`);render();
    },()=>render());return;
  }
  o.status=st;save();toast(`คำสั่งซื้อ #${id}: ${STATUS[st]}`);render();
}

/* ============ dialog ============ */
let dlgYes=null,dlgNo=null;
function openDlg(title,html){$('#dlgTitle').textContent=title;$('#dlgBody').innerHTML=html;const d=$('#dlg');if(!d.open)d.showModal()}
function closeDlg(){const d=$('#dlg');if(d.open)d.close()}
$('#dlg').addEventListener('close',()=>{if(dlgNo){const n=dlgNo;dlgNo=null;dlgYes=null;n()}});
function confirmDlg(msg,yesLabel,yes,no){
  dlgYes=yes;dlgNo=no||null;
  openDlg('ยืนยันการทำรายการ',`<p>${esc(msg)}</p><div style="display:flex;gap:10px;margin-top:16px"><button class="btn danger" data-act="dlg-yes">${esc(yesLabel)}</button><button class="btn ghost" data-act="close-dlg">ไม่ใช่ตอนนี้</button></div>`);
}

/* ============ อีเวนต์ ============ */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t||t.tagName==='SELECT')return;
  const a=t.dataset.act,id=Number(t.dataset.id);
  switch(a){
    case 'go':closeDlg();go(t.dataset.view);break;
    case 'cat':S.cat=t.dataset.v;document.querySelectorAll('[data-act="cat"]').forEach(b=>b.setAttribute('aria-pressed',b===t));renderGrid();break;
    case 'strain':S.strain=t.dataset.v;document.querySelectorAll('[data-act="strain"]').forEach(b=>b.setAttribute('aria-pressed',b===t));renderGrid();break;
    case 'detail':showDetail(id);break;
    case 'add':addToCart(id);break;
    case 'article':closeDlg();go('article',{articleId:id});break;
    case 'qty':changeQty(id,Number(t.dataset.d));break;
    case 'remove':setCart(cart().filter(i=>i.product_id!==id));render();break;
    case 'checkout':if(!me()){S.authMsg='กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนสั่งซื้อ สินค้าในตะกร้ายังอยู่ครบ';go('account')}else go('checkout');break;
    case 'logout':drop(SESSION_KEY);toast('ออกจากระบบแล้ว');go('shop');break;
    case 'quick-admin':store(SESSION_KEY,1);toast('เข้าสู่ระบบในชื่อ ผู้ดูแลร้าน แล้ว');go('admin');break;
    case 'atab':S.adminTab=t.dataset.v;render();break;
    case 'new-product':productForm(0);break;
    case 'edit-product':productForm(id);break;
    case 'del-product':{const p=db.products.find(x=>x.id===id);confirmDlg(`ลบ “${p.name}” ออกจากร้าน? ประวัติคำสั่งซื้อเดิมยังอยู่ แต่จะแสดงชื่อสินค้าเป็น “สินค้าถูกลบ”`,'ลบสินค้า',()=>{db.products=db.products.filter(x=>x.id!==id);setCart(cart().filter(i=>i.product_id!==id));save();toast('ลบสินค้าแล้ว');render()});break}
    case 'new-article':articleForm(0);break;
    case 'edit-article':articleForm(id);break;
    case 'del-article':{const ar=db.articles.find(x=>x.id===id);confirmDlg(`ลบบทความ “${ar.title}”?`,'ลบบทความ',()=>{db.articles=db.articles.filter(x=>x.id!==id);save();toast('ลบบทความแล้ว');render()});break}
    case 'clear-img':{const f=t.closest('form');f.cover_image_url.value='';$('#imgHint').textContent='ลบรูปแล้ว จะใช้ภาพประกอบอัตโนมัติ';break}
    case 'dlg-yes':{const y=dlgYes;dlgYes=null;dlgNo=null;closeDlg();y&&y();break}
    case 'close-dlg':closeDlg();break;
    case 'reset':confirmDlg('รีเซ็ตข้อมูลทั้งหมดกลับเป็นข้อมูลตัวอย่าง? คำสั่งซื้อ บัญชีที่สมัคร และการแก้ไขทั้งหมดจะหายไป','รีเซ็ตข้อมูล',async()=>{db=await seed();save();setCart([]);drop(SESSION_KEY);toast('รีเซ็ตข้อมูลตัวอย่างแล้ว');go('shop')});break;
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches('select[data-act="status"]'))setStatus(Number(t.dataset.id),t.value);
  if(t.matches('input[data-img]')&&t.files[0]){
    const file=t.files[0],r=new FileReader();
    r.onload=()=>{const img=new Image();img.onload=()=>{const m=800,s=Math.min(1,m/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      t.closest('form').cover_image_url.value=c.toDataURL('image/jpeg',.8);$('#imgHint').textContent='อัปโหลดรูปแล้ว กดบันทึกเพื่อใช้รูปนี้'};img.onerror=()=>{$('#imgHint').textContent='เปิดไฟล์รูปนี้ไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG'};img.src=r.result};
    r.readAsDataURL(file);
  }
});
document.addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;renderGrid()}});
document.addEventListener('submit',e=>{
  const f=e.target;if(!f.dataset.form)return;e.preventDefault();
  ({login:doLogin,register:doRegister,order:placeOrder,product:saveProduct,article:saveArticle})[f.dataset.form](f);
});

/* ============ Age Gate ============ */
$('#gateForm').addEventListener('submit',e=>{
  e.preventDefault();const v=$('#gateDob').value,err=$('#gateErr');
  if(!v){err.textContent='กรุณาเลือกวันเกิด';return}
  const a=ageFrom(v);
  if(a<0||a>120){err.textContent='วันเกิดไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';return}
  if(a<20){err.textContent='ขออภัย เว็บไซต์นี้เปิดให้เฉพาะผู้ที่มีอายุ 20 ปีขึ้นไป';return}
  store(AGE_KEY,true,true);$('#gate').hidden=true;$('#app').focus();
});

/* ============ เริ่มต้น ============ */
(async()=>{
  db=load(DB_KEY);
  if(!db||!db.users){db=await seed();save()}
  const h=location.hash.slice(1);if(['shop','learn','cart','account','admin'].includes(h))S.view=h;
  render();
  if(!load(AGE_KEY,true)){$('#gate').hidden=false;$('#gateDob').focus()}
})();
