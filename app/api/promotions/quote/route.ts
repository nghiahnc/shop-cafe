import { NextRequest,NextResponse } from 'next/server';
import { quoteOrder } from '@/modules/orders/service';
export async function POST(req:NextRequest){try{return NextResponse.json(await quoteOrder(await req.json()));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Không thể báo giá'},{status:400});}}
