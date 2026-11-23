import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useData } from '../stores/useData';

const PAGE_WINDOW = 5;

function pageNumbers(currentPage, totalPages) {
    if (totalPages <= 0) return [];
    const end = Math.min(totalPages, currentPage + PAGE_WINDOW);
    const start = Math.max(0, end - PAGE_WINDOW);
    return Array.from({ length: end - start }, (_, index) => start + index);
}

export default function MidiLibraryPanel({ onClose }) {
    const addLocalMidi = useData((state) => state.addLocalMidi);

    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(0);
    const [data, setData] = useState({
        content: [],
        page: 0,
        totalPages: 0,
        totalItems: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({
                    keyword,
                    page: String(page),
                });
                const response = await fetch(`/spring/api/midi?${params}`);
                if (!response.ok) {
                    throw new Error('MIDI 라이브러리를 불러올 수 없습니다.');
                }
                const result = await response.json();
                if (!cancelled) {
                    setData({
                        content: result.content ?? [],
                        page: result.page ?? 0,
                        totalPages: result.totalPages ?? 0,
                        totalItems: result.totalItems ?? 0,
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [keyword, page]);

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(0);
        setKeyword(searchInput.trim());
    };

    const handlePlay = async (item) => {
        setPlayingId(item.id);
        setError('');
        try {
            const response = await fetch(`/spring/api/midi/${item.id}/file`);
            if (!response.ok) {
                throw new Error('MIDI 파일을 불러올 수 없습니다.');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            addLocalMidi({
                title: item.title,
                artist: item.artist,
                url,
            });
            onClose?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setPlayingId(null);
        }
    };

    const pages = pageNumbers(data.page, data.totalPages);

    return (
        <Modal
            title="MIDI 라이브러리"
            subtitle="Spring 서버(:8000)에 등록된 MIDI를 검색하고 바로 연주합니다."
            onClose={onClose}
        >
            <div className="panel-section">
                <form className="panel-search" onSubmit={handleSearch}>
                    <input
                        type="search"
                        placeholder="제목 또는 아티스트 검색"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                    />
                    <button type="submit" className="panel-btn primary">
                        검색
                    </button>
                    {keyword && (
                        <button
                            type="button"
                            className="panel-btn"
                            onClick={() => {
                                setSearchInput('');
                                setKeyword('');
                                setPage(0);
                            }}
                        >
                            초기화
                        </button>
                    )}
                </form>

                <div className="panel-meta">
                    전체 <b>{data.totalItems}</b>개
                    {loading ? ' · 불러오는 중...' : ''}
                </div>

                {error && <div className="panel-error">{error}</div>}

                <div className="panel-list">
                    {!loading && data.content.length === 0 && (
                        <div className="panel-hint">
                            등록된 MIDI가 없거나 검색 결과가 없습니다.
                        </div>
                    )}
                    {data.content.map((item) => (
                        <div className="panel-list-item" key={item.id}>
                            <div className="panel-item-main">
                                <div className="panel-item-title">
                                    {item.title}
                                </div>
                                <div className="panel-item-meta">
                                    {item.artist} · {item.fileSizeText} ·
                                    다운로드 {item.downloadCount}회 ·{' '}
                                    {item.createdAtText}
                                </div>
                                <div className="panel-item-meta">
                                    {item.originalFilename}
                                </div>
                            </div>
                            <div className="panel-actions">
                                <button
                                    type="button"
                                    className="panel-btn play small"
                                    onClick={() => handlePlay(item)}
                                    disabled={playingId === item.id}
                                >
                                    {playingId === item.id
                                        ? '불러오는 중...'
                                        : '연주'}
                                </button>
                                <a
                                    className="panel-btn small"
                                    href={`/spring/midi/download/${item.id}`}
                                >
                                    다운로드
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {data.totalPages > 0 && (
                    <div className="panel-pagination">
                        <button
                            type="button"
                            className="panel-page-btn"
                            onClick={() => setPage(Math.max(data.page - 1, 0))}
                            disabled={data.page <= 0}
                        >
                            이전
                        </button>
                        {pages.map((num) => (
                            <button
                                type="button"
                                key={num}
                                className={`panel-page-btn${
                                    num === data.page ? ' active' : ''
                                }`}
                                onClick={() => setPage(num)}
                            >
                                {num + 1}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="panel-page-btn"
                            onClick={() =>
                                setPage(Math.min(data.page + 1, data.totalPages - 1))
                            }
                            disabled={data.page + 1 >= data.totalPages}
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
