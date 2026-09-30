import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL="https://lcdhlakkgdnpahrftcli.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_i_YZ-tiXpvwwuUhHmi8Wpw_4TD1mXGu";

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("ISI_") &&
  !SUPABASE_ANON_KEY.includes("ISI_");

const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = id => document.getElementById(id);

function rupiah(n){
  return new Intl.NumberFormat("id-ID",{
    style:"currency",
    currency:"IDR",
    maximumFractionDigits:0
  }).format(n);
}

function el(tag,text){
  const x=document.createElement(tag);
  x.textContent=text??"";
  return x;
}

function msg(id,text){
  $(id).textContent=text;
}

async function init(){
  if(!sb){
    msg("loginMsg","SUPABASE belum terhubung.");
    return;
  }

  const {
    data:{session}
  } = await sb.auth.getSession();

  if(session){
    await showApp(session.user);
  }
}

async function showApp(user){
  const {
    data:admin,
    error
  } = await sb
    .from("admin_users")
    .select("user_id")
    .eq("user_id",user.id)
    .maybeSingle();

  if(error || !admin){
    await sb.auth.signOut();
    msg(
      "loginMsg",
      "Akun ini belum diberi akses admin. Tambahkan user ID melalui SQL sesuai README."
    );
    return;
  }

  $("loginCard").classList.add("hidden");
  $("adminApp").classList.remove("hidden");
  msg("who",user.email||"Admin");

  await loadAll();
}

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();

  if(!sb)return;

  msg("loginMsg","Memeriksa akun…");

  const {
    data,
    error
  } = await sb.auth.signInWithPassword({
    email:$("email").value.trim(),
    password:$("password").value
  });

  if(error){
    msg("loginMsg",error.message);
    return;
  }

  await showApp(data.user);
});

$("logout").addEventListener("click",async()=>{
  await sb.auth.signOut();
  location.reload();
});

async function loadPackages(){
  const {
    data,
    error
  } = await sb
    .from("packages")
    .select("*")
    .order("sort_order");

  if(error){
    $("packagesList").textContent=error.message;
    return;
  }

  const list=$("packagesList");
  list.replaceChildren();

  if(!data?.length){
    list.textContent="Belum ada paket.";
    return;
  }

  data.forEach(p=>{
    const row=el(
      "div",
      `${p.active?"●":"○"} ${p.name} — ${rupiah(p.price_idr)} / ${p.unit_label}`
    );

    row.style.cssText=
      "padding:10px 0;border-bottom:1px solid #29344b";

    list.append(row);
  });
}

async function loadOrders(){
  msg("ordersMsg","");

  const {
    data,
    error
  } = await sb
    .from("orders")
    .select(
      "id,created_at,customer_email,target_url,quantity,total_amount,payment_status,fulfillment_status,customer_note,packages(name)"
    )
    .order("created_at",{ascending:false})
    .limit(100);

  if(error){
    msg("ordersMsg",error.message);
    return;
  }

  const root=$("orders");
  root.replaceChildren();

  if(!data?.length){
    root.textContent="Belum ada pesanan pelanggan.";
    return;
  }

  const table=document.createElement("table");
  const thead=document.createElement("thead");
  const hr=document.createElement("tr");

  [
    "Dibuat",
    "Paket / pelanggan",
    "URL tujuan",
    "Jumlah",
    "Total",
    "Pembayaran",
    "Proses",
    "Aksi"
  ].forEach(t=>{
    hr.append(el("th",t));
  });

  thead.append(hr);
  table.append(thead);

  const body=document.createElement("tbody");

  data.forEach(o=>{
    const tr=document.createElement("tr");

    const vals=[
      new Date(o.created_at).toLocaleString("id-ID"),
      `${o.packages?.name||"Paket"}\n${o.customer_email}`,
      o.target_url,
      String(o.quantity),
      rupiah(o.total_amount),
      o.payment_status,
      o.fulfillment_status
    ];

    vals.forEach((v,i)=>{
      const td=el("td",v);

      if(i===2){
        td.style.cssText=
          "max-width:180px;overflow-wrap:anywhere";
      }

      tr.append(td);
    });

    const td=document.createElement("td");
    const select=document.createElement("select");

    [
      "pending",
      "in_progress",
      "completed",
      "rejected"
    ].forEach(s=>{
      const op=el("option",s);
      op.value=s;
      op.selected=o.fulfillment_status===s;
      select.append(op);
    });

    const btn=el("button","Simpan");
    btn.className="btn primary";
    btn.style.marginTop="5px";

    btn.addEventListener("click",async()=>{
      btn.disabled=true;

      const {error}=await sb
        .from("orders")
        .update({
          fulfillment_status:select.value
        })
        .eq("id",o.id);

      btn.disabled=false;

      if(error){
        msg("ordersMsg",error.message);
      }else{
        msg("ordersMsg","Status order diperbarui.");
        await loadOrders();
      }
    });

    td.append(
      select,
      document.createElement("br"),
      btn
    );

    tr.append(td);
    body.append(tr);
  });

  table.append(body);
  root.append(table);
}

async function loadAll(){
  await Promise.all([
    loadPackages(),
    loadOrders()
  ]);
}

$("refresh").addEventListener("click",loadAll);

$("packageForm").addEventListener("submit",async e=>{
  e.preventDefault();

  msg("packageMsg","Menyimpan…");

  const payload={
    name:$("pName").value.trim(),
    description:$("pDesc").value.trim(),
    price_idr:Number($("pPrice").value),
    unit_label:$("pUnit").value.trim(),
    min_quantity:Number($("pMin").value),
    max_quantity:Number($("pMax").value),
    sort_order:Number($("pSort").value),
    active:$("pActive").value==="true"
  };

  if(payload.max_quantity<payload.min_quantity){
    msg(
      "packageMsg",
      "Maksimum harus sama dengan atau lebih besar dari minimum."
    );
    return;
  }

  const {error}=await sb
    .from("packages")
    .insert(payload);

  if(error){
    msg("packageMsg",error.message);
    return;
  }

  $("packageForm").reset();
  $("pMin").value=1;
  $("pMax").value=10;
  $("pSort").value=0;

  msg("packageMsg","Paket berhasil disimpan.");

  await loadPackages();
});

init();