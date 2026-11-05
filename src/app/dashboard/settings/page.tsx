'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { store, SystemConfig, INITIAL_HOTELS } from '@/lib/storage';
import { sound } from '@/lib/sound';
import {
  Settings,
  Wifi,
  Server,
  Building,
  Save,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>(store.getConfig());
  const [saved, setSaved] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState('h-1');

  useEffect(() => {
    setConfig(store.getConfig());
    setSelectedHotel(store.getCurrentHotelId());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playDoorUnlock();
    store.updateConfig(config);
    store.setCurrentHotel(selectedHotel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
            WiFi & Cloud Broker Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global wireless network credentials, MQTT endpoints for ESP32 nodes, and property profiles.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Settings Saved & Broadcasted to ESP32 Mesh!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Multi-Hotel Selection */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <Building className="w-5 h-5 text-zeno-teal" />
            <h3 className="font-heading font-black text-base text-slate-900 dark:text-white">
              Multi-Hotel Property Selection
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {INITIAL_HOTELS.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => setSelectedHotel(hotel.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedHotel === hotel.id
                    ? 'border-zeno-teal bg-teal-50/30 dark:bg-teal-950/20 ring-2 ring-zeno-teal/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zeno-teal">{hotel.code}</span>
                  {selectedHotel === hotel.id && (
                    <span className="w-2 h-2 rounded-full bg-zeno-teal" />
                  )}
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                  {hotel.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{hotel.location}</div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">{hotel.totalRooms} Rooms</div>
              </div>
            ))}
          </div>
        </div>

        {/* WiFi IoT Network Settings */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <Wifi className="w-5 h-5 text-zeno-teal" />
            <h3 className="font-heading font-black text-base text-slate-900 dark:text-white">
              ESP32 Wireless Access Point (WiFi 2.4 GHz)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                WiFi SSID (Network Name) *
              </label>
              <input
                type="text"
                required
                value={config.wifiSsid}
                onChange={(e) => setConfig({ ...config, wifiSsid: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                SSID provisioned to door controller ESP32 modules
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                WPA2/WPA3 Pre-Shared Key *
              </label>
              <input
                type="password"
                required
                value={config.wifiPass}
                onChange={(e) => setConfig({ ...config, wifiPass: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                AES-256 encrypted security key
              </span>
            </div>
          </div>
        </div>

        {/* MQTT & Cloud Telemetry Settings */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <Server className="w-5 h-5 text-amber-500" />
            <h3 className="font-heading font-black text-base text-slate-900 dark:text-white">
              Cloud MQTT Telemetry Endpoint
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                MQTT Host / Broker URL *
              </label>
              <input
                type="text"
                required
                value={config.mqttBroker}
                onChange={(e) => setConfig({ ...config, mqttBroker: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Public broker or AWS IoT Core custom endpoint (e.g. a2b0...iot.eu-central-1.amazonaws.com)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                MQTT Port
              </label>
              <input
                type="number"
                value={config.mqttPort}
                onChange={(e) => setConfig({ ...config, mqttPort: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                Door Relay Hold Window (Seconds)
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={config.relayHoldSeconds}
                onChange={(e) => setConfig({ ...config, relayHoldSeconds: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                How long 12V strike lock remains energized after valid card tap (Default: 4s)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                Offline Local Fallback Cache
              </label>
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.offlineSyncEnabled}
                    onChange={(e) => setConfig({ ...config, offlineSyncEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-zeno-teal focus:ring-zeno-teal"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Store authorized card UIDs in ESP32 Flash SPIFFS (Permits unlock during internet outages)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider text-slate-950 bg-zeno-teal hover:bg-teal-400 shadow-glow transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
