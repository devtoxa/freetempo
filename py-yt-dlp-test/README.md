# py-yt-dlp-test

원본 PyQt5 데스크톱 YouTube 다운로더를 통합 FreeTempo 페이지에서 사용할 수 있도록
Flask 웹 다운로드 API로 리팩터링한 서비스입니다.

## 실행

```bash
pip install -r requirements.txt
python app.py
```

기본 포트는 `5001` 입니다. (`PORT` 또는 `YTDLP_PORT` 환경변수로 변경 가능)

## API

| Method | Path            | 설명 |
|--------|-----------------|------|
| POST   | `/download`     | `{ "url": "...", "format": "bestaudio/best" }` → `{ "job_id": "..." }` |
| GET    | `/status/<id>`  | 상태/진행률/로그 조회 |
| GET    | `/file/<id>`    | 완료된 파일 다운로드 |
| GET    | `/health`       | 헬스 체크 |

다운로드 파일은 `downloads/` 폴더에 저장됩니다.

## 원본

`desktop_main.py` 는 리팩터링 이전의 PyQt5 데스크톱 버전입니다.
