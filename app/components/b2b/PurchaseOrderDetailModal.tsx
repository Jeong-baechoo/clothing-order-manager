'use client';

// 발주 상세 모달 (specs/001-b2b-order-module). 주문내역에서 클릭 시 표시. 기존 데이터만 사용.
// admin=false(발주처): 접수/배송/도착 라벨 + 단가 숨김 / admin=true(관리자): 확정/출고/완료 + 단가 표시
import React from 'react';
import { purchaseOrderStatusMap, buyerOrderStatusMap, type PurchaseOrder, type PurchaseOrderStatus } from '../../models/orderTypes';

const STEP_KEYS: PurchaseOrderStatus[] = ['requested', 'confirmed', 'shipped', 'done'];
const spec = (size?: string, color?: string) => `${size ?? ''}${color ? ` / ${color}` : ''}`;

export default function PurchaseOrderDetailModal({ order, onClose, buyerName, admin = false }: {
    order: PurchaseOrder | null; onClose: () => void; buyerName?: string; admin?: boolean;
}) {
    if (!order) return null;
    const labelMap = admin ? purchaseOrderStatusMap : buyerOrderStatusMap;
    const canceled = order.status === 'canceled';
    const stepIdx = STEP_KEYS.indexOf(order.status);
    const items = order.items ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-500/60" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{order.poNo}</span>
                        {canceled
                            ? <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">취소</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">{labelMap[order.status]}</span>}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-5 space-y-4">
                    {/* 메타 */}
                    <div className="grid grid-cols-[5rem_1fr] gap-y-1.5 text-sm">
                        {buyerName && (<><span className="text-gray-500">발주처</span><span className="text-gray-900 dark:text-gray-100">{buyerName}</span></>)}
                        <span className="text-gray-500">주문일자</span><span className="text-gray-900 dark:text-gray-100">{order.createdAt?.slice(0, 10) ?? '-'}</span>
                        {order.confirmedAt && (<><span className="text-gray-500">접수일자</span><span className="text-gray-900 dark:text-gray-100">{order.confirmedAt.slice(0, 10)}</span></>)}
                        {order.note && (<><span className="text-gray-500">주문메모</span><span className="text-gray-900 dark:text-gray-100">{order.note}</span></>)}
                    </div>

                    {/* 진행상태 */}
                    {!canceled && (
                        <div className="flex items-center">
                            {STEP_KEYS.map((k, i) => (
                                <React.Fragment key={k}>
                                    <span className={`px-3 py-1 text-xs rounded ${i <= stepIdx ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>{labelMap[k]}</span>
                                    {i < STEP_KEYS.length - 1 && <span className="mx-1 text-gray-300">›</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* 품목 */}
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-2 w-10">No.</th><th>상품</th><th>규격</th>
                                <th className="text-center">수량</th>
                                {admin && <th className="text-right">단가</th>}
                                {admin && <th className="text-right">금액</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, i) => (
                                <tr key={it.id} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 text-gray-400">{i + 1}</td>
                                    <td className="text-gray-900 dark:text-gray-100">{it.productName}</td>
                                    <td className="text-gray-700 dark:text-gray-300">{spec(it.size, it.color)}</td>
                                    <td className="text-center text-gray-700 dark:text-gray-300">{it.quantity}</td>
                                    {admin && <td className="text-right text-gray-700 dark:text-gray-300">{it.unitPrice.toLocaleString()}</td>}
                                    {admin && <td className="text-right font-medium text-gray-900 dark:text-gray-100">{(it.unitPrice * it.quantity).toLocaleString()}</td>}
                                </tr>
                            ))}
                        </tbody>
                        {admin && (
                            <tfoot>
                                <tr className="font-semibold">
                                    <td colSpan={5} className="py-2 text-right text-gray-600 dark:text-gray-300">합계</td>
                                    <td className="text-right text-gray-900 dark:text-gray-100">{order.totalPrice.toLocaleString()}원</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
