"use client";

type HelpOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/80 border border-white/20 p-6 rounded-xl max-w-lg w-full text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">Dashboard Help</h2>

        <p className="opacity-90 leading-relaxed mb-6">
          The dashboard gives you a quick overview of all your vessels and their current status. 
          Tap a vessel to open its details or check activity. Use the + button to add new vessels 
          up to your personal limit, and switch to selection mode when you want to manage several 
          at once. Status colors make it easy to see which vessels are active, secondary, or idle 
          at a glance.
        </p>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
