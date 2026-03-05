"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Smile, Phone, Video, Search, MessageCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
}

interface Conversation {
    id: string;
    other_user: UserProfile;
    last_message_at: string;
    last_msg?: string;
    unread: number;
}

interface Message {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
}

function MessagesContent() {
    const { profile, user } = useAuth();
    const supabase = createClient();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    useEffect(() => {
        setTargetUserId(searchParams.get('userId'));
    }, [searchParams]);

    const [hasAutoOpened, setHasAutoOpened] = useState(false);
    const [rtStatus, setRtStatus] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'>('CLOSED');

    // --- ULTIMATUM: Decoupled Logic ---
    useEffect(() => {
        const userId = profile?.id || user?.id;
        if (!userId) {
            console.log("[Messages] No user identity yet, waiting...");
            return;
        }

        console.log("[Messages] Identity ready, loading conversations for", userId);
        loadConversations(userId);

        if (targetUserId && !hasAutoOpened) {
            startOrOpenConversation(targetUserId);
            setHasAutoOpened(true);
        }

        // Handle auto-open from query param (Instagram-style flow)
        if (targetUserId && !hasAutoOpened) {
            console.log("[Messages] Auto-opening conversation with", targetUserId);
            startOrOpenConversation(targetUserId);
            setHasAutoOpened(true);
        }

        // Subscribe to ANY message changes involving active conversations
        // This helps update the "last message" preview in the list in real-time
        const listChannel = supabase.channel('realtime-msgs-list')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const newMsg = payload.new as any;
                    setConversations((prev) => {
                        const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
                        if (idx !== -1) {
                            const updated = [...prev];
                            const conv = { ...updated[idx] };
                            conv.last_msg = newMsg.body;
                            conv.last_message_at = newMsg.created_at;
                            updated.splice(idx, 1);
                            return [conv, ...updated];
                        }
                        loadConversations();
                        return prev;
                    });
                }
            )
            .subscribe((status) => {
                console.log("[Messages] List channel status:", status);
                setRtStatus(status);
            });

        return () => {
            supabase.removeChannel(listChannel);
        }
    }, [profile, targetUserId, hasAutoOpened]);

    // Subscribe to real-time new messages for the active conversation
    useEffect(() => {
        if (!activeConv) return;

        const channel = supabase.channel(`room_${activeConv.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // Only add if we didn't just send it locally (optimistic)
                    setMessages((prev) => {
                        // Check if this message already exists (by real ID or optimistic match)
                        const existingIndex = prev.findIndex(m =>
                            m.id === newMsg.id ||
                            (m.id.startsWith('temp-') && m.body === newMsg.body && m.sender_id === newMsg.sender_id)
                        );

                        if (existingIndex !== -1) {
                            // Replace optimistic message with the real one
                            const newMsgs = [...prev];
                            newMsgs[existingIndex] = newMsg;
                            return newMsgs;
                        }

                        return [...prev, newMsg];
                    });
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeConv]);

    const loadConversations = async (explicitUserId?: string) => {
        const userId = explicitUserId || profile?.id || user?.id;
        if (!userId) return;

        // Fetch all conversations where user is a participant
        const { data: convs, error } = await supabase
            .from('conversations')
            .select(`
                id,
                last_message_at,
                participant_one,
                participant_two
            `)
            .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
            .order('last_message_at', { ascending: false });

        if (error || !convs) return;

        // Resolve the "other user" profiles
        const currentId = profile?.id || user?.id;
        const resolvedConvs = await Promise.all(convs.map(async (c) => {
            const otherId = c.participant_one === currentId ? c.participant_two : c.participant_one;
            const { data: userData } = await supabase.from('profiles').select('*').eq('id', otherId).single();

            // Get the last message preview
            const { data: lastMsg } = await supabase.from('messages')
                .select('body')
                .eq('conversation_id', c.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            return {
                id: c.id,
                other_user: userData,
                last_message_at: c.last_message_at,
                last_msg: lastMsg?.body || "Started a conversation",
                unread: 0,
            } as Conversation;
        }));

        setConversations(resolvedConvs);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        const userId = profile?.id || user?.id;
        if (!query.trim() || !userId) {
            setSearchResults([]);
            return;
        }

        // Search profiles by username or display name
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', userId)
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(5);

        if (data) setSearchResults(data);
    };

    const startOrOpenConversation = async (other: UserProfile | string) => {
        const userId = profile?.id || user?.id;
        if (!userId) return;
        setSearchQuery("");
        setSearchResults([]);

        let otherUser: UserProfile;
        if (typeof other === 'string') {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', other).single();
            if (error || !data) {
                console.error("[Messages] Could not find user for auto-open", error);
                return;
            }
            otherUser = data;
        } else {
            otherUser = other;
        }

        let { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant_one.eq.${userId},participant_two.eq.${otherUser.id}),and(participant_one.eq.${otherUser.id},participant_two.eq.${userId})`)
            .maybeSingle();

        let convId = existing?.id;

        if (!convId) {
            const p1 = userId < otherUser.id ? userId : otherUser.id;
            const p2 = userId < otherUser.id ? otherUser.id : userId;

            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({ participant_one: p1, participant_two: p2 })
                .select('id')
                .single();

            if (createError) {
                console.error("[Messages] Failed to create conversation", createError);
                return;
            }
            convId = newConv?.id;
        }

        if (!convId) return;

        const fullConvObj: Conversation = {
            id: convId,
            other_user: otherUser,
            last_message_at: new Date().toISOString(),
            unread: 0
        };

        setActiveConv(fullConvObj);
        loadMessages(convId);
    };

    const openConv = (conv: Conversation) => {
        setActiveConv(conv);
        loadMessages(conv.id);
    };

    const loadMessages = async (convId: string) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (data) setMessages(data);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    const sendMessage = async () => {
        const userId = profile?.id || user?.id;
        if (!input.trim() || !activeConv || !userId) return;

        const body = input.trim();
        setInput("");

        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: tempId,
            conversation_id: activeConv.id,
            sender_id: userId,
            body,
            created_at: new Date().toISOString()
        } as any]);
        scrollToBottom();

        try {
            const { error } = await supabase.from('messages').insert({
                conversation_id: activeConv.id,
                sender_id: userId,
                body
            });

            if (error) throw error;
        } catch (err) {
            console.error("[Messages] Failed to send message:", err);
        }

        loadConversations(userId);
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <AnimatePresence>
                {activeConv && (
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            position: "fixed", inset: 0, zIndex: 200,
                            background: "var(--bg-primary)",
                            display: "flex", flexDirection: "column",
                        }}
                    >
                        <div style={{
                            background: "rgba(13,13,26,0.96)",
                            backdropFilter: "blur(24px)",
                            borderBottom: "var(--stroke-width) solid var(--border-subtle)",
                            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                            paddingTop: "calc(env(safe-area-inset-top) + 12px)",
                        }}>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setActiveConv(null)}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }}>
                                <ArrowLeft size={22} />
                            </motion.button>
                            <Image src={activeConv.other_user.avatar_url || "https://api.dicebear.com/7.x/adventurer/svg?seed=fallback"} alt="Avatar" width={40} height={40}
                                style={{ borderRadius: "var(--radius-full)", border: "2px solid var(--border-medium)" }} unoptimized />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <p style={{ fontSize: "0.92rem", fontWeight: 800 }}>{activeConv.other_user.display_name}</p>
                                    {activeConv.other_user.is_verified && <div className="verified-badge" style={{ transform: "scale(0.8)" }}>✓</div>}
                                </div>
                                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{activeConv.other_user.username}</p>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                {[Phone, Video].map((Icon, i) => (
                                    <motion.button key={i} whileTap={{ scale: 0.85 }}
                                        style={{ background: "var(--bg-elevated)", border: "var(--stroke-width) solid var(--border-medium)", borderRadius: "var(--radius-md)", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 var(--border-medium)" }}>
                                        <Icon size={16} style={{ color: "var(--text-secondary)" }} />
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                            {messages.length === 0 && (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5, gap: 10 }}>
                                    <MessageCircle size={40} />
                                    <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>Say hi to {activeConv.other_user.display_name}!</p>
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const fromMe = msg.sender_id === profile?.id;
                                return (
                                    <motion.div key={msg.id}
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        style={{ display: "flex", justifyContent: fromMe ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}
                                    >
                                        {!fromMe && (
                                            <Image src={activeConv.other_user.avatar_url} alt="" width={28} height={28}
                                                style={{ borderRadius: "var(--radius-full)", flexShrink: 0 }} unoptimized />
                                        )}
                                        <div>
                                            <div style={{
                                                padding: "9px 14px",
                                                borderRadius: fromMe ? "var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl)" : "var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)",
                                                background: fromMe ? "var(--gradient-main)" : "var(--bg-elevated)",
                                                border: fromMe ? "none" : "var(--stroke-width) solid var(--border-medium)",
                                                boxShadow: fromMe ? "3px 3px 0 rgba(100,0,150,0.4)" : "2px 2px 0 var(--border-subtle)",
                                                maxWidth: 240,
                                            }}>
                                                <p style={{ fontSize: "0.88rem", color: fromMe ? "white" : "var(--text-primary)", lineHeight: 1.4, wordBreak: "break-word" }}>{msg.body}</p>
                                            </div>
                                            <p style={{ fontSize: "0.66rem", color: "var(--text-muted)", marginTop: 3, textAlign: fromMe ? "right" : "left", paddingInline: 4 }}>{formatTime(msg.created_at)}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={{ padding: "10px 14px 20px", borderTop: "var(--stroke-width) solid var(--border-subtle)", display: "flex", gap: 10, alignItems: "center", background: "var(--bg-primary)" }}>
                            <motion.button whileTap={{ scale: 0.85 }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-yellow)", flexShrink: 0 }}>
                                <Smile size={22} />
                            </motion.button>
                            <input className="input-base" value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Message..."
                                style={{ flex: 1, padding: "10px 14px", fontSize: "0.88rem" }} />
                            <motion.button whileTap={{ scale: 0.8 }} onClick={sendMessage}
                                disabled={!input.trim()}
                                style={{
                                    background: input.trim() ? "var(--gradient-main)" : "var(--bg-elevated)",
                                    border: "var(--stroke-width) solid var(--border-medium)",
                                    borderRadius: "var(--radius-md)", width: 40, height: 40,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: input.trim() ? "pointer" : "default",
                                    flexShrink: 0,
                                    boxShadow: input.trim() ? "3px 3px 0 rgba(100,0,150,0.4)" : "none",
                                }}>
                                <Send size={17} color={input.trim() ? "white" : "var(--text-muted)"} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Main Messages List Page */}
            <div style={{ position: "relative" }}>
                <TopBar title="Messages" />
                <div style={{
                    position: "absolute", right: 60, top: "calc(env(safe-area-inset-top) + 14px)",
                    display: "flex", alignItems: "center", gap: 6, zIndex: 100
                }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: rtStatus === 'SUBSCRIBED' ? "var(--accent-green, #10b981)" : "var(--accent-red, #ef4444)",
                        boxShadow: rtStatus === 'SUBSCRIBED' ? "0 0 8px var(--accent-green)" : "none"
                    }} />
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        {rtStatus === 'SUBSCRIBED' ? "LIVE" : "RECONNECTING"}
                    </span>
                </div>
            </div>
            <main className="page-content">
                <div style={{ padding: "12px 16px 0", position: "relative" }}>
                    <div style={{ position: "relative" }}>
                        <Search size={16} style={{ position: "absolute", left: 14, top: 12, color: "var(--text-muted)" }} />
                        <input className="input-base"
                            placeholder="Search users to chat..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px 10px 38px", fontSize: "0.88rem" }} />
                    </div>

                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{
                                    position: "absolute", top: "100%", left: 16, right: 16,
                                    background: "var(--bg-elevated)", border: "var(--stroke-width) solid var(--border-medium)",
                                    borderRadius: "var(--radius-md)", marginTop: 4, zIndex: 100,
                                    boxShadow: "var(--shadow-card)", overflow: "hidden"
                                }}>
                                {searchResults.map(user => (
                                    <div key={user.id} onClick={() => startOrOpenConversation(user)}
                                        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <Image src={user.avatar_url} alt="" width={32} height={32} style={{ borderRadius: "var(--radius-full)" }} unoptimized />
                                        <div>
                                            <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>{user.display_name}</p>
                                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>@{user.username}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div style={{ marginTop: 24 }}>
                    <div style={{ padding: "4px 16px 8px" }}>
                        <p style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.5px" }}>YOUR CONVERSATIONS</p>
                    </div>

                    {conversations.length === 0 ? (
                        <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                            <MessageCircle size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>No conversations yet.</p>
                            <p style={{ fontSize: "0.75rem" }}>Search for a user above to start chatting!</p>
                        </div>
                    ) : (
                        conversations.map((conv, i) => (
                            <motion.div key={conv.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openConv(conv)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: "12px 16px",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    cursor: "pointer",
                                    background: conv.unread > 0 ? "rgba(180,77,255,0.04)" : "transparent",
                                    transition: "background 0.15s",
                                }}
                            >
                                <div style={{ position: "relative" }}>
                                    <Image src={conv.other_user.avatar_url} alt={conv.other_user.username} width={50} height={50}
                                        style={{ borderRadius: "var(--radius-full)", border: "var(--stroke-width) solid var(--border-medium)", objectFit: 'cover' }} unoptimized />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                        <p style={{ fontSize: "0.9rem", fontWeight: conv.unread > 0 ? 800 : 600, color: "var(--text-primary)" }}>{conv.other_user.display_name}</p>
                                        <span style={{ fontSize: "0.72rem", color: conv.unread > 0 ? "var(--accent-purple)" : "var(--text-muted)" }}>
                                            {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: "0.8rem", color: conv.unread > 0 ? "var(--text-secondary)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                                        {conv.last_msg}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>
        </>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "var(--bg-primary)" }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
