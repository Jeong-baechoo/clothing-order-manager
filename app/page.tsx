import Link from "next/link";

export default function Home() {
  return (
      // CAELUM 투명 로고를 배경으로 사용
      <div
          className="min-h-screen bg-no-repeat bg-center relative bg-gray-50"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/images/caelum-logo-transparent.png')`,
            backgroundSize: '800px auto',
            backgroundPosition: 'center'
          }}
      >
        <div className="max-w-4xl mx-auto py-10 px-4">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">의류 주문 관리 시스템</h1>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-lg p-6 mb-8 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">시스템 개요</h2>
            <p className="mb-4">
              이 시스템은 의류 주문을 효율적으로 관리하기 위한 도구입니다. 주문 조회, 추가, 수정 및 삭제 기능을 제공합니다.
            </p>
            <div className="mt-6">
              <Link
                  href="/orders"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                주문 관리 페이지로 이동
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-3">빠른 주문 검색</h2>
              <p className="text-gray-600 dark:text-gray-300">
                주문 ID, 고객 이름 또는 상품으로 주문을 빠르게 찾을 수 있습니다.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-3">주문 상태 관리</h2>
              <p className="text-gray-600 dark:text-gray-300">
                주문 상태를 실시간으로 업데이트하고 관리할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
