"""yt-dlp web download API.

Refactored from the original PyQt5 desktop app into a small Flask service so the
unified FreeTempo page can download YouTube audio over HTTP.

Endpoints:
    POST /download          { "url": "...", "format": "bestaudio/best" }
    GET  /status/<job_id>
    GET  /file/<job_id>
    GET  /health
"""

import os
import re
import threading
import time
import uuid
from pathlib import Path

import yt_dlp
from flask import Flask, jsonify, request, send_file

ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
DEFAULT_FORMAT = "bestaudio/best"
ALLOWED_FORMAT_PREFIXES = ("best", "bestaudio", "bestvideo", "audio", "m4a", "mp3", "webm")

BASE_DIR = Path(__file__).resolve().parent
DOWNLOADS_DIR = Path(os.environ.get("YTDLP_DOWNLOAD_DIR", BASE_DIR / "downloads")).resolve()
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

state_lock = threading.Lock()
jobs = {}
job_order = []


def clean_text(text: str) -> str:
    return ANSI_ESCAPE_RE.sub("", str(text)).strip()


def now_str() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def update_job(job_id: str, **fields):
    with state_lock:
        job = jobs.get(job_id)
        if job:
            job.update(fields)
            job["updated_at"] = now_str()


def get_status(job_id: str):
    with state_lock:
        job = jobs.get(job_id)
        return job["status"] if job else None


def append_log(job_id: str, message: str):
    cleaned = clean_text(message)
    if not cleaned:
        return
    with state_lock:
        job = jobs.get(job_id)
        if job:
            job["log"] += f"\n{cleaned}"
            job["updated_at"] = now_str()


class JobLogger:
    def __init__(self, job_id: str):
        self.job_id = job_id

    def debug(self, msg):
        cleaned = clean_text(msg)
        if not cleaned:
            return
        if "[download]" in cleaned and "%" in cleaned:
            return
        append_log(self.job_id, cleaned)

    def warning(self, msg):
        cleaned = clean_text(msg)
        if cleaned:
            append_log(self.job_id, f"[WARNING] {cleaned}")

    def error(self, msg):
        cleaned = clean_text(msg)
        if cleaned:
            append_log(self.job_id, f"[ERROR] {cleaned}")


def safe_format(value: str) -> str:
    candidate = (value or "").strip()
    if not candidate:
        return DEFAULT_FORMAT
    if not candidate.startswith(ALLOWED_FORMAT_PREFIXES):
        return DEFAULT_FORMAT
    return candidate


def run_download(job_id: str, url: str, requested_format: str):
    if get_status(job_id) == "cancelled":
        return

    update_job(job_id, status="downloading", progress=2)
    append_log(job_id, f"[System] 다운로드 시작: {url}")

    job_dir = DOWNLOADS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    last_percent = [-1]

    def progress_hook(d):
        if get_status(job_id) == "cancelled":
            raise yt_dlp.utils.DownloadError("사용자 요청으로 취소되었습니다.")

        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            if total > 0:
                percent = max(0, min(100, int(downloaded / total * 100)))
                update_job(job_id, progress=percent)
                if percent != last_percent[0] and percent % 10 == 0:
                    last_percent[0] = percent
                    append_log(job_id, f"[yt-dlp] 다운로드 진행률: {percent}%")
        elif d.get("status") == "finished":
            update_job(job_id, progress=98)
            append_log(job_id, "[yt-dlp] 다운로드 완료, 마무리 중...")

    ydl_opts = {
        "format": safe_format(requested_format),
        "logger": JobLogger(job_id),
        "progress_hooks": [progress_hook],
        "outtmpl": str(job_dir / "audio.%(ext)s"),
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = (info or {}).get("title") or "youtube_audio"

        files = [p for p in job_dir.iterdir() if p.is_file()]
        if not files:
            raise RuntimeError("다운로드된 파일을 찾을 수 없습니다.")
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        downloaded = files[0]

        update_job(
            job_id,
            status="done",
            progress=100,
            file_path=str(downloaded),
            download_name=f"{title}{downloaded.suffix}",
            title=title,
        )
        append_log(job_id, "[System Success] 다운로드가 완료되었습니다.")
    except Exception as exc:
        current = get_status(job_id)
        final_status = "cancelled" if current == "cancelled" else "error"
        update_job(job_id, status=final_status, error=clean_text(exc))
        append_log(job_id, f"[System Error] {clean_text(exc)}")


def build_job(job_id: str):
    with state_lock:
        job = jobs.get(job_id)
        if not job:
            return None
        return {
            "job_id": job["job_id"],
            "url": job["url"],
            "title": job["title"],
            "status": job["status"],
            "progress": job["progress"],
            "error": job["error"],
            "download_name": job["download_name"],
            "created_at": job["created_at"],
            "updated_at": job["updated_at"],
            "log": job["log"],
        }


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "yt-dlp", "jobs": len(job_order)})


@app.post("/download")
def download():
    payload = request.get_json(silent=True) or request.form or {}
    url = str(payload.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "올바른 http/https URL을 입력해 주세요."}), 400

    requested_format = str(payload.get("format") or DEFAULT_FORMAT)

    job_id = uuid.uuid4().hex
    created = now_str()
    with state_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "url": url,
            "title": url,
            "status": "queued",
            "progress": 0,
            "error": None,
            "download_name": None,
            "file_path": None,
            "created_at": created,
            "updated_at": created,
            "log": f"[System] 대기열에 등록됨: {url}",
        }
        job_order.append(job_id)

    threading.Thread(
        target=run_download,
        args=(job_id, url, requested_format),
        daemon=True,
    ).start()

    return jsonify({"job_id": job_id, "status": "queued"})


@app.get("/status/<job_id>")
def status(job_id: str):
    job = build_job(job_id)
    if job is None:
        return jsonify({"error": "작업을 찾을 수 없습니다."}), 404
    return jsonify(job)


@app.get("/file/<job_id>")
def file_download(job_id: str):
    with state_lock:
        job = jobs.get(job_id)
        if not job or job["status"] != "done" or not job["file_path"]:
            return jsonify({"error": "완료된 파일을 찾을 수 없습니다."}), 404
        file_path = job["file_path"]
        download_name = job["download_name"] or Path(file_path).name

    return send_file(
        file_path,
        as_attachment=True,
        download_name=download_name,
        mimetype="application/octet-stream",
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("YTDLP_PORT", 5001)))
    app.run(host="0.0.0.0", port=port, debug=False)
