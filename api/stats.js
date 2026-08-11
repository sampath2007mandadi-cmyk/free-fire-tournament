import { db, json, requireAdmin, readBody } from "../lib/server.mjs";
export default async function handler(req,res){
 try{
  if(req.method==='GET'){
   const [teams,entries,paid,pending]=await Promise.all([db('teams?select=id'),db('tournament_entries?select=id'),db('tournament_entries?select=id&status=eq.PAID'),db('tournament_entries?select=id&status=eq.PENDING')]);
   return json(res,{success:true,stats:{total_registered_teams:teams.length,total_tournament_entries:entries.length,approved_entries:paid.length,pending_entries:pending.length}});
  }
  if(req.method!=='PUT') return json(res,{success:false,error:'Method not allowed.'},405);
  if(!requireAdmin(req,res)) return;
  const b=await readBody(req); const teamId=Number(b.team_id); if(!teamId) return json(res,{success:false,error:'Team ID is required.'},400);
  const updates={played:Math.max(0,Number(b.played)||0),kills:Math.max(0,Number(b.kills)||0),points:Math.max(0,Number(b.points)||0)};
  const rows=await db(`leaderboard?team_id=eq.${teamId}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(updates)});
  return json(res,{success:true,leaderboard:rows[0]});
 }catch(e){return json(res,{success:false,error:e.message||'Server error.'},e.status||500)}
}
