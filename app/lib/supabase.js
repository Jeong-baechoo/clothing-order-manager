'use client';

import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 API 키를 가져옵니다
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않은 경우 오류 메시지 표시
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL 또는 API 키가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// 주문 관련 함수들
export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `);

  if (error) {
    console.error('주문 데이터 불러오기 오류:', error);
    return [];
  }

  return data || [];
}

export async function addOrder(order) {
  // 주문 데이터 추가
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      id: order.id,
      customer_name: order.customerName,
      phone: order.phone,
      address: order.address,
      status: order.status,
      order_date: order.orderDate,
      payment_method: order.paymentMethod,
      total_price: order.totalPrice
    })
    .select()
    .single();

  if (orderError) {
    console.error('주문 추가 오류:', orderError);
    return null;
  }

  // 주문 항목 추가
  if (order.items && order.items.length > 0) {
    const orderItems = order.items.map(item => ({
      order_id: orderData.id,
      product: item.product,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('주문 항목 추가 오류:', itemsError);
    }
  }

  return orderData;
}

export async function updateOrder(order) {
  // 주문 데이터 업데이트
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      customer_name: order.customerName,
      phone: order.phone,
      address: order.address,
      status: order.status,
      payment_method: order.paymentMethod,
      total_price: order.totalPrice
    })
    .eq('id', order.id);

  if (orderError) {
    console.error('주문 업데이트 오류:', orderError);
    return false;
  }

  // 기존 주문 항목 삭제
  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', order.id);

  if (deleteError) {
    console.error('주문 항목 삭제 오류:', deleteError);
    return false;
  }

  // 새 주문 항목 추가
  if (order.items && order.items.length > 0) {
    const orderItems = order.items.map(item => ({
      order_id: order.id,
      product: item.product,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('주문 항목 추가 오류:', itemsError);
      return false;
    }
  }

  return true;
}

export async function deleteOrder(orderId) {
  // 주문 항목 먼저 삭제 (외래 키 제약 조건 때문)
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);

  if (itemsError) {
    console.error('주문 항목 삭제 오류:', itemsError);
    return false;
  }

  // 주문 삭제
  const { error: orderError } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (orderError) {
    console.error('주문 삭제 오류:', orderError);
    return false;
  }

  return true;
}

export async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    console.error('주문 상태 업데이트 오류:', error);
    return false;
  }

  return true;
}
