import React, { useState } from 'react';
import { Cpu, Zap, Wifi, Smartphone, ArrowRight, Check, X } from 'lucide-react';
import { FIRMWARES } from '../constants';
import { Firmware } from '../types';

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (firmware: Firmware) => void;
}

type DeviceType = 'ESP32' | 'ESP32-S3' | 'ESP32-C3' | 'Flipper Zero';

export const Wizard: React.FC<WizardProps> = ({ isOpen, onClose, onSelect }) => {
  const [step, setStep] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);

  if (!isOpen) return null;

  const handleDeviceSelect = (device: DeviceType) => {
    setSelectedDevice(device);
    setStep(2);
  };

  const compatibleFirmwares = selectedDevice
    ? FIRMWARES.filter(fw => fw.compatibility.includes(selectedDevice))
    : [];

  const handleBack = () => {
    setStep(1);
    setSelectedDevice(null);
  };

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'ESP32': return <Cpu className="w-8 h-8 mb-2 text-blue-400" />;
      case 'ESP32-S3': return <Zap className="w-8 h-8 mb-2 text-yellow-400" />;
      case 'ESP32-C3': return <Wifi className="w-8 h-8 mb-2 text-emerald-400" />;
      case 'Flipper Zero': return <Smartphone className="w-8 h-8 mb-2 text-orange-400" />;
      default: return <Cpu className="w-8 h-8 mb-2" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Setup Wizard</h2>
            <p className="text-slate-400 text-sm">Step {step} of 2: {step === 1 ? 'Select Device' : 'Select Firmware'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['ESP32', 'ESP32-S3', 'ESP32-C3', 'Flipper Zero'] as DeviceType[]).map((device) => (
                <button
                  key={device}
                  onClick={() => handleDeviceSelect(device)}
                  className="flex flex-col items-center justify-center p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all group"
                >
                  <div className="transform group-hover:scale-110 transition-transform duration-200">
                    {getDeviceIcon(device)}
                  </div>
                  <span className="font-medium text-slate-200 group-hover:text-emerald-300">{device}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
               {compatibleFirmwares.length === 0 ? (
                 <div className="text-center py-12 text-slate-500">
                   <p>No specific firmwares found for {selectedDevice}.</p>
                 </div>
               ) : (
                 compatibleFirmwares.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => {
                        onSelect(fw);
                        onClose();
                    }}
                    className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 transition-all group flex items-start gap-4"
                  >
                    <div className="bg-slate-900 p-3 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                        <Check className="w-6 h-6 text-slate-600 group-hover:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-slate-200 group-hover:text-emerald-300">{fw.name}</h3>
                            <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-500 font-mono">{fw.version}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{fw.description}</p>
                        <div className="flex flex-wrap gap-2">
                            {fw.tags.map(tag => (
                                <span key={tag} className="text-[10px] uppercase tracking-wider bg-slate-900/50 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700/50">{tag}</span>
                            ))}
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-white self-center transform group-hover:translate-x-1 transition-all" />
                  </button>
                 ))
               )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-between">
            {step === 2 ? (
                <button 
                    onClick={handleBack}
                    className="text-slate-400 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                    Back to Devices
                </button>
            ) : (
                <div></div>
            )}
            <div className="text-xs text-slate-500 flex items-center">
                Select a configuration to load it into the flasher.
            </div>
        </div>
      </div>
    </div>
  );
};
