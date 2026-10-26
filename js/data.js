/* ============ ชั้นข้อมูลจำลอง (แทนฐานข้อมูล 5 ตาราง) ============ */
const DB_KEY='ckh_db_v1', CART_KEY='ckh_cart_v1', SESSION_KEY='ckh_session_v1', AGE_KEY='ckh_age_ok_v1';
const mem={};
function load(k,ss){try{const s=(ss?sessionStorage:localStorage).getItem(k);if(s!=null)return JSON.parse(s)}catch(e){}return mem[k]??null}
function store(k,v,ss){mem[k]=v;try{(ss?sessionStorage:localStorage).setItem(k,JSON.stringify(v))}catch(e){}}
function drop(k,ss){delete mem[k];try{(ss?sessionStorage:localStorage).removeItem(k)}catch(e){}}

async function hash(p){
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ckh:'+p));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){return 'plain:'+p}
}
const nowISO=()=>new Date().toISOString();
const nextId=t=>db[t].reduce((m,r)=>Math.max(m,r.id),0)+1;
function save(){store(DB_KEY,db)}

const ARTICLES_SEED=[
{id:1,title:'รู้จัก Indica, Sativa และ Hybrid',topic:'strains',cover_image_url:'',created_at:'2026-10-01T09:00:00.000Z',content:
`การแบ่งกัญชาเป็น Indica, Sativa และ Hybrid เป็นวิธีที่ร้านค้าใช้กันแพร่หลาย เพื่อบอกลักษณะของต้นและแนวโน้มของฤทธิ์อย่างคร่าว ๆ

## ลักษณะของแต่ละกลุ่ม
- Indica: ต้นเตี้ย ใบกว้าง มักถูกอธิบายว่าให้ความรู้สึกผ่อนคลาย
- Sativa: ต้นสูง ใบเรียวยาว มักถูกอธิบายว่าให้ความรู้สึกตื่นตัว
- Hybrid: ลูกผสมระหว่างสองกลุ่ม มีลักษณะผสมกันในสัดส่วนต่าง ๆ

## ข้อควรรู้
งานวิจัยปัจจุบันชี้ว่าชื่อกลุ่มบอกฤทธิ์ได้ไม่แม่นยำนัก เพราะกัญชาที่ปลูกกันทุกวันนี้ผสมข้ามกันมาหลายรุ่น สิ่งที่บอกได้ชัดกว่าคือสัดส่วนสาร THC และ CBD รวมถึงสารเทอร์ปีนในผลิตภัณฑ์นั้น ๆ ซึ่งร้านควรแสดงไว้ให้ชัดเจน

ผลที่แต่ละคนได้รับยังขึ้นกับร่างกาย สุขภาพ และยาที่ใช้อยู่ จึงไม่ควรเลือกจากชื่อสายพันธุ์เพียงอย่างเดียว`},
{id:2,title:'THC กับ CBD ต่างกันอย่างไร',topic:'compounds',cover_image_url:'',created_at:'2026-10-03T09:00:00.000Z',content:
`THC (Tetrahydrocannabinol) และ CBD (Cannabidiol) เป็นสารกลุ่มแคนนาบินอยด์ที่พบมากที่สุดในกัญชา

## THC
เป็นสารที่ออกฤทธิ์ต่อจิตประสาท ทำให้เกิดอาการมึนเมา การรับรู้เวลาและระยะทางเปลี่ยนไป และอาจทำให้ใจสั่นหรือวิตกกังวลในบางคน

## CBD
ไม่ทำให้มึนเมาแบบ THC มีการศึกษาทางการแพทย์ในบางโรค แต่หลายข้ออ้างยังต้องการหลักฐานเพิ่มเติม CBD อาจมีปฏิกิริยากับยาบางชนิด เช่น ยาต้านการแข็งตัวของเลือดและยากันชัก ผู้ที่ใช้ยาประจำจึงควรปรึกษาแพทย์หรือเภสัชกรก่อน

## การอ่านค่าบนฉลาก
ตัวเลข THC % และ CBD % บอกสัดส่วนของสารในผลิตภัณฑ์ ค่า THC ที่สูงขึ้นหมายถึงฤทธิ์ต่อจิตประสาทที่แรงขึ้น ผลิตภัณฑ์ที่ได้มาตรฐานควรมีผลตรวจวิเคราะห์จากห้องปฏิบัติการรองรับ`},
{id:3,title:'ข้อควรระวังและการใช้อย่างรับผิดชอบ',topic:'safety',cover_image_url:'',created_at:'2026-10-05T09:00:00.000Z',content:
`กัญชามีทั้งประโยชน์และความเสี่ยง การใช้อย่างรับผิดชอบเริ่มจากการรู้ว่าตัวเองอยู่ในกลุ่มที่ควรหลีกเลี่ยงหรือไม่

## กลุ่มที่ควรหลีกเลี่ยง
- ผู้ที่อายุต่ำกว่า 20 ปี
- หญิงตั้งครรภ์และหญิงให้นมบุตร
- ผู้มีประวัติโรคทางจิตเวช โรคหัวใจ หรือโรคหลอดเลือด
- ผู้ที่ใช้ยาประจำ ควรปรึกษาแพทย์หรือเภสัชกรก่อน

## ข้อควรระวัง
- ห้ามขับขี่ยานพาหนะหรือทำงานกับเครื่องจักรหลังใช้
- ไม่ควรใช้ร่วมกับแอลกอฮอล์หรือยาที่กดประสาท
- ผลิตภัณฑ์แบบรับประทานออกฤทธิ์ช้ากว่าแบบสูดดม จึงเสี่ยงต่อการใช้ซ้ำจนได้รับมากเกินไป
- เก็บให้พ้นมือเด็กและสัตว์เลี้ยง

## เมื่อไรควรขอความช่วยเหลือ
หากมีอาการใจสั่นรุนแรง เจ็บหน้าอก หวาดระแวง สับสน หรืออาเจียนไม่หยุด ให้โทรสายด่วนการแพทย์ฉุกเฉิน 1669 หรือไปโรงพยาบาลใกล้บ้าน

## กฎหมายเบื้องต้น
กฎหมายกัญชาในประเทศไทยเปลี่ยนแปลงบ่อย ทั้งเรื่องอายุผู้ซื้อ ใบสั่งจากแพทย์สำหรับช่อดอก ใบอนุญาตร้าน และข้อจำกัดการขายออนไลน์และการโฆษณา ควรตรวจสอบข้อกำหนดล่าสุดจากกระทรวงสาธารณสุขหรือ อย. ก่อนซื้อหรือใช้ทุกครั้ง`}
];

async function seed(){
  return {
    users:[
      {id:1,name:'ผู้ดูแลร้าน',email:'admin@demo.th',password:await hash('admin123'),role:'admin',address:'',date_of_birth:'1990-01-01',age_verified:true},
      {id:2,name:'ลูกค้าตัวอย่าง',email:'customer@demo.th',password:await hash('demo1234'),role:'customer',address:'99/1 ถ.สุขุมวิท ต.นาเกลือ อ.บางละมุง จ.ชลบุรี 20150',date_of_birth:'1998-05-12',age_verified:true}
    ],
    products:[
      {id:1,name:'Sunrise Haze',category:'flower',strain_type:'sativa',thc_percent:18,cbd_percent:0.5,unit_size:'1 กรัม',price:350,stock_quantity:12,cover_image_url:''},
      {id:2,name:'Midnight Plum',category:'flower',strain_type:'indica',thc_percent:20,cbd_percent:0.3,unit_size:'1 กรัม',price:380,stock_quantity:2,cover_image_url:''},
      {id:3,name:'Balance CBD Oil 10%',category:'oil',strain_type:'hybrid',thc_percent:0.2,cbd_percent:10,unit_size:'10 มล.',price:1290,stock_quantity:8,cover_image_url:''},
      {id:4,name:'คุกกี้สมุนไพร',category:'edible',strain_type:'hybrid',thc_percent:0.2,cbd_percent:1,unit_size:'1 ชิ้น',price:120,stock_quantity:20,cover_image_url:''},
      {id:5,name:'เครื่องบดอะลูมิเนียม',category:'accessory',strain_type:'',thc_percent:null,cbd_percent:null,unit_size:'1 ชิ้น',price:450,stock_quantity:5,cover_image_url:''}
    ],
    orders:[], order_items:[],
    articles:JSON.parse(JSON.stringify(ARTICLES_SEED))
  };
}
