import { expect } from "@playwright/test";
import { apiAutenticada } from "./helpers";

export const pngTeste = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yTzUAAAAASUVORK5CYII=",
  "base64",
);

export default async function preparar() {
  if (process.env.RUN_E2E !== "true") return;
  const api = await apiAutenticada();
  try {
    const loja = await (await api.get("lojas/minha-loja")).json();
    // A fixture do backend é antiga e não tem banner. O DTO atual exige uma URL.
    // Fazemos o upload pelo provedor mock e persistimos pela API pública normal.
    if (!loja.imagemUrl) {
      const upload = await api.post("uploads/imagem", {
        multipart: {
          pasta: "lojas",
          arquivo: {
            name: "banner-e2e.png",
            mimeType: "image/png",
            buffer: pngTeste,
          },
        },
      });
      expect(upload.status()).toBe(201);
      const { url } = await upload.json();
      const salvo = await api.put(`lojas/${loja.id}`, {
        data: { ...loja, imagemUrl: url },
      });
      expect(salvo.status()).toBe(200);
    }
  } finally {
    await api.dispose();
  }
}
