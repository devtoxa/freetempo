import { useState } from 'react';
import AudioToMidiUploader from './AudioToMidiUploader';
import Info from './Info';
import MidiLibraryPanel from './MidiLibraryPanel';
import MidiSelector from './MidiSelector';
import ServerConvertPanel from './ServerConvertPanel';
import SoundFontSelector from './SoundFontSelector';
import TrackController from './TrackController';
import YtDlpPanel from './YtDlpPanel';

export default function TopMenu({ defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [activeModal, setActiveModal] = useState(null);
    const [pendingConvertFile, setPendingConvertFile] = useState(null);

    const closeModal = () => {
        setActiveModal(null);
        setPendingConvertFile(null);
    };

    return (
        <>
            <header className="top-menu-anchor" aria-label="연주 및 도구 메뉴">
                <button
                    type="button"
                    className="top-menu-toggle"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((prev) => !prev)}
                >
                    {isOpen ? '메뉴 닫기 ▲' : '메뉴 ▼'}
                </button>

                {isOpen && (
                    <div className="top-menu-panel">
                        <Info />
                        <div className="top-menu-selectors">
                            <MidiSelector />
                            <AudioToMidiUploader />
                            <SoundFontSelector />
                        </div>
                        <TrackController />
                        <div className="top-menu-actions">
                            <button
                                type="button"
                                className="menu-action-btn"
                                onClick={() => {
                                    setPendingConvertFile(null);
                                    setActiveModal('convert');
                                }}
                            >
                                음원 → MIDI 변환
                            </button>
                            <button
                                type="button"
                                className="menu-action-btn"
                                onClick={() => setActiveModal('library')}
                            >
                                MIDI 라이브러리
                            </button>
                            <button
                                type="button"
                                className="menu-action-btn"
                                onClick={() => setActiveModal('ytdl')}
                            >
                                YouTube 다운로드
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {activeModal === 'convert' && (
                <ServerConvertPanel
                    initialFile={pendingConvertFile}
                    onClose={closeModal}
                />
            )}

            {activeModal === 'library' && (
                <MidiLibraryPanel onClose={() => setActiveModal(null)} />
            )}

            {activeModal === 'ytdl' && (
                <YtDlpPanel
                    onClose={() => setActiveModal(null)}
                    onConvertFile={(file) => {
                        setPendingConvertFile(file);
                        setActiveModal('convert');
                    }}
                />
            )}
        </>
    );
}
