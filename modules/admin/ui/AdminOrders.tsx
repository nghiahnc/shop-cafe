"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id:string; code:string; status:string; fulfillment_status:string; fulfillment_method:string;
  total_vnd:number; discount_vnd:number; placed_at:string; recipient_name:string|null;
  phone:string|null; address_line:string|null; city:string|null; provider:string;
  payment_status:string; customer:string;
};
const labels:Record<string,string> = {new:"Mới đặt",confirmed:"Đã xác nhận",preparing:"Đang pha chế",ready:"Sẵn sàng lấy",shipping:"Đang giao",completed:"Hoàn tất",cancelled:"Đã hủy"};
const money=(value:number)=>new Intl.NumberFormat("vi-VN").format(value)+" ₫";
const status=(order:Order)=>order.status==="cancelled"?"cancelled":order.fulfillment_status;
function nextOptions(order:Order) {
  if (["cancelled","needs_review"].includes(order.status)) return [];
  const sequence=order.fulfillment_method==="pickup"?["new","confirmed","preparing","ready","completed"]:["new","confirmed","preparing","shipping","completed"];
  const next=sequence[sequence.indexOf(order.fulfillment_status)+1];
  const options=next?[next]:[];
  if (["new","confirmed"].includes(order.fulfillment_status)&&order.status==="pending"&&["cod","pickup_cash"].includes(order.provider)) options.push("cancelled");
  return options.filter(option=>option!=="completed"||order.provider!=="stripe"||order.payment_status==="paid");
}
export default function AdminOrders({orders}:{orders:Order[]}) {
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const [page,setPage]=useState(1);
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const visible=orders.filter(order=>(filter==="all"||status(order)===filter)&&`${order.code} ${order.recipient_name??""} ${order.customer}`.toLowerCase().includes(query.toLowerCase()));
  const pages=Math.max(1,Math.ceil(visible.length/20));
  const current=Math.min(page,pages);
  async function update(id:string,next:string) {
    if (!next) return;
    setBusy(id);setMessage("");
    try {
      const response=await fetch(`/api/admin/orders/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fulfillmentStatus:next})});
      const result=await response.json();
      if (!response.ok) setMessage(result.error??"Không thể cập nhật đơn");
      else router.refresh();
    } catch { setMessage("Không thể kết nối server"); }
    finally { setBusy(""); }
  }
  return <div className="panel admin-orders">
    <div className="panel-head"><div><span className="eyebrow">{orders.length} ĐƠN</span><h3>Danh sách đơn hàng</h3></div></div>
    <div className="admin-order-filters">
      <input aria-label="Tìm mã đơn hoặc khách" placeholder="Tìm mã đơn, tên khách..." value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}}/>
      <select aria-label="Lọc trạng thái" value={filter} onChange={event=>{setFilter(event.target.value);setPage(1);}}><option value="all">Mọi trạng thái</option>{Object.entries(labels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select>
    </div>
    {message&&<p className="form-error" role="alert">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH / CÁCH NHẬN</th><th>NGÀY</th><th>TỔNG</th><th>THANH TOÁN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
      {visible.slice((current-1)*20,current*20).map(order=><tr key={order.id}>
        <td className="order-code">{order.code}</td>
        <td><strong>{order.recipient_name||order.customer}</strong><small>{order.fulfillment_method==="pickup"?"Tự lấy":[order.address_line,order.city].filter(Boolean).join(", ")||"Giao hàng"}<br/>{order.phone}</small></td>
        <td>{new Intl.DateTimeFormat("vi-VN").format(new Date(order.placed_at))}</td>
        <td className="money-cell">{money(order.total_vnd)}{order.discount_vnd>0&&<small>Giảm {money(order.discount_vnd)}</small>}</td>
        <td>{order.provider.toUpperCase()} · {order.payment_status}</td>
        <td><span className={`status status-${status(order)}`}>{labels[status(order)]}</span></td>
        <td><select aria-label={`Cập nhật đơn ${order.code}`} value="" disabled={busy===order.id||!nextOptions(order).length} onChange={event=>update(order.id,event.target.value)}><option value="">Chọn bước tiếp</option>{nextOptions(order).map(option=><option key={option} value={option}>{labels[option]}</option>)}</select></td>
      </tr>)}
    </tbody></table></div>
    <div className="admin-pagination"><span>Trang {current}/{pages} · {visible.length} đơn</span><button disabled={current<=1} onClick={()=>setPage(current-1)}>← Trước</button><button disabled={current>=pages} onClick={()=>setPage(current+1)}>Sau →</button></div>
  </div>;
}
