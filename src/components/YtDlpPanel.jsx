import { useEffect, useState } from 'react';
import Modal from './Modal';

const STATUS_TEXT = {
    queued: '대기 중',
    downloading: '다운로드 중',
    done: '완료',
    error: '오류',
    cancelled: '취소됨',
};

const TERMINAL_STATUSES = new Set(['done', 'error', 'cancelled']);

function alignmentExtension(filename) {
    const match = /(\.[A-Za-z0-9]+)$/.exec(filename || '');
    return match ? match[1] : '.webm';
}

export default function YtDlpPanel({ onClose, onConvertFile }) {
    const [url, setUrl] = useState('');
    const [jobId, setJobId] = useState(null);
    const [job, setJob] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [preparing, setPreparing] = useState(false);

    useEffect(() => {
        if (!jobId) return undefined;

        let cancelled = false;
        let timer = null;

        const poll = async () => {
            try {
                const response = await fetch(`/ytdl/status/${jobId}`);
                if (!response.ok) {
                    throw new Error('다운로드 상태를 조회할 수 없습니다.');
                }
                const data = await response.json();
                if (cancelled) return;

                setJob(data);
                if (!TERMINAL_STATUSES.has(data.status)) {
                    timer = setTimeout(poll, 1000);
                }
            } catch (err) {
                if (cancelled) return;
                setError(err.message);
                timer = setTimeout(poll, 2000);
            }
        };

        poll();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [jobId]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!url.trim()) {
            setError('YouTube URL을 입력해 주세요.');
            return;
        }

        setSubmitting(true);
        setError('');
        setJob(null);
        setJobId(null);

        try {
            const response = await fetch('/ytdl/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), format: 'bestaudio/best' }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || '다운로드를 시작할 수 없습니다.');
            }
            setJobId(data.job_id);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConvert = async () => {
        if (!jobId || !job) return;

        setPreparing(true);
        setError('');
        try {
            const response = await fetch(`/ytdl/file/${jobId}`);
            if (!response.ok) {
                throw new Error('다운로드한 파일을 불러올 수 없습니다.');
            }
            const blob = await response.blob();
            const extension = alignmentExtension(job.download_name);
            const file = new File([blob], `youtube-${jobId}${extension}`, {
                type: blob.type || 'application/octet-stream',
            });
            onConvertFile?.(file);
        } catch (err) {
            setError(err.message);
        } finally {
            setPreparing(false);
        }
    };

    const busy = job?.status === 'queued' || job?.status === 'downloading';

    return (
        <Modal
            title="YouTube 다운로드"
            subtitle="yt-dlp 서버(:5001)에서 오디오를 내려받고 MIDI 변환으로 이어갑니다."
            onClose={onClose}
        >
            <form className="panel-section" onSubmit={handleSubmit}>
                <label className="panel-field">
                    YouTube URL
                    <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                    />
                </label>

                <div className="panel-actions">
                    <button
                        type="submit"
                        className="panel-btn primary"
                        disabled={submitting || busy}
                    >
                        {submitting ? '시작 중...' : '다운로드 시작'}
                    </button>
                </div>

                {error && <div className="panel-error">{error}</div>}

                {job && (
                    <div className="panel-section" style={{ marginTop: 8 }}>
                        <div className="panel-meta">
                            <span className={`panel-badge ${job.status}`}>
                                {STATUS_TEXT[job.status] || job.status}
                            </span>{' '}
                            진행률: <b>{job.progress ?? 0}%</b>
                        </div>
                        <div className="panel-progress">
                            <div
                                className="panel-progress-bar"
                                style={{ width: `${job.progress ?? 0}%` }}
                            />
                        </div>
                        <pre className="panel-log">{job.log || ''}</pre>
                        {job.error && (
                            <div className="panel-error">{job.error}</div>
                        )}
                        {job.status === 'done' && (
                            <div className="panel-actions">
                                <a
                                    className="panel-btn"
                                    href={`/ytdl/file/${jobId}`}
                                >
                                    파일 저장
                                </a>
                                <button
                                    type="button"
                                    className="panel-btn play"
                                    onClick={handleConvert}
                                    disabled={preparing}
                                >
                                    {preparing
                                        ? '불러오는 중...'
                                        : 'MIDI로 변환'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!job && (
                    <div className="panel-hint">
                        오디오 형식(bestaudio)으로 내려받은 뒤 MIDI 변환 패널로
                        전달할 수 있습니다.
                    </div>
                )}
            </form>
        </Modal>
    );
}
