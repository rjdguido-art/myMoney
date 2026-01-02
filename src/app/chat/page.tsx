import ChatPanel from "@/components/ai/ChatPanel";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 animate-[fadeInChat_320ms_ease-out]">
      <ChatPanel storageKey="mymoney-chat-v1" />
    </div>
  );
}
