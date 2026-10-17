import { NextRequest,NextResponse } from 'next/server';
import { currentUser } from '@/modules/auth/session';
import { savePromotion,disablePromotion } from '@/modules/promotions/service';
type C={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:C){const u=await currentUser();if(u?.role!=='admin')return NextResponse.json({error:'Không có quyền'},{status:403});
  try{return NextResponse.json(await savePromotion(await req.json(),(await ctx.params).id));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dữ liệu không hợp lệ'},{status:400});}}
export async function DELETE(_req:NextRequest,ctx:C){const u=await currentUser();if(u?.role!=='admin')return NextResponse.json({error:'Không có quyền'},{status:403});
  try{await disablePromotion((await ctx.params).id);return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Không thể tắt'},{status:400});}}
