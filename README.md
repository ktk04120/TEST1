# 가설전기 안전점검 자료 제출 사이트 - 설정 가이드

## 구조
- `public/index.html`, `public/app.js` : 웹페이지 (Netlify에 올릴 정적 파일)
- `public/firebase-config.js` : 본인 Firebase 프로젝트 값으로 반드시 교체해야 함
- `firestore.rules`, `storage.rules` : Firebase 콘솔에 붙여넣을 보안 규칙

## 1단계. Firebase 프로젝트 만들기
1. https://console.firebase.google.com 접속 → 구글 계정으로 로그인
2. "프로젝트 추가" → 이름 입력 (예: temp-electric-check) → 생성

## 2단계. 로그인(Authentication) 설정
1. 왼쪽 메뉴 Build > Authentication > "시작하기"
2. Sign-in method 탭 → "이메일/비밀번호" 사용 설정
3. Users 탭 → "사용자 추가"로 계정 2개 생성
   - 사용자 계정 예: `site@company.com` / 비밀번호 (현장 전체 공유)
   - 관리자 계정 예: `admin@company.com` / 비밀번호 (본사 담당자용)
4. 각 계정을 만들면 UID가 생성됩니다 (Users 목록에서 확인 가능). 다음 단계에서 이 UID가 필요합니다.

## 3단계. Firestore(데이터베이스) 설정
1. 왼쪽 메뉴 Build > Firestore Database > "데이터베이스 만들기" → 프로덕션 모드 → 리전은 asia-northeast3(서울) 권장
2. `users` 컬렉션을 만들고, 2단계에서 만든 각 계정의 UID로 문서를 만듭니다.
   - 문서 ID: 사용자 계정의 UID → 필드: `role` = `"user"` (문자열)
   - 문서 ID: 관리자 계정의 UID → 필드: `role` = `"admin"` (문자열)
3. 왼쪽 메뉴 Firestore Database > 규칙(Rules) 탭 → 이 프로젝트의 `firestore.rules` 파일 내용을 그대로 붙여넣고 "게시"

## 4단계. Storage(파일 저장소) 설정
1. 왼쪽 메뉴 Build > Storage > "시작하기" (기본 설정으로 진행)
2. Storage > 규칙(Rules) 탭 → 이 프로젝트의 `storage.rules` 파일 내용을 그대로 붙여넣고 "게시"

## 5단계. 웹페이지에 Firebase 연결하기
1. Firebase 콘솔 좌측 상단 톱니바퀴 → "프로젝트 설정"
2. 아래로 스크롤 → "내 앱" > 웹 아이콘(</>) 클릭 → 앱 등록 (닉네임 아무거나)
3. 화면에 나오는 `firebaseConfig` 값을 복사
4. `public/firebase-config.js` 파일을 열어서, 예시 값들을 방금 복사한 실제 값으로 교체

## 6단계. Netlify에 배포하기
1. https://netlify.com 가입 (GitHub 계정으로 가입 가능)
2. "Add new site" → "Deploy manually" 선택 시, `public` 폴더를 그대로 화면에 드래그 앤 드롭하면 바로 배포됨
   (또는 GitHub 저장소에 올린 뒤 "Import from Git"으로 연결해도 됨 — 이 경우 Publish directory를 `public`으로 지정)
3. 배포가 끝나면 `https://프로젝트명.netlify.app` 형태의 주소가 생성됩니다. 이 URL을 현장직원/본사에 전파하면 됩니다.

## 사용 방법
- 현장 직원: 사용자 계정으로 로그인 → 현장명, 점검일자 입력 → 사진/PDF 선택 → 제출
- 본사 담당자: 관리자 계정으로 로그인 → 현장별로 제출된 전체 목록과 첨부파일을 조회

## 나중에 계정을 더 추가하고 싶다면
Authentication에서 계정을 추가로 만들고, Firestore `users` 컬렉션에 같은 방식으로 role을 지정하면 됩니다.
(예: 현장마다 별도 계정을 쓰고 싶어지면, 각 계정에 role: "user"를 부여하고 로그인 정보만 현장별로 다르게 배포하면 됩니다.)

## 비용 관련
소규모 사용(하루 몇 건, 파일 몇 개)이라면 Firebase의 Spark(무료) 플랜 한도 안에서 충분히 운영 가능합니다.
사용량이 늘어나면 Blaze(종량제) 플랜으로 전환해야 하며, 실제 사용량에 따라 소액의 비용이 발생할 수 있습니다.
