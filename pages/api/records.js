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

    if (req.method === "GET") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Data!A1",
      });
      const raw = response.data.values?.[0]?.[0];
      return res.status(200).json({ records: raw ? JSON.parse(raw) : [] });
    }

    if (req.method === "POST") {
      const records = req.body?.records ?? [];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Data!A1",
        valueInputOption: "RAW",
        requestBody: { values: [[JSON.stringify(records)]] },
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
