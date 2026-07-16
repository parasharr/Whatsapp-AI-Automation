import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from "@whiskeysockets/baileys";

import { Boom } from "@hapi/boom";
import { registerEvents } from "./events.js";
import fs from "fs";
import path from "path";

export async function startWhatsApp() {
  const authFolder = "auth";
  const credsFilePath = path.join(authFolder, "creds.json");

  // Clean up any stale unregistered credentials before starting
  if (fs.existsSync(credsFilePath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsFilePath, "utf-8"));
      if (!creds.registered) {
        console.log("Empty or unregistered session found. Clearing auth folder for a clean pairing request...");
        fs.rmSync(authFolder, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Failed to read/clear auth credentials:", e);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: false,
  });

  let pairingCodeRequested = false;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === "open") {
      console.log("✓ WhatsApp Connected");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0) !== DisconnectReason.loggedOut;

      console.log("⚠️ Connection Closed");

      if (shouldReconnect) {
        startWhatsApp();
      }
    }

    // Generate pairing code when the socket emits a QR code (meaning it is ready to be linked)
    if (qr && !sock.authState.creds.registered && !pairingCodeRequested) {
      const phoneNumber = process.env.PHONE_NUMBER;

      if (!phoneNumber) {
        console.log("PHONE_NUMBER missing in .env");
        return;
      }

      pairingCodeRequested = true;

      // Add a slight delay to allow socket initialization
      setTimeout(async () => {
        try {
          console.log(`Sending pairing code request to WhatsApp for: ${phoneNumber}...`);
          const code = await sock.requestPairingCode(phoneNumber);

          console.log("\n==============================");
          console.log("PAIRING CODE:", code);
          console.log("==============================\n");
        } catch (err) {
          console.error("❌ Failed to request pairing code:", err.message || err);
          pairingCodeRequested = false;
        }
      }, 1500);
    }
  });

  registerEvents(sock);

  return sock;
}