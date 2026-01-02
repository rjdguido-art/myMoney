import ChatPanel from "@/components/ai/ChatPanel";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ChatPanel storageKey="mymoney-chat-v1" />
    </div>
  );
}
