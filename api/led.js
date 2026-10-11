
const DEVICES = [
  "lampu",
  "tv",
  "kulkas",
  "mesin_cuci",
  "ac",
  "radio"
];

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
    if (req.method === "GET") {
      const response = await fetch(
        `${url.replace(/\/$/, "")}/get/leds`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error("Gagal membaca status LED");
      }

      const saved = result.result
        ? JSON.parse(result.result)
        : {};

      const devices = Object.fromEntries(
        DEVICES.map((device) => [
          device,
          saved[device] === "ON" ? "ON" : "OFF"
        ])
      );

      return res.status(200).json({ devices });
    }

    if (req.method === "POST") {
      const { device, state } = req.body || {};

      if (!DEVICES.includes(device)) {
        return res.status(400).json({
          error: "Nama perangkat tidak valid",
          allowed_devices: DEVICES
        });
      }

      if (!["ON", "OFF"].includes(state)) {
        return res.status(400).json({
          error: "Status harus ON atau OFF"
        });
      }

      const getResponse = await fetch(
        `${url.replace(/\/$/, "")}/get/leds`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const current = await getResponse.json();

      if (!getResponse.ok || current.error) {
        throw new Error("Gagal membaca status LED");
      }

      const devices = current.result
        ? JSON.parse(current.result)
        : {};

      devices[device] = state;

      const saveResponse = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          "SET",
          "leds",
          JSON.stringify(devices)
        ])
      });

      const saved = await saveResponse.json();

      if (!saveResponse.ok || saved.error) {
        throw new Error("Gagal menyimpan status LED");
      }

      return res.status(200).json({
        message: `${device} berhasil diatur ke ${state}`,
        device,
        state
      });
    }

    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({
      error: "Method tidak diizinkan"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan pada API LED"
    });
  }
}
