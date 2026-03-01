"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatContainer />
    </div>
  );
}
