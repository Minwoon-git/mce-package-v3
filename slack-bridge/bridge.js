// MCE Slack 브릿지 — Slack 메시지를 받아 로컬 Claude Code(CLI)로 처리하고 결과를 회신한다.
// Socket Mode를 사용하므로 공개 IP·포트개방·터널이 필요 없다. 이 PC가 켜져 있기만 하면 된다.
require('dotenv').config();
const { App } = require('@slack/bolt');
const { spawn } = require('child_process');
const path = require('path');

// 프로젝트 루트 = 이 파일의 상위 폴더 (mce-campaign 스킬·sf-mce-mcp가 연결된 곳)
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Slack 스레드(thread_ts) → Claude Code session_id 매핑.
// 같은 스레드에서 다시 멘션하면 대화를 이어간다(=수동모드 질문/승인 흐름 처리).
const sessions = new Map();

// Slack 스레드(thread_ts) → 누적 사용량 { cost, turns }. "@봇 사용량" 으로 조회한다.
const usage = new Map();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// 헤드리스로 claude 실행. 프롬프트는 stdin으로 넘겨 셸 인용 문제를 피한다.
function runClaude(prompt, resumeId) {
  return new Promise((resolve, reject) => {
    // --dangerously-skip-permissions: 봇은 사람이 "허용"을 못 누르므로 자동 승인이 필요.
    //   (보안상 부담되면 .claude/settings.json 의 allowedTools 화이트리스트로 대체 가능)
    const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions'];
    if (resumeId) args.push('--resume', resumeId);

    const child = spawn('claude', args, { cwd: PROJECT_ROOT, shell: true });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(stderr || `claude 종료 코드 ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve({
          text: parsed.result ?? '(빈 응답)',
          sessionId: parsed.session_id,
          cost: parsed.total_cost_usd,
        });
      } catch {
        // JSON 파싱 실패 시 원문 그대로 반환
        resolve({ text: stdout || stderr || '(출력 없음)', sessionId: undefined });
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Markdown → Slack mrkdwn 변환.
//  Slack은 ① 마크다운 표(| ... |)를 못 그리고(파이프가 그대로 보임), ② 굵게는 **x**가 아니라 *x* 다.
//  → 표는 "후보별 목록" 형태로 풀고, **굵게**·### 헤딩을 Slack 문법으로 치환한다.
function toSlackMrkdwn(md) {
  const lines = md.split('\n');
  const out = [];
  const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l) => l.includes('-') && /^\s*\|?[\s:|-]+\|?\s*$/.test(l);
  const cells = (l) =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 표 블록 감지: 헤더행 + 구분행(---) 패턴
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const header = cells(line);
      i += 2; // 헤더 + 구분선 건너뜀
      let n = 0;
      while (i < lines.length && isRow(lines[i])) {
        const row = cells(lines[i]);
        n++;
        if (n > 1) out.push('──────────────────────────────'); // 후보 사이 구분선
        const title = (row[0] || `항목 ${n}`).replace(/\*\*/g, '');
        out.push(`*${title}*`);
        for (let c = 1; c < header.length; c++) {
          const v = (row[c] || '').trim();
          if (v) out.push(`   • ${header[c]}: ${v}`);
        }
        i++;
      }
      out.push(''); // 표 종료 후 빈 줄
      continue;
    }
    out.push(line);
    i++;
  }

  let s = out.join('\n');
  s = s.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/__(.+?)__/g, '*$1*'); // **굵게** → *굵게*
  s = s.replace(/^#{1,6}\s*(.+)$/gm, '*$1*'); // ### 헤딩 → *헤딩*
  // 마크다운 가로 구분선(---, ***, ___)은 Slack에서 안 그려지므로 유니코드 가로줄로 치환
  s = s.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '──────────────────────────────');
  s = s.replace(/\n{3,}/g, '\n\n'); // 과도한 빈 줄 정리
  return s;
}

// Slack 메시지 길이 한도에 맞춰 분할
function chunk(text, size = 3500) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

// 봇을 멘션하면 그 텍스트를 명령어로 처리
app.event('app_mention', async ({ event, client }) => {
  const prompt = event.text.replace(/<@[^>]+>/g, '').trim(); // 멘션 토큰 제거
  const threadTs = event.thread_ts || event.ts;
  if (!prompt) return;

  // "사용량" 조회 명령: 이 스레드에서 누적된 비용만 답하고 종료 (Claude 호출 안 함)
  if (/^사용량\b|^usage\b/i.test(prompt)) {
    const u = usage.get(threadTs);
    const text = u
      ? `📊 이 스레드 누적 사용량\n   • 처리한 요청: ${u.turns}회\n   • 누적 비용: $${u.cost.toFixed(4)}`
      : '📊 이 스레드에서 아직 처리한 요청이 없습니다.';
    await client.chat.postMessage({ channel: event.channel, thread_ts: threadTs, text });
    return;
  }

  const thinking = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: threadTs,
    text: '⏳ 처리 중…',
  });

  try {
    const resumeId = sessions.get(threadTs);
    const { text, sessionId, cost } = await runClaude(prompt, resumeId);
    if (sessionId) sessions.set(threadTs, sessionId); // 스레드별 세션 기억

    // 스레드별 누적 사용량 적립 (응답에는 표시하지 않고, "사용량" 명령으로만 조회)
    if (typeof cost === 'number') {
      const u = usage.get(threadTs) || { cost: 0, turns: 0 };
      u.cost += cost;
      u.turns += 1;
      usage.set(threadTs, u);
    }

    const parts = chunk(toSlackMrkdwn(text));
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: parts[0] });
    for (let i = 1; i < parts.length; i++) {
      await client.chat.postMessage({ channel: event.channel, thread_ts: threadTs, text: parts[i] });
    }
  } catch (err) {
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: `❌ 오류: ${err.message}`,
    });
  }
});

(async () => {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
    console.error('❌ .env 에 SLACK_BOT_TOKEN, SLACK_APP_TOKEN 을 먼저 채워주세요. (2번 가이드 참고)');
    process.exit(1);
  }
  await app.start();
  console.log('⚡ MCE Slack 브릿지 실행 중 (Socket Mode)');
  console.log('   프로젝트 루트:', PROJECT_ROOT);
  console.log('   채널에서 봇을 멘션해 보세요. 예) @MCE봇 이탈 고객 캠페인 만들어줘');
})();
