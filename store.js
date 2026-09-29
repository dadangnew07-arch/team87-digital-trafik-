import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Isi dua nilai ini setelah membuat project Supabase. Jangan pernah menaruh service_role key di frontend.
const SUPABASE_URL = "ISI_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "ISI_SUPABASE_ANON_KEY";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("ISI_") && !SUPABASE_ANON_KEY.includes("ISI_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
let packages = [], selectedPackage = null;
$("year").textContent = new Date().getFullYear();
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3000)}
function rupiah(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n)}
function safeText(tag, text, className){const el=document.createElement(tag);el.textContent=text??"";if(className)el.className=className;return el}
async function loadCatalog(){
 const root=$("catalog");
 if(!supabase){$("catalogStatus").textContent="Belum dikonfigurasi";root.replaceChildren(safeText("div","Hubungkan Supabase terlebih dahulu. Lihat README.md untuk langkah pemasangan.","empty"));return}
 const {data,error}=await supabase.from("packages").select("id,name,description,price_idr,unit_label,min_quantity,max_quantity").eq("active",true).order("sort_order");
 if(error){$("catalogStatus").textContent="Gagal memuat";root.replaceChildren(safeText("div","Katalog belum tersedia. Pastikan tabel dan kebijakan database sudah dipasang.","empty"));return}
 packages=data||[];$("catalogStatus").textContent=`${packages.length} paket tersedia`;
 if(!packages.length){root.replaceChildren(safeText("div","Belum ada paket yang dipublikasikan. Admin dapat menambahkan paket setelah login.","empty"));return}
 root.replaceChildren();
 for(const p of packages){
  const card=document.createElement("article");card.className="card";
  card.append(safeText("div","↗","icon"),safeText("h3",p.name),safeText("div",p.description||"Layanan paid traffic TEAM87.","desc"));
  card.append(safeText("div",rupiah(p.price_idr),"price"));
  card.append(safeText("div",`per ${p.unit_label||"paket"} · min ${p.min_quantity} / maks ${p.max_quantity}`,"muted"));
  const btn=safeText("button","Pesan paket","btn primary");btn.type="button";btn.addEventListener("click",()=>selectPackage(p));card.append(btn);root.append(card);
 }
}
function selectPackage(p){selectedPackage=p;$("packageId").value=p.id;$("packageName").value=`${p.name} — ${rupiah(p.price_idr)} per ${p.unit_label||"paket"}`;$("quantity").min=p.min_quantity;$("quantity").max=p.max_quantity;$("quantity").value=p.min_quantity;$("checkoutSection").classList.remove("hidden");updateTotal();$("checkoutSection").scrollIntoView({behavior:"smooth"});}
function updateTotal(){if(!selectedPackage)return;const q=Number($("quantity").value||0);$("totalText").textContent=`Perkiraan total: ${rupiah(selectedPackage.price_idr*q)}. Total final divalidasi oleh server.`}
$("quantity").addEventListener("input",updateTotal);$("cancelCheckout").addEventListener("click",()=>{$("checkoutSection").classList.add("hidden");selectedPackage=null});
$("checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!supabase||!selectedPackage){toast("Konfigurasi belum selesai.");return}
 const btn=$("payButton");btn.disabled=true;btn.textContent="Menyiapkan pembayaran…";
 try{
  const payload={package_id:selectedPackage.id,target_url:$("targetUrl").value.trim(),customer_email:$("customerEmail").value.trim(),quantity:Number($("quantity").value),customer_note:$("customerNote").value.trim()};
  const {data,error}=await supabase.functions.invoke("create-payment",{body:payload});
  if(error)throw error;
  if(!data?.redirect_url)throw new Error(data?.error||"URL pembayaran tidak diterima.");
  window.location.href=data.redirect_url;
 }catch(err){toast(err.message||"Pembayaran gagal disiapkan.");btn.disabled=false;btn.textContent="Lanjut ke pembayaran"}
});
$("adminLink").addEventListener("click",()=>window.location.href="./admin.html");
loadCatalog();
