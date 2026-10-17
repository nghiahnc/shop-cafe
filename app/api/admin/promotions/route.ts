import { NextRequest,NextResponse } from 'next/server';
import { currentUser } from '@/modules/auth/session';
import { savePromotion } from '@/modules/promotions/service';
export async function POST(req:NextRequest){const u=await currentUser();if(u?.role!=='admin')return NextResponse.json({error:'Không có quyền'},{status:403});
  try{return NextResponse.json(await savePromotion(await req.json()));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dữ liệu không hợp lệ'},{status:400});}}
