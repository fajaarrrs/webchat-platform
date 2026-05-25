import { X, Bell, Check } from 'lucide-react';

export default function PushNotificationModal({ isOpen, onClose, onEnable, onDisable, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Bell size={20} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Enable Notifications?</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            Get notified when someone mentions you or sends important updates. You can disable this anytime in Settings.
          </p>

          {/* Benefits List */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-300">Get alerts for mentions (@username)</span>
            </div>
            <div className="flex items-start gap-3">
              <Check size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-300">Notifications work even when tab is closed</span>
            </div>
            <div className="flex items-start gap-3">
              <Check size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-300">Control notifications from Settings</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 bg-slate-800/50 border-t border-slate-700">
          <button
            onClick={onDisable}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-semibold text-sm hover:bg-slate-700/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Not Now
          </button>
          <button
            onClick={onEnable}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}
