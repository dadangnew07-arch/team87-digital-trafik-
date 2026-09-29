const rp=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
async function load(){const ps=await (await fetch("/api/packages")).json();document.querySelector("#packages").innerHTML=ps.map(p=>`
<div class="pkg"><h3>${p.name}</h3><div class="price">${rp(p.price)}</div><p>${p.visits.toLocaleString("id-ID")} kunjungan</p>
<button class="btn" onclick="pick(${p.id})">Pilih</button></div>`).join("");
document.querySelector("#package").innerHTML=ps.map(p=>`<option value="${p.id}">${p.name} — ${p.visits.toLocaleString("id-ID")} kunjungan — ${rp(p.price)}</option>`).join("")}
function pick(id){document.querySelector("#package").value=id;location.hash="order"}
document.querySelector("#form").onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();document.querySelector("#result").innerHTML=r.ok?`<b>Order ${j.id} berhasil dibuat.</b><br>Simpan ID ini dan hubungi admin untuk pembayaran.`:`<b>${j.error}</b>`}
async function checkOrder(){const id=document.querySelector("#oid").value.trim();const r=await fetch("/api/orders/"+encodeURIComponent(id));const j=await r.json();document.querySelector("#status").textContent=r.ok?JSON.stringify({order:j.id,status:j.status,target:j.target_url,package:j.package_name,visits:`${j.visits_sent}/${j.package_visits}`},null,2):j.error}
load();