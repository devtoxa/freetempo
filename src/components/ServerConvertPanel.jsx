import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { useData } from '../stores/useData';

const STATUS_TEXT = {
    queued: '대기 중',
    processing: '변환 중',
    done: '완료',
    error: '오류',
    cancelled: '취소됨',
};

const TERMINAL_STATUSES = new Set(['done', 'error', 'cancelled']);

function stripExtension(filename) {
    return (filename || 'converted').replace(/\.[^.]+$/, '');
}

export default function ServerConvertPanel({ initialFile = null, onClose }) {
    const addLocalMidi = useData((state) => state.addLocalMidi);

    const [userName, setUserName] = useState('통합 페이지');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [file, setFile] = useState(initialFile);
    const [jobId, setJobId] = useState(null);
    const [job, setJob] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [playing, setPlaying] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!jobId) return undefined;

        let cancelled = false;
        let timer = null;

        const poll = async () => {
            try {
                const response = await fetch(`/flask/status/${jobId}`);
                if (!response.ok) {
                    throw new Error('변환 상태를 조회할 수 없습니다.');
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

    const handleFileChange = (event) => {
        setFile(event.target.files?.[0] ?? null);
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!youtubeUrl.trim() && !file) {
            setError('YouTube URL을 입력하거나 오디오 파일을 선택해 주세요.');
            return;
        }

        setSubmitting(true);
        setError('');
        setJob(null);
        setJobId(null);

        try {
            const formData = new FormData();
            formData.append('user_name', userName || '통합 페이지');
            if (file) {
                formData.append('file', file);
            } else {
                formData.append('youtube_url', youtubeUrl.trim());
            }

            const response = await fetch('/flask/convert', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || '변환 작업을 등록할 수 없습니다.');
            }

            setJobId(data.job_id);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePlay = async () => {
        if (!jobId) return;

        setPlaying(true);
        setError('');
        try {
            const response = await fetch(`/flask/download/${jobId}`);
            if (!response.ok) {
                throw new Error('변환된 MIDI를 내려받을 수 없습니다.');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            addLocalMidi({
                title: stripExtension(job?.download_name),
                artist: 'Flask 변환',
                url,
            });
            onClose?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setPlaying(false);
        }
    };

    const busy = job?.status === 'queued' || job?.status === 'processing';

    return (
        <Modal
            title="음원 → MIDI 변환"
            subtitle="Flask 변환 서버(:5000)에서 YouTube/오디오를 MIDI로 변환합니다."
            onClose={onClose}
        >
            <form className="panel-section" onSubmit={handleSubmit}>
                <div className="panel-grid">
                    <label className="panel-field">
                        요청자 이름
                        <input
                            type="text"
                            value={userName}
                            onChange={(event) => setUserName(event.target.value)}
                        />
                    </label>
                    <label className="panel-field">
                        YouTube URL (선택)
                        <input
                            type="text"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={youtubeUrl}
                            onChange={(event) => setYoutubeUrl(event.target.value)}
                            disabled={Boolean(file)}
                        />
                    </label>
                </div>

                <label className="panel-field">
                    오디오 파일 (선택, mp3/wav/ogg/flac/m4a/aac/webm)
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.wav,.ogg,.flac,.m4a,.aac,.webm"
                        onChange={handleFileChange}
                        disabled={Boolean(youtubeUrl.trim())}
                    />
                </label>

                {file && (
                    <div className="panel-meta">
                        선택된 파일: <b>{file.name}</b>
                        <button
                            type="button"
                            className="panel-btn small"
                            style={{ marginLeft: 8 }}
                            onClick={() => {
                                setFile(null);
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                            }}
                        >
                            제거
                        </button>
                    </div>
                )}

                <div className="panel-actions">
                    <button
                        type="submit"
                        className="panel-btn primary"
                        disabled={submitting || busy}
                    >
                        {submitting ? '등록 중...' : '변환 시작'}
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
                            {job.status === 'queued' && job.queue_position
                                ? ` · 대기 ${job.queue_position}번째`
                                : ''}
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
                                    href={`/flask/download/${jobId}`}
                                >
                                    MIDI 다운로드
                                </a>
                                <button
                                    type="button"
                                    className="panel-btn play"
                                    onClick={handlePlay}
                                    disabled={playing}
                                >
                                    {playing ? '불러오는 중...' : '바로 연주'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!job && (
                    <div className="panel-hint">
                        처음 변환은 basic-pitch 모델 로딩으로 다소 시간이 걸릴 수 있습니다.
                    </div>
                )}
            </form>
        </Modal>
    );
}
