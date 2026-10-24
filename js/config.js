/* 사이트 설정 — 상담 챗봇 중계 서버 주소(worker/README.md 참고). 비워 두면 방문자 본인 키 입력 방식으로 동작합니다.
   API 키는 절대 이 파일에 넣지 마세요. 공개 저장소라 누구나 볼 수 있습니다. */
window.FORTUNE_CONFIG = { chatEndpoint: "", model: "claude-sonnet-5-5", maxTokens: 900, feedbackUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfXlre8_TN1aG8hTyk48EPvN2c1mW1M4abrpZ4cdjqMdnmOrA/viewform",
  feedbackEntries: { fb1: "564389816", fb2: "40237304", fb3: "1694935903", fb4: "1961927874", fb5: "1381722087", fb6: "79231016", fb7: "1470316318", ver: "758022022" } };
/* feedbackUrl: 구글 설문 폼(운명 연구소 시범 테스트 의견). feedbackEntries: 폼 문항 ID — 사이트 답변을 폼에 미리 채워 엽니다.
   폼 문항을 바꾸면 ID도 다시 확인하세요. 폼에서도 이름·생년월일은 묻지 마세요. */
