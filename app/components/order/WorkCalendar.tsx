'use client';

import React, { useMemo, useState } from 'react';
import { Order, getStatusColor, orderStatusMap } from '../../models/orderTypes';

interface WorkCalendarProps {
    orders: Order[];
    onSelectOrder: (order: Order) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// KST 기준 오늘 날짜 (YYYY-MM-DD)
const kstToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

const toKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// 주문의 작업수량 = 품목 수량 합계 (배송비 항목 제외)
const getWorkQuantity = (order: Order) =>
    order.items
        .filter(item => item.product !== '배송비')
        .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

export default function WorkCalendar({ orders, onSelectOrder }: WorkCalendarProps) {
    const today = kstToday();
    const [year, setYear] = useState(() => Number(today.slice(0, 4)));
    const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1); // 0-based

    // 작업일별 주문 묶음
    const ordersByDate = useMemo(() => {
        const map = new Map<string, Order[]>();
        for (const order of orders) {
            if (!order.workDate) continue;
            const key = order.workDate.slice(0, 10);
            const list = map.get(key);
            if (list) list.push(order);
            else map.set(key, [order]);
        }
        return map;
    }, [orders]);

    const unscheduledCount = useMemo(
        () => orders.filter(o => !o.workDate && o.status !== 'completed' && o.status !== 'hold').length,
        [orders]
    );

    // 일요일 시작 달력 칸 (앞뒤 빈칸 포함, 7의 배수)
    const cells = useMemo(() => {
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const result: (number | null)[] = Array(firstWeekday).fill(null);
        for (let d = 1; d <= daysInMonth; d++) result.push(d);
        while (result.length % 7 !== 0) result.push(null);
        return result;
    }, [year, month]);

    const monthTotal = useMemo(() => {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
        let total = 0;
        ordersByDate.forEach((list, key) => {
            if (key.startsWith(prefix)) total += list.reduce((s, o) => s + getWorkQuantity(o), 0);
        });
        return total;
    }, [ordersByDate, year, month]);

    const moveMonth = (delta: number) => {
        const d = new Date(year, month + delta, 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
    };

    const goToday = () => {
        setYear(Number(today.slice(0, 4)));
        setMonth(Number(today.slice(5, 7)) - 1);
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => moveMonth(-1)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        aria-label="이전 달"
                    >
                        ‹
                    </button>
                    <h2 className="text-lg font-bold min-w-[120px] text-center">
                        {year}년 {month + 1}월
                    </h2>
                    <button
                        onClick={() => moveMonth(1)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        aria-label="다음 달"
                    >
                        ›
                    </button>
                    <button
                        onClick={goToday}
                        className="ml-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        오늘
                    </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    {unscheduledCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                            작업일 미지정 진행 주문 {unscheduledCount}건
                        </span>
                    )}
                    <span>
                        이번 달 총 작업수량 <strong className="text-gray-900 dark:text-white">{monthTotal.toLocaleString()}장</strong>
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[840px]">
                    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        {WEEKDAYS.map((w, i) => (
                            <div
                                key={w}
                                className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-300'}`}
                            >
                                {w}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {cells.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} className="min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30" />;
                            }
                            const key = toKey(year, month, day);
                            const dayOrders = ordersByDate.get(key) || [];
                            const dayTotal = dayOrders.reduce((s, o) => s + getWorkQuantity(o), 0);
                            const weekday = idx % 7;
                            const isToday = key === today;
                            return (
                                <div
                                    key={key}
                                    className={`min-h-[120px] flex flex-col border-b border-r border-gray-100 dark:border-gray-700 p-1.5 ${isToday ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}
                                >
                                    <div className={`text-xs font-semibold mb-1 ${isToday
                                        ? 'text-indigo-600 dark:text-indigo-300'
                                        : weekday === 0 ? 'text-red-500' : weekday === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                        {day}
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        {dayOrders.map(order => (
                                            <button
                                                key={order.id}
                                                onClick={() => onSelectOrder(order)}
                                                title={`${order.id} · ${orderStatusMap[order.status]} · ${getWorkQuantity(order)}장`}
                                                className={`block w-full truncate text-left text-xs px-1.5 py-0.5 rounded hover:opacity-80 ${getStatusColor(order.status)}`}
                                            >
                                                {order.customerName}
                                            </button>
                                        ))}
                                    </div>
                                    {dayOrders.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-800 dark:text-gray-100">
                                            총 작업수량 : {dayTotal.toLocaleString()}장
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
