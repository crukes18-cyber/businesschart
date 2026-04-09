// 파일 위치: pages/api/users.js
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export default async function handler(req, res) {
  try {
    const { google } = await import("googleapis");
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Users 시트 없으면 자동 생성
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    if (!sheetNames.includes("Users")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: "Users" } } }] }
      });
      // 헤더 추가
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: "Users!A1:D1",
        valueInputOption: "RAW",
        requestBody: { values: [["userId", "name", "password", "createdAt"]] }
      });
    }

    // GET - 전체 유저 목록
    if (req.method === "GET") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: "Users!A2:D1000"
      });
      const rows = response.data.values || [];
      const users = rows.map(r => ({ userId: r[0], name: r[1], password: r[2], createdAt: r[3] }));
      return res.status(200).json({ users });
    }

    // POST - 회원가입
    if (req.method === "POST") {
      const { userId, name, password } = req.body;
      if (!userId || !name || !password) return res.status(400).json({ error: "필수 항목 누락" });

      // 중복 아이디 확인
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: "Users!A2:A1000"
      });
      const ids = (existing.data.values || []).map(r => r[0]);
      if (ids.includes(userId)) return res.status(409).json({ error: "이미 사용 중인 아이디예요." });

      const createdAt = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: "Users!A:D",
        valueInputOption: "RAW",
        requestBody: { values: [[userId, name, password, createdAt]] }
      });
      return res.status(200).json({ ok: true, user: { userId, name } });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Users API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
