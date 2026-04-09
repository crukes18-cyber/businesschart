// 파일 위치: pages/api/logs.js
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

    // Logs 시트 없으면 자동 생성
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    if (!sheetNames.includes("Logs")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: "Logs" } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: "Logs!A1:E1",
        valueInputOption: "RAW",
        requestBody: { values: [["날짜/시간", "아이디", "이름", "액션", "대상"]] }
      });
    }

    // GET - 최근 로그 100건
    if (req.method === "GET") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: "Logs!A2:E1000"
      });
      const rows = response.data.values || [];
      const logs = rows.reverse().slice(0, 100).map(r => ({
        timestamp: r[0], userId: r[1], userName: r[2], action: r[3], target: r[4]
      }));
      return res.status(200).json({ logs });
    }

    // POST - 로그 기록
    if (req.method === "POST") {
      const { userId, userName, action, target } = req.body;
      const timestamp = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: "Logs!A:E",
        valueInputOption: "RAW",
        requestBody: { values: [[timestamp, userId, userName, action, target]] }
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Logs API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
