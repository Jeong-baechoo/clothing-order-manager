'use client';

import { Order } from '../../models/orderTypes';

interface OrderExportProps {
    orders: Order[];
}

export default function OrderExport({ orders }: OrderExportProps) {
    // CSV 형식으로 주문 데이터 내보내기
    const exportToCSV = () => {
        // CSV 헤더
        const headers = [
            '주문 ID',
            '고객 이름',
            '전화번호',
            '배송 주소',
            '상품명',
            '수량',
            '사이즈',
            '색상',
            '가격',
            '소계',
            '총 금액',
            '상태',
            '주문일',
            '결제 방법'
        ];

        // 주문 데이터를 CSV 형식으로 변환
        const csvRows: string[][] = [];

        orders.forEach(order => {
            // 각 주문의 모든 상품에 대한 행 추가
            order.items.forEach((item, index) => {
                const row = [
                    order.id,
                    order.customerName,
                    order.phone,
                    order.address,
                    item.product,
                    (item.quantity === undefined ? '0' : item.quantity.toString()),
                    item.size,
                    item.color,
                    item.price.toString(),
                    (item.price * (item.quantity === undefined ? 0 : item.quantity)).toString(),
                    index === 0 ? order.totalPrice.toString() : '', // 첫 번째 항목에만 총 금액 표시
                    index === 0 ? getStatusText(order.status) : '', // 첫 번째 항목에만 상태 표시
                    index === 0 ? order.orderDate : '', // 첫 번째 항목에만 주문일 표시
                    index === 0 ? order.paymentMethod : '' // 첫 번째 항목에만 결제 방법 표시
                ];
                csvRows.push(row);
            });
        });

        // 헤더와 데이터를 합쳐서 CSV 문자열 생성
        const csvContent =
            [headers, ...csvRows]
                .map((row) => row.map(formatCSVCell).join(','))
                .join('\n');

        // 다운로드 링크 생성
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `의류주문데이터_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV 셀 형식화 (쉼표, 따옴표 등 처리)
    const formatCSVCell = (cell: string) => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
    };

    // 상태 텍스트 변환
    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return '대기중';
            case 'processing':
                return '처리중';
            case 'shipped':
                return '배송중';
            case 'delivered':
                return '배송완료';
            case 'cancelled':
                return '취소됨';
            default:
                return status;
        }
    };

    // PDF 형식으로 주문 데이터 내보내기 (실제 PDF 생성은 외부 라이브러리 필요)
    const exportToPDF = () => {
        alert('PDF 내보내기 기능은 추후 구현될 예정입니다.');
    };

    return (
        <div className="flex space-x-2">
            <button
                onClick={exportToCSV}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
                CSV 내보내기
            </button>
            <button
                onClick={exportToPDF}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
                PDF 내보내기
            </button>
        </div>
    );
}
