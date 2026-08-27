"use client";

type HelpButtonProps = {
  onOpen: () => void;
};

export default function HelpButton({ onOpen }: HelpButtonProps) {
  return (
    <button
      onClick={onOpen}
      className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
    >
      Help
    </button>
  );
}
