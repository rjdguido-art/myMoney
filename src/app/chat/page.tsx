import ChatPanel from "@/components/ai/ChatPanel";

export default function ChatPage() {
  return (
    <div className="h-screen w-screen animate-[fadeInChat_320ms_ease-out]">
      <ChatPanel storageKey="mymoney-chat-v1" />
    </div>
  );
}
