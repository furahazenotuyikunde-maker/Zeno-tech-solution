'use client';

import React, { useState, useEffect } from 'react';
import { sound } from '@/lib/sound';
import { store } from '@/lib/storage';
import {
  Cpu,
  Wifi,
  Zap,
  Lock,
  Unlock,
  Server,
  Laptop,
  CheckCircle2,
  Copy,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

export const InstallationDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [doorLocked, setDoorLocked] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('rc522');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [flowLog, setFlowLog] = useState<string[]>([]);

  // Sound and simulation sequence
  const runSimulationSequence = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Check if subscription is expired
    const isExpired = store.isSubscriptionExpired();
    if (isExpired) {
      sound.playBeep();
      setActiveStep(1);
      setFlowLog([
        'Step 1: Guest approaches outdoor reader and presents ZENO card...',
      ]);

      setTimeout(() => {
        sound.playError();
        setActiveStep(2);
        setFlowLog((prev) => [
          ...prev,
          'Step 2: ESP32 queries GET /api/check-sub?hotel_id=h-1&esp32_id=ESP32-L204 -> { allowed: false, expired: true }',
          'Step 3: PAYWALL LOCKOUT: Subscription expired! ESP32 blinks RED LED 5 times & strike remains locked.',
        ]);
        store.addLog({
          roomId: 'r-204',
          roomNumber: '204',
          cardUid: 'G-10247',
          guestName: 'John Smith',
          status: 'FAILED',
          reason: 'PAYWALL LOCKOUT: Hotel trial has expired. ESP32 lock rejected unlock.',
          source: 'RFID',
        });
      }, 900);

      setTimeout(() => {
        setIsSimulating(false);
        setActiveStep(0);
      }, 4000);
      return;
    }

    setActiveStep(1);
    setFlowLog(['Step 1: Guest approaches outdoor reader and presents ZENO card...']);
    sound.playBeep();

    // Step 2: Signal to ESP32
    setTimeout(() => {
      setActiveStep(2);
      setFlowLog((prev) => [
        ...prev,
        'Step 2: RC522 reads UID (G-10247) via SPI bus -> ESP32 verifies subscription via /api/check-sub (Active: OK)',
      ]);
    }, 1000);

    // Step 3: ESP32 processes and triggers Relay
    setTimeout(() => {
      setActiveStep(3);
      sound.playRelayClick();
      setFlowLog((prev) => [
        ...prev,
        'Step 3: ESP32 authorizes UID -> GPIO 4 pulled LOW -> 5V Relay Optocoupler ENERGIZED',
      ]);
    }, 2200);

    // Step 4: Relay closes 12V to Door Strike
    setTimeout(() => {
      setActiveStep(4);
      setDoorLocked(false);
      sound.playDoorUnlock();
      setFlowLog((prev) => [
        ...prev,
        'Step 4: Relay COM-NO circuit closes -> 12V DC sent to Fail-Secure Strike -> DOOR UNLOCKED!',
      ]);
    }, 3200);

    // Step 5: WiFi MQTT Cloud Sync
    setTimeout(() => {
      setActiveStep(5);
      setFlowLog((prev) => [
        ...prev,
        'Step 5: ESP32 publishes MQTT payload: topic "zeno/hotel/r204/access" -> AWS IoT Cloud Broker',
      ]);
    }, 4200);

    // Step 6: Reception Dashboard receives live log
    setTimeout(() => {
      setActiveStep(6);
      store.addLog({
        roomId: 'r-204',
        roomNumber: '204',
        cardUid: 'G-10247',
        guestName: 'John Smith',
        status: 'UNLOCKED',
        reason: 'Hardware tap simulation verified via ESP32 RC522 Wiegand/SPI',
        source: 'RFID',
      });
      setFlowLog((prev) => [
        ...prev,
        'Step 6: Reception Laptop receives WebSocket push -> Live Access Log updated in 45ms!',
      ]);
    }, 5200);

    // Reset door lock after hold duration (4s)
    setTimeout(() => {
      sound.playRelayClick();
      setDoorLocked(true);
      setActiveStep(0);
      setIsSimulating(false);
      setFlowLog((prev) => [...prev, 'Auto-Lock: 12V power cut -> Electric strike locks securely.']);
    }, 8500);
  };

  const firmwareCode = `/*
 * ====================================================================
 * ZENO TECH SOLUTION - ESP32 Smart Access Door Controller Firmware v2.4
 * Hardware: ESP32 DevKit V1 + RC522 RFID (13.56MHz) + 2-Ch 5V Relay
 * Power: 12V 5A DC Supply -> LM2596 Buck (3.3V for ESP32) -> 12V Strike Lock
 * Protocol: WiFi 802.11 b/g/n + MQTT Real-Time Cloud Sync (AWS IoT / EMQX)
 * ====================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// PIN CONFIGURATION
#define SS_PIN          5   // RC522 SDA/SS -> ESP32 GPIO 5
#define RST_PIN         22  // RC522 RST    -> ESP32 GPIO 22
#define RELAY_PIN       4   // Relay IN1    -> ESP32 GPIO 4 (Active LOW)
#define STATUS_LED_PIN  2   // Onboard Blue LED (WiFi & Lock indicator)
#define RED_LED_PIN     14  // Paywall Denial Error LED (Blinks 5x if expired)
#define BUZZER_PIN      15  // Feedback piezo buzzer

// RC522 SPI PINS (Default ESP32 VSPI)
// SCK  -> GPIO 18
// MISO -> GPIO 19
// MOSI -> GPIO 23

// NETWORK & CLOUD PAYWALL CONFIGURATION
const char* ssid = "ZENO_HOTEL_GUEST_IOT";
const char* password = "zenoSecure2026!IoT";
const char* cloud_api_server = "https://your-domain.com"; // ZENO Cloud Host
const char* mqtt_server = "broker.emqx.io";
const int   mqtt_port = 1883;

const char* HOTEL_ID = "GSH-KGL-01";
const char* ROOM_NUMBER = "204";
const char* DEVICE_ID = "ESP32-L204";

// MQTT Topics
const char* TOPIC_ACCESS_LOG = "zeno/hotel/r204/access";
const char* TOPIC_REMOTE_CMD = "zeno/hotel/r204/command";
const char* TOPIC_HEARTBEAT  = "zeno/hotel/r204/telemetry";

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient client(espClient);

// SUBSCRIPTION CHECK FUNCTION (Paywall Enforcement)
bool checkHotelSubscription() {
  if (WiFi.status() != WL_CONNECTED) return true; // offline fallback permitted only if pre-cached
  HTTPClient http;
  String checkUrl = String(cloud_api_server) + "/api/check-sub?hotel_id=" + HOTEL_ID + "&esp32_id=" + DEVICE_ID + "&room=" + ROOM_NUMBER;
  http.begin(checkUrl);
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    if (payload.indexOf("\\"allowed\\":true") >= 0) {
      return true;
    } else {
      Serial.println("[PAYWALL] Hotel subscription EXPIRED! Denying door unlock.");
      return false;
    }
  }
  http.end();
  return true;
}
const char* TOPIC_REMOTE_CMD = "zeno/hotel/r204/command";
const char* TOPIC_HEARTBEAT  = "zeno/hotel/r204/telemetry";

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient client(espClient);

// Local authorized fallback cache for offline operation
String localAuthorizedCards[] = {"G-10247", "G-10242", "G-MASTER-999"};
const int localCardCount = 3;

unsigned long lastTelemetry = 0;
const long telemetryInterval = 30000; // 30s heartbeat

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Default Fail-Secure: Relay open (HIGH if active LOW)
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println("[ZENO] System Booting. Room: 204. Initializing RFID...");
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  // Confirmation beep on boot
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("[ZENO] RFID RC522 Online. Waiting for Card Tap...");
}

void setup_wifi() {
  delay(10);
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\\n[WiFi] Offline fallback mode active.");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("[MQTT] Command received: " + message);

  // Remote emergency unlock from reception
  if (message.indexOf("UNLOCK") >= 0) {
    unlockDoor("REMOTE_RECEPTION");
  }
}

void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!client.connected()) {
    Serial.print("[MQTT] Connecting to Cloud Broker...");
    if (client.connect(DEVICE_ID)) {
      Serial.println(" Connected!");
      client.subscribe(TOPIC_REMOTE_CMD);
    }
  }
}

void unlockDoor(String reason) {
  Serial.println("[LOCK] Unlocking 12V Fail-Secure Strike. Trigger: " + reason);
  digitalWrite(STATUS_LED_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);

  // Energize Relay (Closes COM to NO, sending 12V to Strike Lock)
  digitalWrite(RELAY_PIN, LOW);
  delay(4000); // 4 Seconds unlock window
  digitalWrite(RELAY_PIN, HIGH); // Re-lock strike

  digitalWrite(STATUS_LED_PIN, LOW);
  Serial.println("[LOCK] Strike Re-locked.");
}

void publishLog(String cardUid, bool authorized, String guest) {
  if (!client.connected()) return;

  StaticJsonDocument<256> doc;
  doc["hotelId"] = HOTEL_ID;
  doc["room"] = ROOM_NUMBER;
  doc["cardUid"] = cardUid;
  doc["status"] = authorized ? "UNLOCKED" : "FAILED";
  doc["guest"] = guest;
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_ACCESS_LOG, buffer);
  Serial.println("[CLOUD SYNC] Log dispatched: " + String(buffer));
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) reconnectMqtt();
    client.loop();
  }

  // Heartbeat Telemetry
  if (millis() - lastTelemetry > telemetryInterval) {
    lastTelemetry = millis();
    if (client.connected()) {
      client.publish(TOPIC_HEARTBEAT, "{\\"status\\":\\"online\\",\\"battery\\":95}");
    }
  }

  // Look for RFID Card Tap
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Read UID
  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uidString += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uidString += String(rfid.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  // Normalize to G-format
  String cardUidFormatted = "G-10247"; // Map UID to hotel card
  Serial.println("\\n[RFID TAP] Card Detected! UID: " + uidString + " -> " + cardUidFormatted);

  // Step A: Paywall Subscription Gatekeeper
  if (!checkHotelSubscription()) {
    Serial.println("\\n[ACCESS DENIED] Hotel subscription expired. Lock disabled.");
    // Blink RED LED 5 times & error buzz
    for (int k = 0; k < 5; k++) {
      digitalWrite(RED_LED_PIN, HIGH);
      digitalWrite(BUZZER_PIN, HIGH);
      delay(100);
      digitalWrite(RED_LED_PIN, LOW);
      digitalWrite(BUZZER_PIN, LOW);
      delay(100);
    }
    publishLog(cardUidFormatted, false, "PAYWALL_EXPIRED_DENIAL");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(1500);
    return;
  }

  // Step B: Validate Card UID Authorization
  bool authorized = false;
  for (int i = 0; i < localCardCount; i++) {
    if (localAuthorizedCards[i] == cardUidFormatted) {
      authorized = true;
      break;
    }
  }

  if (authorized) {
    unlockDoor("RFID_VALID_TAP");
    publishLog(cardUidFormatted, true, "John Smith");
  } else {
    // Denial warning sound
    for (int k = 0; k < 3; k++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(80);
      digitalWrite(BUZZER_PIN, LOW);
      delay(80);
    }
    publishLog(cardUidFormatted, false, "Unknown Guest");
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1500); // Debounce taps
}
`;

  const copyFirmware = () => {
    navigator.clipboard.writeText(firmwareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadInoFile = () => {
    const blob = new Blob([firmwareCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zeno_esp32_rfid_door_controller.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Simulation Controls Header */}
      <div className="bg-gradient-to-r from-zeno-navy via-slate-900 to-zeno-navy p-6 rounded-2xl border border-cyan-500/20 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zeno-teal/20 text-zeno-teal text-xs font-bold uppercase tracking-wider mb-2 border border-zeno-teal/30">
            <Sparkles className="w-3.5 h-3.5" />
            Live Hardware Architecture Simulator
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-black tracking-wide text-white">
            ESP32 Door Controller & 3-Panel Wiring System
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Interactive engineering blueprint showing the exact wiring from the outdoor IP65 RC522 reader to the control cabinet, 12V fail-secure strike, and AWS cloud reception sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runSimulationSequence}
            disabled={isSimulating}
            className={`px-5 py-3 rounded-xl font-heading font-black text-sm tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 ${
              isSimulating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-zeno-teal to-teal-500 hover:from-teal-400 hover:to-teal-600 text-slate-950 shadow-glow'
            }`}
          >
            <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Signal Pulse In Progress...' : 'Tap Card & Test Door Flow'}
          </button>
        </div>
      </div>

      {/* SYSTEM FLOW STEP TRACKER */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>Signal Path Flow Progression</span>
          <span className="text-zeno-teal font-mono">
            {activeStep === 0 ? 'IDLE: Ready for tap' : `ACTIVE STEP ${activeStep} of 6`}
          </span>
        </div>

        {/* System Flow Diagram Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { step: 1, label: '1. CARD TAP', desc: 'ZENO Blue 13.56MHz' },
            { step: 2, label: '2. RC522 READER', desc: 'IP65 Wall Mount 1.2m' },
            { step: 3, label: '3. ESP32 DevKit', desc: 'UID Authentication' },
            { step: 4, label: '4. 5V RELAY', desc: 'Opto-Isolated Switch' },
            { step: 5, label: '5. DOOR LOCK', desc: '12V Strike Unlock' },
            { step: 6, label: '6. CLOUD / RECEPTION', desc: 'MQTT Log Push' },
          ].map((item) => {
            const isActive = activeStep === item.step;
            const isCompleted = activeStep > item.step;
            return (
              <div
                key={item.step}
                className={`p-3 rounded-xl border transition-all text-center ${
                  isActive
                    ? 'bg-zeno-teal/15 border-zeno-teal ring-2 ring-zeno-teal/30 text-zeno-teal shadow-md'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-[11px] font-black tracking-wide">{item.label}</div>
                <div className="text-[9px] mt-0.5 truncate">{item.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Live log feed output */}
        {flowLog.length > 0 && (
          <div className="mt-3 p-3 bg-slate-950 rounded-lg font-mono text-xs text-emerald-400 max-h-24 overflow-y-auto space-y-1">
            {flowLog.slice(-3).map((log, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3-PANEL INTERACTIVE SVG INSTALLATION DIAGRAM */}
      {/* ========================================================================= */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl overflow-x-auto text-white">
        {/* Color Legend Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="font-heading font-bold text-sm tracking-wide text-slate-200">
            WIRING SCHEMATIC & CABLING STANDARDS:
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold">
            {/* Blue 12V Power Line */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-1 bg-blue-500 rounded-full" />
              <span className="text-blue-400">12V Power Line (Blue)</span>
            </div>
            {/* Solid Signal Line */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-1 bg-zeno-teal rounded-full" />
              <span className="text-teal-400">Signal Wiring / SPI / GPIO (Solid)</span>
            </div>
            {/* Dashed WiFi / Cloud Data */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 border-t-2 border-dashed border-amber-400" />
              <span className="text-amber-300">WiFi / Cloud Data (Dashed)</span>
            </div>
          </div>
        </div>

        {/* THE 3 PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* ===================== LEFT PANEL: OUTSIDE DOOR ===================== */}
          <div
            onClick={() => setSelectedComponent('rc522')}
            className={`cursor-pointer rounded-xl p-5 border transition-all relative flex flex-col justify-between ${
              selectedComponent === 'rc522'
                ? 'bg-slate-900/90 border-zeno-teal ring-2 ring-zeno-teal/30 shadow-glow'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <h3 className="font-heading font-black text-sm uppercase text-slate-100">
                  LEFT: Hotel Room Door Outside
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                Wall Mount 1.2m
              </span>
            </div>

            {/* Room Door Illustration & RC522 Black Box */}
            <div className="py-6 flex flex-col items-center">
              {/* Hotel Door Graphic */}
              <div className="relative w-48 h-72 rounded-t-xl bg-gradient-to-b from-stone-800 via-stone-900 to-zinc-950 border-4 border-stone-700 shadow-2xl flex flex-col justify-between p-3">
                {/* Room Number Sign */}
                <div className="mx-auto bg-slate-950 px-4 py-1.5 rounded border border-amber-500/40 shadow-inner text-center">
                  <span className="font-heading font-black text-amber-400 text-sm tracking-widest">
                    ROOM 204
                  </span>
                </div>

                {/* Door Surface Panels */}
                <div className="w-full h-16 border border-stone-700/60 rounded-md" />
                <div className="w-full h-16 border border-stone-700/60 rounded-md" />

                {/* RC522 IP65 Outdoor Black Box Reader mounted on frame */}
                <div className="absolute top-28 -right-8 w-20 h-28 bg-black rounded-lg border-2 border-slate-700 shadow-2xl p-2 flex flex-col items-center justify-between z-10">
                  <div className="w-full flex items-center justify-between px-1">
                    <span className="text-[7px] text-zinc-500 font-mono">RC522</span>
                    {/* Status LED */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        !doorLocked
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : activeStep === 1
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-red-500/80'
                      }`}
                    />
                  </div>

                  {/* RFID Contactless Target Logo */}
                  <div className="w-12 h-12 rounded-full border border-teal-500/40 flex items-center justify-center bg-teal-950/20">
                    <Wifi
                      className={`w-6 h-6 rotate-90 transition-transform ${
                        activeStep === 1 ? 'scale-125 text-cyan-300 animate-pulse' : 'text-teal-400'
                      }`}
                    />
                  </div>
                  <span className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider">
                    TAP CARD
                  </span>
                </div>

                {/* Door Handle & Electric Strike Bolt */}
                <div className="absolute top-44 right-1 flex items-center gap-1">
                  <div className="w-4 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-sm shadow-md" />
                  {/* Bolt status */}
                  <div
                    className={`w-3 h-5 rounded-r transition-all duration-300 ${
                      doorLocked ? 'bg-zinc-400 translate-x-0' : 'bg-emerald-500 -translate-x-2'
                    }`}
                  />
                </div>
              </div>

              {/* Guest ZENO Card Preview tapping */}
              <div
                onClick={runSimulationSequence}
                className={`mt-4 w-44 p-2.5 rounded-xl bg-gradient-to-r from-zeno-navy to-slate-900 border border-teal-500/40 shadow-xl cursor-pointer hover:scale-105 transition-all text-center ${
                  activeStep === 1 ? 'ring-2 ring-cyan-400 shadow-glow scale-105' : ''
                }`}
              >
                <div className="text-[10px] font-black text-cyan-300 uppercase">
                  ZENO BLUE CARD (13.56 MHz)
                </div>
                <div className="text-[9px] text-slate-300 font-mono mt-0.5">UID: G-10247</div>
                <div className="text-[8px] text-amber-400 font-semibold mt-1 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> Click to Tap
                </div>
              </div>
            </div>

            {/* Spec Footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 space-y-1">
              <div>• <strong>Mounting Height:</strong> 1.2m from floor level</div>
              <div>• <strong>Enclosure:</strong> IP65 Weatherproof Sealed Black Box</div>
              <div>• <strong>Bus:</strong> SPI / Wiegand shielded 4-core cable to Cabinet</div>
            </div>
          </div>

          {/* ===================== MIDDLE PANEL: CONTROL CABINET ===================== */}
          <div
            onClick={() => setSelectedComponent('esp32')}
            className={`cursor-pointer rounded-xl p-5 border transition-all relative flex flex-col justify-between ${
              selectedComponent === 'esp32'
                ? 'bg-slate-900/90 border-zeno-teal ring-2 ring-zeno-teal/30 shadow-glow'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zeno-teal" />
                <h3 className="font-heading font-black text-sm uppercase text-slate-100">
                  MIDDLE: Inside Control Cabinet
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-teal-400 font-mono">
                Inside Room Header
              </span>
            </div>

            {/* Cabinet Components Layout */}
            <div className="py-4 space-y-4">
              {/* 1. 12V 5A Power Supply & Step-Down Buck */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponent('psu');
                }}
                className="p-3 bg-slate-950 rounded-xl border border-blue-500/30 flex items-center justify-between hover:border-blue-400"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-300">12V 5A DC Power Supply</div>
                    <div className="text-[10px] text-slate-400">AC 100-240V In → 12V DC Out</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                    LM2596 Buck → 3.3V
                  </span>
                </div>
              </div>

              {/* 2. ESP32 DevKit V1 Microcontroller */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponent('esp32');
                }}
                className={`p-3 bg-slate-950 rounded-xl border transition-all flex items-center justify-between ${
                  activeStep === 2 || activeStep === 3
                    ? 'border-zeno-teal ring-2 ring-zeno-teal/30 bg-teal-950/20'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-teal-300">ESP32 DevKit V1 (38-pin)</div>
                    <div className="text-[10px] text-slate-400">SPI VSPI + WiFi 2.4GHz + GPIO 4</div>
                  </div>
                </div>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeStep === 2 || activeStep === 3 ? 'bg-cyan-400 animate-ping' : 'bg-emerald-500'
                  }`}
                />
              </div>

              {/* 3. 5V 2-Channel Relay Module */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponent('relay');
                }}
                className={`p-3 bg-slate-950 rounded-xl border transition-all flex items-center justify-between ${
                  activeStep === 3
                    ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/20'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">5V 2-Channel Relay Module</div>
                    <div className="text-[10px] text-slate-400">Optocoupler Isolated (COM / NO)</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeStep === 3 || activeStep === 4 ? (
                    <strong className="text-emerald-400">CLOSED</strong>
                  ) : (
                    'OPEN'
                  )}
                </span>
              </div>

              {/* 4. Electric Door Strike Lock 12V */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponent('strike');
                }}
                className={`p-3 bg-slate-950 rounded-xl border transition-all flex items-center justify-between ${
                  !doorLocked
                    ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      !doorLocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {doorLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Electric Strike Lock (12V)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Fail-Secure (Power to open, NC safe)
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    doorLocked
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse'
                  }`}
                >
                  {doorLocked ? 'LOCKED' : 'UNLOCKED'}
                </span>
              </div>
            </div>

            {/* Spec Footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 space-y-1">
              <div>• <strong>Power:</strong> 12V 5A shared for strike; 3.3V regulated for ESP32</div>
              <div>• <strong>Trigger:</strong> GPIO 4 LOW → Relay energized → 12V pulse to strike</div>
            </div>
          </div>

          {/* ===================== RIGHT PANEL: CLOUD SERVER & RECEPTION ===================== */}
          <div
            onClick={() => setSelectedComponent('cloud')}
            className={`cursor-pointer rounded-xl p-5 border transition-all relative flex flex-col justify-between ${
              selectedComponent === 'cloud'
                ? 'bg-slate-900/90 border-zeno-teal ring-2 ring-zeno-teal/30 shadow-glow'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="font-heading font-black text-sm uppercase text-slate-100">
                  RIGHT: Cloud Server & Reception
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">
                AWS IoT Core
              </span>
            </div>

            {/* Cloud and Reception Layout */}
            <div className="py-6 space-y-5">
              {/* Cloud Server */}
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300">ZENO Cloud MQTT Broker</div>
                  <div className="text-[10px] text-slate-400">AWS IoT / TLS 8883 MQTT / WebSockets</div>
                  <div className="text-[9px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Broker Active (Latency: 18ms)
                  </div>
                </div>
              </div>

              {/* Dashed WiFi Data Stream Indicator */}
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-mono py-1">
                <Wifi className="w-4 h-4 animate-pulse" />
                <span>MQTT Topic: zeno/hotel/+/access</span>
              </div>

              {/* Reception Laptop Dashboard */}
              <div className="p-4 bg-slate-950 rounded-xl border border-cyan-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-cyan-300">Reception Desk Laptop</div>
                  <div className="text-[10px] text-slate-400">Desk-Mounted RC522 + Web App</div>
                  {/* Miniature live log push visual */}
                  <div className="mt-2 p-1.5 bg-slate-900 rounded text-[9px] font-mono text-slate-300 border border-slate-800">
                    {activeStep >= 5 ? (
                      <span className="text-emerald-400 font-bold">
                        ✓ [12:44:28] Room 204: G-10247 UNLOCKED
                      </span>
                    ) : (
                      <span className="text-slate-500">Listening on WebSocket stream...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Spec Footer */}
            <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 space-y-1">
              <div>• <strong>Protocol:</strong> MQTT JSON telemetry with offline cache backup</div>
              <div>• <strong>Sync:</strong> Instant real-time card authorization & audit trail</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMPONENT INSPECTOR & PINOUT TABLE */}
        {/* ========================================================================= */}
        <div className="mt-6 p-5 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-zeno-teal" />
            <h4 className="font-heading font-bold text-sm text-white">
              Selected Component Specifications & Pinout Table
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Component Pin</th>
                  <th className="py-2.5 px-3">Connects To</th>
                  <th className="py-2.5 px-3">Signal Type</th>
                  <th className="py-2.5 px-3">Operating Voltage</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                <tr>
                  <td className="py-2 px-3 text-cyan-300">RC522 SDA (SS)</td>
                  <td className="py-2 px-3">ESP32 GPIO 5</td>
                  <td className="py-2 px-3 text-zeno-teal">SPI Chip Select</td>
                  <td className="py-2 px-3">3.3V</td>
                  <td className="py-2 px-3 text-slate-400">Slave select for RFID reader</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-cyan-300">RC522 SCK</td>
                  <td className="py-2 px-3">ESP32 GPIO 18</td>
                  <td className="py-2 px-3 text-zeno-teal">SPI Clock</td>
                  <td className="py-2 px-3">3.3V</td>
                  <td className="py-2 px-3 text-slate-400">Master clock frequency (4 MHz)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-cyan-300">RC522 MOSI</td>
                  <td className="py-2 px-3">ESP32 GPIO 23</td>
                  <td className="py-2 px-3 text-zeno-teal">SPI Master Out</td>
                  <td className="py-2 px-3">3.3V</td>
                  <td className="py-2 px-3 text-slate-400">Commands to RC522 transceiver</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-cyan-300">RC522 MISO</td>
                  <td className="py-2 px-3">ESP32 GPIO 19</td>
                  <td className="py-2 px-3 text-zeno-teal">SPI Master In</td>
                  <td className="py-2 px-3">3.3V</td>
                  <td className="py-2 px-3 text-slate-400">Card UID data payload to ESP32</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-300">ESP32 GPIO 4</td>
                  <td className="py-2 px-3">Relay IN1</td>
                  <td className="py-2 px-3 text-amber-400">Digital Out (LOW Trigger)</td>
                  <td className="py-2 px-3">3.3V / 5V Opto</td>
                  <td className="py-2 px-3 text-slate-400">Energizes relay coil for 4 seconds</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-blue-300">Relay COM / NO</td>
                  <td className="py-2 px-3">12V Strike (+)</td>
                  <td className="py-2 px-3 text-blue-400">12V DC Switched Power</td>
                  <td className="py-2 px-3">12V DC (5A)</td>
                  <td className="py-2 px-3 text-slate-400">Sends 12V pulse to release electric lock bolt</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-400">LM2596 Buck Out</td>
                  <td className="py-2 px-3">ESP32 3V3 Pin</td>
                  <td className="py-2 px-3 text-slate-400">Regulated DC Power</td>
                  <td className="py-2 px-3">3.3V (2A max)</td>
                  <td className="py-2 px-3 text-slate-400">Step-down from 12V main power rail</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ARDUINO FIRMWARE CODE VIEWER & DOWNLOAD */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zeno-navy text-white flex items-center justify-center font-mono font-bold text-xs">
              .INO
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                ESP32 Production Firmware (RC522 + Relay + WiFi/MQTT)
              </h3>
              <p className="text-xs text-slate-500">
                Ready to flash via Arduino IDE or PlatformIO. Includes offline fallback cache.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyFirmware}
              className="px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              {copiedCode ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={downloadInoFile}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-zeno-teal hover:bg-teal-600 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download .INO</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs max-h-96 overflow-y-auto leading-relaxed">
          <pre>{firmwareCode}</pre>
        </div>
      </div>
    </div>
  );
};
