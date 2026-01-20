import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Conversation {
  user: {
    id: number;
    name: string;
    email: string;
  };
  lastMessage: {
    content: string;
    sentAt: string;
    senderId: number;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  sentAt: string;
}

export default function TutorMessages() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversation?.user.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const res = await fetch(`/api/messages?userId=${selectedConversation.user.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedConversation,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/messages", {
        receiverId: selectedConversation?.user.id,
        content,
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation?.user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const handleSend = () => {
    if (newMessage.trim() && selectedConversation) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-500">Chat with your students</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              {conversationsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {conversations.map((conv) => (
                    <button
                      key={conv.user.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-slate-50 transition-colors",
                        selectedConversation?.user.id === conv.user.id && "bg-blue-50"
                      )}
                      data-testid={`conversation-${conv.user.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 truncate">{conv.user.name}</p>
                            {conv.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate">
                            {conv.lastMessage?.content || "No messages"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">No conversations yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0 flex flex-col h-[500px]">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{selectedConversation.user.name}</p>
                        <p className="text-sm text-slate-500">{selectedConversation.user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "max-w-[70%] p-3 rounded-lg",
                            msg.senderId === user.id
                              ? "ml-auto bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-900"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            msg.senderId === user.id ? "text-blue-200" : "text-slate-500"
                          )}>
                            {new Date(msg.sentAt).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-500 py-8">No messages yet</p>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        data-testid="input-message"
                      />
                      <Button 
                        onClick={handleSend} 
                        disabled={!newMessage.trim() || sendMutation.isPending}
                        data-testid="button-send"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
