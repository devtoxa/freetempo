# FreeTempo 통합 페이지

피아노롤 연주기 + 음원/YouTube → MIDI 변환 + MIDI 라이브러리를 하나의 페이지로 통합한 프로젝트입니다.

```text
freetempo/
├─ src/                 # React 연주기 + 통합 패널 (project-freetempo2 기반)
├─ public/              # 정적 자원 (model은 빌드 시 생성)
├─ server.js            # 프로덕션 게이트웨이 (정적 서빙 + 백엔드 프록시)
├─ midi-server/         # Spring Boot MIDI 라이브러리 (:8000)
└─ py-yt-dlp-test/      # yt-dlp 웹 다운로드 API (:5001)
```

음원 → MIDI 변환은 `flask-yt-to-midi`(:5000)를 그대로 외부 서비스로 사용합니다.

## 구성 요소 / 포트

| 서비스 | 포트 | 설명 |
|--------|------|------|
| 프론트엔드 (Vite dev) | 5173 | `npm run dev` |
| 게이트웨이 (Express) | 3000 | `npm run build` 후 `npm start` |
| flask-yt-to-midi | 5000 | 음원/YouTube → MIDI 변환 (별도 실행) |
| midi-server (Spring) | 8000 | MIDI 라이브러리, MySQL 필요 |
| py-yt-dlp-test (Flask) | 5001 | YouTube 오디오 다운로드 |

프론트엔드는 `/flask`, `/spring`, `/ytdl` 프리픽스로 각 백엔드를 same-origin 프록시하므로
CORS 설정이 필요 없습니다. 대상 주소는 환경변수로 바꿀 수 있습니다.

- `FLASK_ORIGIN` (기본 `http://localhost:5000`)
- `SPRING_ORIGIN` (기본 `http://localhost:8000`)
- `YTDL_ORIGIN` (기본 `http://localhost:5001`)
- `PORT` (게이트웨이 포트, 기본 3000)

## 실행

### 1. 프론트엔드

```bash
npm install
npm run dev        # 개발 서버 (5173)
# 또는
npm run build
npm start          # 게이트웨이 (3000)
```

`npm install` 후 `copy-model` 스크립트가 basic-pitch 모델을 `public/model`로 복사합니다.

### 2. 변환 서버 (flask-yt-to-midi)

```bash
cd ../flask-yt-to-midi
pip install flask basic-pitch yt-dlp
python main.py     # :5000
```

### 3. MIDI 라이브러리 (midi-server)

MySQL(`localhost:3306`, `root/root`, db `freetempo`)가 필요합니다.

```bash
cd midi-server
gradlew.bat bootRun     # :8000
```

읽기 전용 JSON API가 추가되었습니다.

- `GET /api/midi?keyword=&page=`
- `GET /api/midi/{id}/file`

### 4. YouTube 다운로드 (py-yt-dlp-test)

```bash
cd py-yt-dlp-test
pip install -r requirements.txt
python app.py          # :5001
```

## 사용 흐름

1. 상단 메뉴 → **음원 → MIDI 변환**: YouTube URL 또는 오디오 파일로 변환 후 바로 연주
2. 상단 메뉴 → **MIDI 라이브러리**: 서버에 등록된 MIDI 검색 후 바로 연주
3. 상단 메뉴 → **YouTube 다운로드**: 오디오 다운로드 후 "MIDI로 변환"으로 이어가기
