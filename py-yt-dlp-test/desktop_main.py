# pip install yt-dlp PyQt5
import os
import re
import sys
from PyQt5.QtCore import QObject, QThread, pyqtSignal
from PyQt5.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLineEdit,
    QMainWindow,
    QProgressBar,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)
import yt_dlp

ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")


def clean_text(text: str) -> str:
    # ANSI 색상 코드 및 불필요한 줄바꿈 정리
    text = ANSI_ESCAPE_RE.sub("", str(text))
    return text.strip()


# 1. yt-dlp 로그를 가로채는 커스텀 로거
class MyLogger(QObject):
    log_signal = pyqtSignal(str)

    def __init__(self, log_signal):
        super().__init__()
        self.log_signal = log_signal

    def debug(self, msg):
        cleaned = clean_text(msg)
        if not cleaned:
            return
        # 진행률 줄이 너무 자주 쏟아지는 것을 줄이려면 필요에 따라 필터링 가능
        if "[download]" in cleaned and "%" in cleaned:
            return
        self.log_signal.emit(cleaned)

    def warning(self, msg):
        cleaned = clean_text(msg)
        if cleaned:
            self.log_signal.emit(f"[WARNING] {cleaned}")

    def error(self, msg):
        cleaned = clean_text(msg)
        if cleaned:
            self.log_signal.emit(f"[ERROR] {cleaned}")


# 2. 다운로드 워커 스레드
class DownloadWorker(QThread):
    progress_signal = pyqtSignal(str)
    percent_signal = pyqtSignal(int)
    finished_signal = pyqtSignal(bool, str)

    def __init__(self, url: str):
        super().__init__()
        self.url = url

    def run(self):
        logger = MyLogger(self.progress_signal)

        def progress_hook(d):
            status = d.get("status")
            if status == "downloading":
                total = d.get("total_bytes") or d.get(
                    "total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes", 0)
                if total > 0:
                    percent = max(0, min(100, int((downloaded / total) * 100)))
                    self.percent_signal.emit(percent)
            elif status == "finished":
                self.percent_signal.emit(100)
                self.progress_signal.emit(
                    "[System] File download finished, finalizing...")

        downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
        os.makedirs(downloads_dir, exist_ok=True)

        ydl_opts = {
            "format": "bestvideo+bestaudio/best",
            "logger": logger,
            "progress_hooks": [progress_hook],
            "outtmpl": os.path.join(downloads_dir, "%(title)s.%(ext)s"),
            "noplaylist": True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([self.url])
            self.finished_signal.emit(True, "Download Completed Successfully!")
        except Exception as e:
            self.finished_signal.emit(False, clean_text(e))


# 3. 메인 GUI 윈도우
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.worker = None
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("yt-dlp PyQt5 Downloader")
        self.resize(600, 400)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)

        input_layout = QHBoxLayout()
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Paste video URL here...")
        self.url_input.returnPressed.connect(self.start_download)

        self.download_btn = QPushButton("Download")
        self.download_btn.clicked.connect(self.start_download)

        input_layout.addWidget(self.url_input)
        input_layout.addWidget(self.download_btn)
        layout.addLayout(input_layout)

        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        layout.addWidget(self.progress_bar)

        self.log_console = QTextEdit()
        self.log_console.setReadOnly(True)
        layout.addWidget(self.log_console)

    def start_download(self):
        url = self.url_input.text().strip()
        if not url:
            self.log_console.append("[System] Please enter a valid URL.")
            return

        if self.worker is not None and self.worker.isRunning():
            self.log_console.append(
                "[System] A download is already in progress.")
            return

        self.download_btn.setEnabled(False)
        self.progress_bar.setValue(0)
        self.log_console.append(f"[System] Starting download for: {url}")

        self.worker = DownloadWorker(url)
        self.worker.progress_signal.connect(self.update_log)
        self.worker.percent_signal.connect(self.update_progress_bar)
        self.worker.finished_signal.connect(self.download_finished)
        self.worker.finished.connect(self.cleanup_worker)
        self.worker.start()

    def update_log(self, text: str):
        self.log_console.append(text)
        self.log_console.ensureCursorVisible()

    def update_progress_bar(self, value: int):
        self.progress_bar.setValue(value)

    def download_finished(self, success: bool, message: str):
        self.download_btn.setEnabled(True)
        if success:
            self.log_console.append(f"\n[System Success] {message}")
        else:
            self.log_console.append(f"\n[System Error] {message}")

    def cleanup_worker(self):
        if self.worker is not None:
            self.worker.deleteLater()
            self.worker = None


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
