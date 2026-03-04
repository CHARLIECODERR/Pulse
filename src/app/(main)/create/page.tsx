"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Type, Tag, CheckCircle2, ArrowLeft, ArrowRight, Upload, X, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

const STEP_LABELS = ["Choose Media", "Write Caption", "Add Tags", "Preview & Post"];

export default function CreatePage() {
    const { profile } = useAuth();
    const supabase = createClient();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [tags, setTags] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [posted, setPosted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const canNext =
        (step === 0 && selectedFile) ||
        (step === 1 && caption.trim()) ||
        step === 2 ||
        step === 3;

    const handlePost = async () => {
        if (!selectedFile || !profile) return;
        setIsPosting(true);

        try {
            // 1. Upload to Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${profile.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(filePath);

            // 2. Insert into Database
            const tagArray = tags.trim() ? tags.trim().split(/\s+/).map(t => t.replace('#', '')) : [];

            const { data: dbData, error: dbError } = await supabase
                .from('posts')
                .insert({
                    author_id: profile.id,
                    image_url: publicUrl,
                    caption,
                    tags: tagArray
                })
                .select();

            if (dbError) {
                console.error('Database insert error:', dbError.message, dbError.details);
                throw dbError;
            }

            console.log('Post inserted successfully:', dbData);

            setPosted(true);
            setTimeout(() => {
                router.push('/feed');
            }, 2000);
        } catch (error) {
            console.error('Error sharing post:', error);
            alert('Failed to share post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    };

    if (posted) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 16 }}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                    <CheckCircle2 size={72} color="var(--accent-purple)" strokeWidth={1.5} />
                </motion.div>
                <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                    Posted! 🎉
                </motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    Taking you to your feed...
                </motion.p>
            </div>
        );
    }

    return (
        <>
            <TopBar title="New Post" />
            <main className="page-content" style={{ padding: "72px 16px 80px" }}>
                {/* Step progress */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                        {STEP_LABELS.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    flex: 1, height: 3, borderRadius: "var(--radius-full)",
                                    background: i <= step ? "var(--accent-purple)" : "var(--bg-elevated)",
                                    transition: "background 0.3s",
                                }}
                            />
                        ))}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
                        Step {step + 1} of {STEP_LABELS.length} — <span style={{ color: "var(--accent-purple)" }}>{STEP_LABELS[step]}</span>
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 0: Choose media */}
                    {step === 0 && (
                        <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 14 }}>Upload a photo or video from your device</p>

                            <input
                                type="file"
                                accept="image/*,video/*"
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            {!previewUrl ? (
                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        height: 300, background: "var(--bg-elevated)",
                                        borderRadius: "var(--radius-xl)", border: "2px dashed var(--border-medium)",
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                        gap: 12, cursor: "pointer", transition: "all 0.2s"
                                    }}
                                >
                                    <div style={{ width: 64, height: 64, borderRadius: "var(--radius-full)", background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Upload size={32} color="var(--accent-purple)" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontWeight: 700, fontSize: '1rem' }}>Click to upload</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, MP4 up to 50MB</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <div style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden", border: "2px solid var(--accent-purple)" }}>
                                    {selectedFile?.type.startsWith('image') ? (
                                        <div style={{ position: "relative", aspectRatio: "1/1" }}>
                                            <Image src={previewUrl} alt="Preview" fill style={{ objectFit: "cover" }} unoptimized />
                                        </div>
                                    ) : (
                                        <video src={previewUrl} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} controls />
                                    )}
                                    <button
                                        onClick={clearFile}
                                        style={{
                                            position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)',
                                            border: 'none', color: 'white', borderRadius: 'var(--radius-full)',
                                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', backdropFilter: 'blur(4px)'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 1: Caption */}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <Type size={18} color="var(--accent-purple)" />
                                <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Write a caption</h2>
                            </div>
                            {previewUrl && (
                                <div style={{ position: "relative", height: 160, borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 16 }}>
                                    {selectedFile?.type.startsWith('image') ? (
                                        <Image src={previewUrl} alt="Preview" fill style={{ objectFit: "cover" }} unoptimized />
                                    ) : (
                                        <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                </div>
                            )}
                            <textarea
                                className="input-base"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="What's on your mind? ✨"
                                rows={4}
                                style={{ width: "100%", padding: "12px 14px", fontSize: "0.9rem", resize: "none" }}
                            />
                            <p style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>{caption.length}/300</p>
                        </motion.div>
                    )}

                    {/* Step 2: Tags */}
                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <Tag size={18} color="var(--accent-purple)" />
                                <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Add hashtags (optional)</h2>
                            </div>
                            <input
                                className="input-base"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="Photography Travel Art (space separated)"
                                style={{ width: "100%", padding: "12px 14px", fontSize: "0.88rem" }}
                            />
                            {tags.trim() && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                                    {tags.trim().split(/\s+/).map((t) => (
                                        <span key={t} className="tag-chip" style={{ color: "var(--accent-purple)", borderColor: "var(--accent-purple)" }}>
                                            #{t.replace('#', '')}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Preview before posting</h2>
                            <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                                {previewUrl && (
                                    <div style={{ position: "relative", aspectRatio: "1/1" }}>
                                        {selectedFile?.type.startsWith('image') ? (
                                            <Image src={previewUrl} alt="Preview" fill style={{ objectFit: "cover" }} unoptimized />
                                        ) : (
                                            <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                                        )}
                                    </div>
                                )}
                                <div style={{ padding: 14 }}>
                                    <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                                        <span style={{ fontWeight: 600 }}>{profile?.username || 'you'} </span>
                                        <span style={{ color: "var(--text-secondary)" }}>{caption}</span>
                                    </p>
                                    {tags.trim() && (
                                        <p style={{ marginTop: 6 }}>
                                            {tags.split(/\s+/).map((t) => (
                                                <span key={t} style={{ color: "var(--accent-purple)", fontSize: "0.82rem", marginRight: 6 }}>#{t.replace('#', '')}</span>
                                            ))}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                    {step > 0 && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setStep((s) => s - 1)}
                            className="btn-ghost"
                            disabled={isPosting}
                            style={{ flex: 1, padding: "13px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "0.9rem" }}
                        >
                            <ArrowLeft size={16} /> Back
                        </motion.button>
                    )}
                    {step < 3 ? (
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setStep((s) => s + 1)}
                            disabled={!canNext || isPosting}
                            className="btn-primary"
                            style={{ flex: 1, padding: "13px 0", fontSize: "0.9rem", opacity: canNext ? 1 : 0.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                            Next <ArrowRight size={16} />
                        </motion.button>
                    ) : (
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={handlePost}
                            disabled={isPosting}
                            className="btn-primary"
                            style={{ flex: 1, padding: "13px 0", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                            {isPosting ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />}
                            {isPosting ? 'Sharing...' : 'Share Post'}
                        </motion.button>
                    )}
                </div>
            </main>
        </>
    );
}
