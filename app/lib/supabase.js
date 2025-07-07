'use client';

import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 API 키를 가져옵니다
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않은 경우 오류 메시지 표시
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL 또는 API 키가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

// 자동 타임스탬프 기능 비활성화 옵션 추가
export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-supabase-db-set-timestamps': 'false' },
  },
});

// 주문 관련 함수들
export async function getOrders(includeCompleted = false) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(
          id,
          name,
          default_price,
          wholesale_price
        )
      )
    `);

  // includeCompleted가 false인 경우 완료된 주문 제외
  if (!includeCompleted) {
    query = query.neq('status', 'completed');
  }

  const { data, error } = await query.order('order_date', { ascending: false });

  if (error) {
    console.error('주문 데이터 불러오기 오류:', error);
    return [];
  }

  // 각 주문의 items를 정렬
  const ordersWithSortedItems = (data || []).map(order => ({
    ...order,
    items: sortOrderItems(order.items || [])
  }));

  return ordersWithSortedItems;
}

// 주문 항목 정렬 함수
function sortOrderItems(items) {
  return [...items].sort((a, b) => {
    // 1. 상품명 비교 - 자연 정렬 (숫자가 포함된 경우 올바르게 정렬)
    const productNameA = a.product?.name || a.product_name || '';
    const productNameB = b.product?.name || b.product_name || '';
    const productCompare = productNameA.localeCompare(productNameB, 'ko', { numeric: true });
    if (productCompare !== 0) return productCompare;
    
    // 2. 색상 비교
    const colorCompare = (a.color || '').localeCompare(b.color || '', 'ko');
    if (colorCompare !== 0) return colorCompare;
    
    // 3. 사이즈 비교 - 사이즈 순서 정의
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const sizeIndexA = sizeOrder.indexOf(a.size || '');
    const sizeIndexB = sizeOrder.indexOf(b.size || '');
    
    // 정의된 사이즈가 아닌 경우 문자열 비교
    if (sizeIndexA === -1 && sizeIndexB === -1) {
      return (a.size || '').localeCompare(b.size || '', 'ko', { numeric: true });
    }
    if (sizeIndexA === -1) return 1;
    if (sizeIndexB === -1) return -1;
    
    return sizeIndexA - sizeIndexB;
  });
}

// 배송비 제품 관련 함수 제거 (더 이상 필요 없음)

export async function addOrder(order) {
  try {
    console.log('추가할 주문 데이터:', JSON.stringify(order));

    // 주문 데이터 추가 (shipping_fee 포함)
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
        total_price: order.totalPrice,
        shipping_fee: order.shippingFee || 0  // 배송비 필드 추가
      })
      .select()
      .single();

    if (orderError) {
      console.error('주문 추가 오류 상세:', JSON.stringify(orderError, null, 2));
      console.error('오류 메시지:', orderError.message);
      console.error('오류 코드:', orderError.code);
      return { success: false, error: orderError };
    }

    console.log('주문 추가 결과:', orderData);

    // 주문 항목 추가 (배송비 제외)
    if (order.items && order.items.length > 0) {
      const orderItems = order.items
        .filter(item => item.product !== '배송비')  // 배송비 항목 제외
        .map(item => ({
          order_id: orderData.id,
          product_id: item.productId || item.product, // 정규화된 product_id 사용
          quantity: item.quantity || 0,
          size: item.size || '',
          color: item.color || '',
          price: item.price || 0,
          small_printing_quantity: item.smallPrintingQuantity || 0,
          large_printing_quantity: item.largePrintingQuantity || 0,
          extra_large_printing_quantity: item.extraLargePrintingQuantity || 0,
          extra_large_printing_price: item.extraLargePrintingPrice || 0,
          design_work_quantity: item.designWorkQuantity || 0,
          design_work_price: item.designWorkPrice || 0,
          remarks: item.remarks || '-'
        }));

      console.log('추가할 주문 항목:', JSON.stringify(orderItems));

      const { data: insertData, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error('주문 항목 추가 오류 상세:', JSON.stringify(itemsError, null, 2));
        console.error('실패한 주문 항목 데이터:', JSON.stringify(orderItems, null, 2));
        return { success: false, error: itemsError };
      }

      console.log('주문 항목 추가 결과:', insertData);
    }

    return { success: true, data: orderData };
  } catch (error) {
    console.error('주문 추가 중 예외 발생:', error);
    return { success: false, error };
  }
}

export async function updateOrder(order) {
  try {
    console.log('업데이트할 주문 데이터:', JSON.stringify(order));

    // 기존 주문 데이터 조회
    const { data: existingOrder, error: getError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();

    if (getError) {
      console.error('주문 조회 오류:', getError);
      return { success: false, error: getError };
    }

    // 주문 데이터 업데이트 - 단순 update 사용
    try {
      const updateData = {
        customer_name: order.customerName,
        phone: order.phone,
        address: order.address,
        status: order.status,
        payment_method: order.paymentMethod,
        total_price: order.totalPrice,
        shipping_fee: order.shippingFee || 0,  // 배송비 필드 추가
        order_date: order.orderDate || existingOrder.order_date // 기존 날짜 유지
      };

      console.log('주문 업데이트 데이터:', updateData);

      // insert + onConflict 대신 단순 update 사용
      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (orderError) {
        console.error('주문 업데이트 오류 상세:', orderError);
        return { success: false, error: orderError };
      }

      console.log('주문 기본 정보 업데이트 성공');
    } catch (updateError) {
      console.error('주문 업데이트 중 예외 발생:', updateError);
      return { success: false, error: updateError };
    }

    // 기존 주문 항목 삭제
    try {
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.id);

      if (deleteError) {
        console.error('주문 항목 삭제 오류 상세:', deleteError);
        return { success: false, error: deleteError };
      }

      console.log('기존 주문 항목 삭제 성공');
    } catch (deleteError) {
      console.error('주문 항목 삭제 중 예외 발생:', deleteError);
      return { success: false, error: deleteError };
    }

    // 새 주문 항목 추가 (배송비 제외)
    if (order.items && order.items.length > 0) {
      try {
        const orderItems = order.items
          .filter(item => item.product !== '배송비')  // 배송비 항목 제외
          .map(item => ({
            order_id: order.id,
            product_id: item.productId || item.product, // 정규화된 product_id 사용
            quantity: item.quantity || 0,
            size: item.size || '',
            color: item.color || '',
            price: item.price || 0,
            small_printing_quantity: item.smallPrintingQuantity || 0,
            large_printing_quantity: item.largePrintingQuantity || 0,
            extra_large_printing_quantity: item.extraLargePrintingQuantity || 0,
            extra_large_printing_price: item.extraLargePrintingPrice || 0,
            design_work_quantity: item.designWorkQuantity || 0,
            design_work_price: item.designWorkPrice || 0,
            remarks: item.remarks || '-'
          }));

        console.log('추가할 주문 항목:', JSON.stringify(orderItems));

        // 주문 항목을 하나씩 추가 (대량 추가에서 오류 발생 시 개별 추가로 전환)
        try {
          // 먼저 한 번에 모든 항목 추가 시도
          const { error: bulkInsertError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (bulkInsertError) {
            console.error('일괄 항목 추가 오류:', bulkInsertError);

            // 오류 발생 시 항목을 하나씩 개별적으로 추가
            for (const item of orderItems) {
              const { error: singleInsertError } = await supabase
                .from('order_items')
                .insert(item);

              if (singleInsertError) {
                console.error('개별 항목 추가 오류:', singleInsertError);
                return { success: false, error: singleInsertError };
              }
            }
          }
        } catch (bulkError) {
          console.error('항목 추가 중 예외 발생:', bulkError);

          // 예외 발생 시 항목을 하나씩 개별적으로 추가
          for (const item of orderItems) {
            try {
              const { error: singleInsertError } = await supabase
                .from('order_items')
                .insert(item);

              if (singleInsertError) {
                console.error('개별 항목 추가 오류:', singleInsertError);
                return { success: false, error: singleInsertError };
              }
            } catch (singleError) {
              console.error('개별 항목 추가 중 예외 발생:', singleError);
              return { success: false, error: singleError };
            }
          }
        }

        console.log('모든 주문 항목 추가 성공');
      } catch (insertError) {
        console.error('주문 항목 추가 중 예외 발생:', insertError);
        return { success: false, error: insertError };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('주문 업데이트 중 예외 발생:', error);
    return { success: false, error };
  }
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

// 회사 관련 함수들
export async function getCompanies() {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        products (
          id,
          name,
          default_price,
          wholesale_price,
          company_id
        )
      `)
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('회사 목록 조회 실패:', error);
    return [];
  }
}

export async function addCompany(company) {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      id: company.id,
      name: company.name
    })
    .select()
    .single();

  if (error) {
    console.error('회사 추가 오류:', error);
    return null;
  }

  return data;
}

export async function updateCompany(companyId, companyData) {
  const { error } = await supabase
    .from('companies')
    .update({
      name: companyData.name
    })
    .eq('id', companyId);

  if (error) {
    console.error('회사 업데이트 오류:', error);
    return false;
  }

  return true;
}

export async function deleteCompany(companyId) {
  // 회사 삭제 전에 관련 제품들 삭제
  const { error: productsError } = await supabase
    .from('products')
    .delete()
    .eq('company_id', companyId);

  if (productsError) {
    console.error('회사 제품 삭제 오류:', productsError);
    return false;
  }

  // 회사 삭제
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (error) {
    console.error('회사 삭제 오류:', error);
    return false;
  }

  return true;
}

export async function addProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: product.id,
      name: product.name,
      default_price: product.defaultPrice,
      wholesale_price: product.wholesalePrice || 0,
      company_id: product.companyId
    })
    .select()
    .single();

  if (error) {
    console.error('제품 추가 오류:', error);
    return null;
  }

  return data;
}

export async function updateProduct(productId, productData) {
  const updateData = {};
  
  if (productData.name !== undefined) {
    updateData.name = productData.name;
  }
  if (productData.defaultPrice !== undefined) {
    updateData.default_price = productData.defaultPrice;
  }
  if (productData.wholesalePrice !== undefined) {
    updateData.wholesale_price = productData.wholesalePrice;
  }

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId);

  if (error) {
    console.error('제품 업데이트 오류:', error);
    return false;
  }

  return true;
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('제품 삭제 오류:', error);
    return false;
  }

  return true;
}

// 관련 링크 함수들
export async function getRelatedLinks() {
  const { data, error } = await supabase
    .from('related_links')
    .select('*')
    .order('id');

  if (error) {
    console.error('관련 링크 불러오기 오류:', error);
    return [];
  }

  return data || [];
}

export async function addRelatedLink(link) {
  const { data, error } = await supabase
    .from('related_links')
    .insert({
      title: link.title,
      url: link.url,
      description: link.description || ''
    })
    .select()
    .single();

  if (error) {
    console.error('관련 링크 추가 오류:', error);
    return null;
  }

  return data;
}

export async function deleteRelatedLink(linkId) {
  const { error } = await supabase
    .from('related_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    console.error('관련 링크 삭제 오류:', error);
    return false;
  }

  return true;
}

export async function getProducts(companyId = null) {
  try {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        default_price,
        wholesale_price,
        company_id,
        companies (
          name
        )
      `)
      .order('name');

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('상품 목록 조회 실패:', error);
    return { success: false, error };
  }
}
