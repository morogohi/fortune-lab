/* 사이트 설정 — 상담 챗봇 중계 서버 주소(worker/README.md 참고). 비워 두면 방문자 본인 키 입력 방식으로 동작합니다.
   API 키는 절대 이 파일에 넣지 마세요. 공개 저장소라 누구나 볼 수 있습니다. */
window.FORTUNE_CONFIG = { chatEndpoint: "", model: "claude-sonnet-5-5", maxTokens: 900, feedbackUrl: "" };
/* feedbackUrl: 시범 테스트 설문 폼 주소(선택). 폼에서도 이름·생년월일은 묻지 마세요. */
