export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({
      error: "Konfigurasi Upstash belum tersedia"
    });
  }

  try {
    if (req.method === "POST") {
      const { suhu, kelembapan, jarak } = req.body || {};

      if (
        suhu == null ||
        kelembapan == null ||
        jarak == null ||
        ![suhu, kelembapan, jarak].every(
          (v) => Number.isFinite(Number(v))
        )
      ) {
        return res.status(400).json({
          error: "Data suhu, kelembapan, dan jarak harus berupa angka"
        });
      }

      const data = {
        suhu: Number(suhu),
        kelembapan: Number(kelembapan),
        jarak: Number(jarak),
        updated_at: new Date().toISOString()
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          "SET",
          "sensor",
          JSON.stringify(data)
        ])
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error("Gagal menyimpan data sensor");
      }

      return res.status(200).json({
        message: "Data sensor berhasil disimpan",
        data
      });
    }

    if (req.method === "GET") {
      const response = await fetch(
        `${url.replace(/\/$/, "")}/get/sensor`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error("Gagal membaca data sensor");
      }

      const data = result.result
        ? JSON.parse(result.result)
        : null;

      return res.status(200).json({
        data,
        message: data
          ? "Data sensor tersedia"
          : "ESP32 belum mengirim data sensor"
      });
    }

    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({
      error: "Method tidak diizinkan"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan pada API sensor"
    });
  }
}
