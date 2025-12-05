# 외부 접근 설정 가이드

## 방법 1: Ngrok 사용 (추천 - 가장 빠름)

### 1단계: Ngrok 설치
1. https://ngrok.com/download 에서 Windows 버전 다운로드
2. 압축 해제 후 `ngrok.exe`를 PATH에 추가하거나 현재 폴더에 복사

### 2단계: Ngrok 인증 (최초 1회)
```bash
ngrok config add-authtoken <당신의_인증_토큰>
```
- 인증 토큰은 https://dashboard.ngrok.com/get-started/your-authtoken 에서 확인

### 3단계: 서버 실행
1. 백엔드 서버 실행 (포트 5000)
2. 프론트엔드 서버 실행 (포트 3000)

### 4단계: Ngrok 터널링 시작
방법 A: 배치 파일 사용
```bash
start_ngrok.bat
```

방법 B: 수동 실행
```bash
# 터미널 1: 백엔드 터널
ngrok http 5000

# 터미널 2: 프론트엔드 터널
ngrok http 3000
```

### 5단계: URL 공유
- 각 ngrok 창에서 생성된 URL 확인
  - 예: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`
- 백엔드 URL을 프론트엔드 코드에 반영 필요 (아래 참고)

### 6단계: 프론트엔드 접속
코드가 자동으로 URL 파라미터를 인식하므로, 다음과 같이 접속:

**방법 A: URL 파라미터 사용 (추천)**
```
https://your-frontend-ngrok-url.ngrok-free.app/charts.html?api=https://your-backend-ngrok-url.ngrok-free.app
```

**방법 B: 코드 직접 수정**
`frontend/charts.js`와 `frontend/app.js`에서:
```javascript
// 기존
const API_BASE_URL = 'http://localhost:5000/api';

// 변경 (ngrok 백엔드 URL로)
const API_BASE_URL = 'https://your-backend-ngrok-url.ngrok-free.app/api';
```

---

## 방법 2: 클라우드 배포 (장기적 솔루션)

### 옵션 A: Vercel (프론트엔드) + Railway/Render (백엔드)
- Vercel: 프론트엔드 정적 파일 호스팅
- Railway/Render: Flask 백엔드 호스팅

### 옵션 B: AWS/Azure/GCP
- EC2/App Service 등에 전체 스택 배포

---

## 방법 3: 포트 포워딩 (공용 IP 필요)
- 라우터에서 포트 3000, 5000 포워딩 설정
- 공용 IP 주소로 접근
- 보안 주의 필요

---

## 주의사항
- Ngrok 무료 버전은 세션당 2시간 제한
- Ngrok 무료 버전은 URL이 매번 변경됨
- 프로덕션 환경에서는 클라우드 배포 권장

