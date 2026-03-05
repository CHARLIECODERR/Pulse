"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Smile, Phone, Video, Search, MessageCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase/client";
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, doc, setDoc, addDoc, limit } from "firebase/firestore";

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

    useEffect(() => {
        const userId = profile?.id || user?.uid;
        if (!userId) {
            console.log("[Messages] No user identity yet, waiting...");
            return;
        }

        if (targetUserId && !hasAutoOpened) {
            console.log("[Messages] Auto-opening conversation with", targetUserId);
            startOrOpenConversation(targetUserId);
            setHasAutoOpened(true);
        }

        // Subscribe to conversations where this user is a participant
        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', userId),
            orderBy('last_message_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const profilesMap = new Map<string, any>();

            const resolvedConvs = await Promise.all(snapshot.docs.map(async (d) => {
                const data = d.data();
                // participants is an array of [userA, userB]
                const otherId = data.participants.find((p: string) => p !== userId) || userId;

                let userData = profilesMap.get(otherId);
                if (!userData) {
                    const userSnap = await getDoc(doc(db, 'profiles', otherId));
                    if (userSnap.exists()) {
                        const ud = userSnap.data();
                        userData = {
                            id: otherId,
                            username: ud.username,
                            display_name: ud.displayName || ud.username,
                            avatar_url: ud.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=" + otherId,
                            is_verified: ud.isVerified || false
                        };
                        profilesMap.set(otherId, userData);
                    } else {
                        userData = {
                            id: otherId,
                            username: "unknown",
                            display_name: "Unknown User",
                            avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=" + otherId,
                            is_verified: false
                        };
                    }
                }

                return {
                    id: d.id,
                    other_user: userData,
                    last_message_at: data.last_message_at,
                    last_msg: data.last_msg || "Started a conversation",
                    unread: 0,
                } as Conversation;
            }));

            setConversations(resolvedConvs);
            setRtStatus('SUBSCRIBED');
        }, (err) => {
            console.error('[Messages] Conversations list error:', err);
            setRtStatus('CHANNEL_ERROR');
        });

        return () => {
            unsubscribe();
        }
    }, [profile, user, targetUserId, hasAutoOpened]);

    // Subscribe to real-time new messages for the active conversation
    useEffect(() => {
        if (!activeConv) return;

        const q = query(
            collection(db, 'messages'),
            where('conversation_id', '==', activeConv.id),
            orderBy('created_at', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as Message));

            setMessages(msgs);
            scrollToBottom();
        });

        return () => {
            unsubscribe();
        };
    }, [activeConv]);

    const handleSearch = async (queryText: string) => {
        setSearchQuery(queryText);
        const userId = profile?.id || user?.uid;
        if (!queryText.trim() || !userId) {
            setSearchResults([]);
            return;
        }

        const lowerQ = queryText.toLowerCase();
        const q = query(
            collection(db, 'profiles'),
            orderBy('username'),
            where('username', '>=', lowerQ),
            where('username', '<=', lowerQ + '\uf8ff'),
            limit(5)
        );

        const filterSnap = await getDocs(q);
        const results = filterSnap.docs
            .filter(d => d.id !== userId)
            .map(d => {
                const ud = d.data();
                return {
                    id: d.id,
                    username: ud.username,
                    display_name: ud.displayName || ud.username,
                    avatar_url: ud.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=" + d.id,
                    is_verified: ud.isVerified || false
                };
            });

        setSearchResults(results);
    };

    const startOrOpenConversation = async (other: UserProfile | string) => {
        const userId = profile?.id || user?.uid;
        if (!userId) return;
        setSearchQuery("");
        setSearchResults([]);

        let otherUser: UserProfile;
        if (typeof other === 'string') {
            const snap = await getDoc(doc(db, 'profiles', other));
            if (!snap.exists()) {
                console.error("[Messages] Could not find user for auto-open");
                return;
            }
            const ud = snap.data();
            otherUser = {
                id: snap.id,
                username: ud.username,
                display_name: ud.displayName || ud.username,
                avatar_url: ud.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=" + snap.id,
                is_verified: ud.isVerified || false
            };
        } else {
            otherUser = other;
        }

        const convId = userId < otherUser.id ? `${userId}_${otherUser.id}` : `${otherUser.id}_${userId}`;
        const convRef = doc(db, 'conversations', convId);
        const convSnap = await getDoc(convRef);

        if (!convSnap.exists()) {
            await setDoc(convRef, {
                participants: [userId, otherUser.id],
                last_message_at: new Date().toISOString(),
                last_msg: ""
            });
        }

        const fullConvObj: Conversation = {
            id: convId,
            other_user: otherUser,
            last_message_at: new Date().toISOString(),
            unread: 0
        };

        setActiveConv(fullConvObj);
    };

    const openConv = (conv: Conversation) => {
        setActiveConv(conv);
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    const sendMessage = async () => {
        const userId = profile?.id || user?.uid;
        if (!input.trim() || !activeConv || !userId) return;

        const body = input.trim();
        setInput("");

        const now = new Date().toISOString();

        // Optimistic addition
        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: tempId,
            conversation_id: activeConv.id,
            sender_id: userId,
            body,
            created_at: now
        }]);
        scrollToBottom();

        try {
            await addDoc(collection(db, 'messages'), {
                conversation_id: activeConv.id,
                sender_id: userId,
                body,
                created_at: now
            });

            // Update conversation last metadata
            await setDoc(doc(db, 'conversations', activeConv.id), {
                last_message_at: now,
                last_msg: body
            }, { merge: true });

        } catch (err) {
            console.error("[Messages] Failed to send message:", err);
        }
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '';
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
                                const fromMe = msg.sender_id === (profile?.id || user?.uid);
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
