'use client';

import { useState, useEffect } from 'react';
import { getRelatedLinks, addRelatedLink, deleteRelatedLink } from '../../lib/supabase';

// 관련 링크 타입 정의
interface RelatedLink {
  id: number;
  title: string;
  url: string;
  description?: string;
}

export default function RelatedLinks() {
  const [links, setLinks] = useState<RelatedLink[]>([]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState<Partial<RelatedLink>>({
    title: '',
    url: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // 링크 데이터 불러오기
  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const linksData = await getRelatedLinks();
      setLinks(linksData);
    } catch (error) {
      console.error('링크 불러오기 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  // 새 링크 추가
  const handleAddLink = async () => {
    if (!newLink.title || !newLink.url) {
      alert('제목과 URL을 입력해주세요.');
      return;
    }

    try {
      const addedLink = await addRelatedLink(newLink);
      if (addedLink) {
        setLinks([...links, addedLink]);
        setNewLink({ title: '', url: '', description: '' });
        setIsAddingLink(false);
      }
    } catch (error) {
      console.error('링크 추가 오류:', error);
      alert('링크 추가 중 오류가 발생했습니다.');
    }
  };

  // 링크 삭제
  const handleDeleteLink = async (id: number) => {
    if (window.confirm('이 링크를 삭제하시겠습니까?')) {
      try {
        const success = await deleteRelatedLink(id);
        if (success) {
          setLinks(links.filter(link => link.id !== id));
        }
      } catch (error) {
        console.error('링크 삭제 오류:', error);
        alert('링크 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">관련 사이트</h3>
        <button
          onClick={() => setIsAddingLink(!isAddingLink)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {isAddingLink ? '취소' : '사이트 추가'}
        </button>
      </div>

      {isAddingLink && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              제목
            </label>
            <input
              type="text"
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              placeholder="사이트 이름"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL
            </label>
            <input
              type="url"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              placeholder="https://example.com"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명 (선택사항)
            </label>
            <input
              type="text"
              value={newLink.description || ''}
              onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              placeholder="사이트 설명"
            />
          </div>
          <button
            onClick={handleAddLink}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            추가
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-600 dark:text-gray-400">등록된 관련 사이트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative group"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-blue-600 dark:hover:text-blue-400"
              >
                <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-1">{link.title}</h4>
                {link.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{link.description}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{link.url}</p>
              </a>
              <button
                onClick={() => handleDeleteLink(link.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete link"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
