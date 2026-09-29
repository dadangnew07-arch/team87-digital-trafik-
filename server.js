import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new Database(process.env.DB_PATH || "traffic.db");

app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(morgan("tiny"));
app.use(express.static(path.join(__dirname,"public")));

db.exec(`
CREATE TABLE IF NOT EXISTS packages(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL, visits INTEGER NOT NULL, price INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders(
 id TEXT PRIMARY KEY, customer TEXT NOT NULL, email TEXT NOT NULL,
 target_url TEXT NOT NULL, package_id INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 visits_sent INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS clicks(
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL,
 ip_hash TEXT, ua TEXT, referer TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

if (db.prepare("SELECT COUNT(*) c FROM packages").get().c === 0) {
  const ins=db.prepare("INSERT INTO packages(name,visits,price) VALUES(?,?,?)");
  [["Starter",1000,25000],["Growth",5000,90000],["Pro",10000,150000]].forEach(x=>ins.run(...x));
}

app.get("/api/packages",(req,res)=>res.json(db.prepare("SELECT * FROM packages ORDER BY visits").all()));

app.post("/api/orders",(req,res)=>{
  const {customer,email,target_url,package_id}=req.body;
  const p=db.prepare("SELECT * FROM packages WHERE id=?").get(Number(package_id));
  if(!customer || !email || !target_url || !p) return res.status(400).json({error:"Data order belum lengkap"});
  try { new URL(target_url); } catch { return res.status(400).json({error:"URL tujuan tidak valid"}); }
  const id=crypto.randomBytes(5).toString("hex").toUpperCase();
  db.prepare("INSERT INTO orders(id,customer,email,target_url,package_id) VALUES(?,?,?,?,?)")
    .run(id,customer,email,target_url,p.id);
  res.json({id,message:"Order dibuat. Silakan hubungi admin untuk instruksi pembayaran."});
});

app.get("/api/orders/:id",(req,res)=>{
  const o=db.prepare(`
    SELECT o.*, p.name package_name,p.visits package_visits,p.price
    FROM orders o JOIN packages p ON p.id=o.package_id WHERE o.id=?`).get(req.params.id);
  if(!o) return res.status(404).json({error:"Order tidak ditemukan"});
  res.json(o);
});

/* Admin demo endpoint. Protect this endpoint before public production use. */
app.get("/api/admin/orders",(req,res)=>{
  if(req.get("x-admin-key") !== (process.env.ADMIN_KEY || "ubah-key-admin"))
    return res.status(401).json({error:"Unauthorized"});
  res.json(db.prepare(`
    SELECT o.*,p.name package_name,p.visits package_visits,p.price
    FROM orders o JOIN packages p ON p.id=o.package_id ORDER BY o.created_at DESC`).all());
});

app.post("/api/admin/orders/:id/status",(req,res)=>{
  if(req.get("x-admin-key") !== (process.env.ADMIN_KEY || "ubah-key-admin"))
    return res.status(401).json({error:"Unauthorized"});
  const {status}=req.body;
  if(!["pending","paid","running","completed","cancelled"].includes(status))
    return res.status(400).json({error:"Status tidak valid"});
  const info=db.prepare("UPDATE orders SET status=? WHERE id=?").run(status,req.params.id);
  res.json({ok:!!info.changes});
});

/* Tracking redirect. Only use with real, consented/legitimate traffic sources. */
app.get("/go/:id",(req,res)=>{
  const o=db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id);
  if(!o || !["paid","running"].includes(o.status)) return res.status(404).send("Campaign tidak aktif");
  if(o.visits_sent >= db.prepare("SELECT visits FROM packages WHERE id=?").get(o.package_id).visits)
    return res.status(410).send("Campaign selesai");

  const ip=String(req.ip||"");
  const hash=crypto.createHash("sha256").update(ip + (process.env.IP_SALT||"change-me")).digest("hex");
  db.prepare("INSERT INTO clicks(order_id,ip_hash,ua,referer) VALUES(?,?,?,?)")
    .run(o.id,hash,req.get("user-agent")||"",req.get("referer")||"");
  db.prepare("UPDATE orders SET visits_sent=visits_sent+1 WHERE id=?").run(o.id);
  res.redirect(o.target_url);
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Traffic Store running on ${port}`));