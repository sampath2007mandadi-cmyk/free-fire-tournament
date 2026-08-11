import { db, hashPassword, json, readBody, createAdminToken } from "../../lib/server.mjs";
export default async function handler(req,res){
 if(req.method!=='POST') return json(res,{success:false,error:'Method not allowed.'},405);
 try{
  const {password}=await readBody(req); if(!password) return json(res,{success:false,error:'Password is required.'},400);
  const rows=await db('admin_settings?id=eq.1&select=password_hash');
  if(!rows.length) return json(res,{success:false,error:'Admin account is not configured. Run the Supabase setup SQL.'},500);
  if(hashPassword(password)!==rows[0].password_hash) return json(res,{success:false,error:'Incorrect admin password.'},401);
  return json(res,{success:true,token:createAdminToken()});
 }catch(e){return json(res,{success:false,error:e.message||'Login failed.'},e.status||500)}
}
