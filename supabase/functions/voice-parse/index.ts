// Edge Function: voice-parse
// Nhận text đã ghi âm + danh mục hiện có của user, gọi Gemini để parse thành
// dữ liệu thu/chi có cấu trúc. GEMINI_API_KEY chỉ tồn tại ở server (secret),
// không bao giờ lộ ra client.

import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const GEMINI_MODEL = "gemini-2.0-flash"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { text, loaiChi = [], nguonTien = [], loaiThu = [] } = await req.json()

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Thiếu trường 'text'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server chưa cấu hình GEMINI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const prompt = `Bạn là bộ phân tích câu nói tiếng Việt thành dữ liệu thu/chi cho app sổ thu chi cá nhân.

Danh sách loại chi hợp lệ: ${JSON.stringify(loaiChi)}
Danh sách loại thu hợp lệ: ${JSON.stringify(loaiThu)}
Danh sách nguồn tiền hợp lệ: ${JSON.stringify(nguonTien)}

Câu nói của người dùng: "${text}"

Hãy phân tích và trả về DUY NHẤT một JSON object theo đúng schema sau, không thêm chữ nào khác:
{
  "loai": "chi" | "thu",
  "so_tien": number,
  "mo_ta": string,
  "nguon_tien": string,
  "ghi_chu": string
}

Quy tắc:
- "mo_ta" và "nguon_tien" PHẢI chọn từ đúng danh sách hợp lệ ở trên nếu có mục khớp nghĩa; nếu không có mục nào khớp, để chuỗi rỗng "".
- "so_tien" là số nguyên VNĐ, không có đơn vị, không có dấu phẩy/chấm phân cách (ví dụ "50 nghìn" -> 50000).
- Nếu không chắc chắn về một trường, để giá trị rỗng/0, KHÔNG bịa ra dữ liệu.
- "ghi_chu" là phần thông tin thừa không khớp vào các trường trên (nếu có).`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      },
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return new Response(
        JSON.stringify({ error: "Gemini API lỗi", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return new Response(
        JSON.stringify({ error: "Không parse được JSON từ Gemini", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
