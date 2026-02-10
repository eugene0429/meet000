# Vercel 배포 가이드

이 프로젝트(`meet000`)를 Vercel에 배포하는 두 가지 주요 방법을 안내해 드립니다. 가장 권장되는 방법은 **GitHub 연동**을 통한 자동 배포입니다.

## 1. GitHub 연동 배포 (권장)
GitHub에 코드가 push될 때마다 Vercel이 자동으로 빌드하고 배포합니다.

1.  **Vercel 로그인**: [vercel.com](https://vercel.com)에 접속하여 GitHub 계정으로 로그인합니다.
2.  **새 프로젝트 추가**: Dashboard에서 `+ New Project` 버튼을 클릭합니다.
3.  **저장소 선택**: `eugene0429/meet000` 저장소를 찾아 `Import` 버튼을 클릭합니다.
4.  **프로젝트 설정**:
    *   **Framework Preset**: Vite (자동 감지됨)
    *   **Root Directory**: `./`
5.  **환경 변수 설정 (중요)**:
    *   `Environment Variables` 섹션을 펼치고, 로컬 `.env` 파일에 있는 모든 변수(예: API URL, API Key 등)를 입력합니다.
6.  **배포**: `Deploy` 버튼을 클릭합니다.

---

## 2. Vercel CLI를 이용한 수동 배포
이미 터미널에서 `npx vercel dev`를 사용 중이시므로, CLI를 통해 즉시 배포할 수 있습니다.

1.  **배포 명령 실행**:
    ```bash
    npx vercel
    ```
    *   메시지에 따라 프로젝트 설정을 확인합니다 (대부분의 경우 Enter로 기본값 선택).
2.  **프로덕션 배포**:
    ```bash
    npx vercel --prod
    ```
    *   위 명령어를 실행하면 실제 서비스 주소(Production URL)가 생성됩니다.

---

## 💡 주요 참고 사항

### 환경 변수 (Environment Variables) - 꿀팁! 🍯
하나씩 등록할 필요 없이, 로컬의 `.env.local` 파일 내용을 통째로 복사해서 Vercel UI에 한 번에 등록할 수 있습니다.

1.  로컬 프로젝트의 `.env.local` 파일 내용을 모두 복사합니다.
2.  Vercel Dashboard의 **Settings > Environment Variables**로 이동합니다.
3.  **Key**를 입력하는 첫 번째 칸을 클릭한 다음, 그냥 붙여넣기(`Cmd+V`) 하세요.
4.  Vercel이 자동으로 줄 바꿈을 인식하여 모든 Key와 Value를 각각의 칸에 채워줍니다!
5.  `Save`를 누르면 한 번에 등록됩니다.

### vercel.json 설정
현재 프로젝트 루트에 `vercel.json` 파일이 포함되어 있어, 배포 시 Vercel이 이 설정(API 라우팅 등)을 자동으로 인식합니다.

### 빌드 오류 발생 시
로컬에서는 잘 되지만 Vercel에서 빌드 오류가 난다면, `package.json`의 `scripts` 내 `build` 명령어가 올바른지 확인해 보세요.
